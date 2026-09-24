import { execFile } from 'node:child_process'
import type { ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import { pillState, type RequestStatus } from '../../src/status/pillState.ts'
import { createCachedFetcher } from '../cache.ts'
import { createRateLimiter } from '../rateLimit.ts'
import { clientKey } from '../validateRequest.ts'

const CACHE_TTL_MS = 5000
const MAX_IDS = 20
const MAX_ID = 100_000
const MAX_CACHED_IDS = 500
const FIELDS = 'number,title,labels,assignees,state,url'
const REGION_PREFIX = /^([a-z][a-z0-9-]*):/

type Gh = (args: string[]) => Promise<string>

type Issue = {
  number: number
  title: string
  labels: { name: string }[]
  assignees: unknown[]
  state: 'OPEN' | 'CLOSED'
  url: string
}

const labelsOf = (issue: Issue) => issue.labels.map((l) => l.name)

// Open requests (scratch included, so evidence issues show pills until they
// close) plus shipped ones, minus closed scratch issues.
function onBoard(issue: Issue): boolean {
  const labels = labelsOf(issue)
  return (
    issue.state === 'OPEN' ||
    (labels.includes('shipped') && !labels.includes('scratch'))
  )
}

function parseIds(url: string | undefined): number[] {
  const raw = new URL(url ?? '/', 'http://localhost').searchParams.get('ids')
  const ids = (raw ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0 && n <= MAX_ID)
  return [...new Set(ids)].slice(0, MAX_IDS)
}

/**
 * Per-issue cache for lookups that never reject. An entry is fresh for the
 * ttl after its fetch resolves; `get(n, false)` serves whatever is held, stale
 * or not, without calling gh.
 */
// ponytail: cleared outright past MAX_CACHED_IDS entries; an LRU if that ever churns.
function cachedPerId<T>(fetch: (n: number) => Promise<T>) {
  const cache = new Map<number, { value: Promise<T>; expiresAt: number }>()
  return {
    isFresh: (n: number) => (cache.get(n)?.expiresAt ?? 0) > Date.now(),
    get(n: number, mayFetch = true): Promise<T> | undefined {
      const entry = cache.get(n)
      if (entry && (entry.expiresAt > Date.now() || !mayFetch))
        return entry.value
      if (!mayFetch) return undefined
      if (!entry && cache.size >= MAX_CACHED_IDS) cache.clear()
      const next = { value: fetch(n), expiresAt: Infinity }
      cache.set(n, next)
      void next.value.then(() => {
        next.expiresAt = Date.now() + CACHE_TTL_MS
      })
      return next.value
    },
  }
}

function send(res: ServerResponse, status: number, body: object) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Builds the `/api/requests/status` handler around an injectable `gh` runner. */
export function createStatusHandler(gh: Gh): Connect.NextHandleFunction {
  // A failed list keeps serving the last good one (empty at first) until the
  // ttl lapses, so an outage costs one gh call per 5 s, not one per viewer poll.
  let lastList: Issue[] = []
  const listIssues = createCachedFetcher(async () => {
    try {
      lastList = JSON.parse(
        await gh([
          'issue',
          'list',
          '--state',
          'all',
          '--label',
          'lane:implement',
          '--limit',
          '200',
          '--json',
          FIELDS,
        ]),
      ) as Issue[]
    } catch {
      // Keep lastList.
    }
    return lastList
  }, CACHE_TTL_MS)
  const viewIssue = cachedPerId(async (n) => {
    try {
      return JSON.parse(
        await gh(['issue', 'view', String(n), '--json', FIELDS]),
      ) as Issue
    } catch {
      return null
    }
  })
  const latestComment = cachedPerId(async (n) => {
    try {
      const { comments } = JSON.parse(
        await gh(['issue', 'view', String(n), '--json', 'comments']),
      ) as { comments: { body: string }[] }
      return comments.at(-1)?.body
    } catch {
      return undefined
    }
  })
  // ids= is the only caller-controlled source of gh calls, so only lookups for it are limited.
  const overLimit = createRateLimiter(10, 60_000)

  async function toStatus(issue: Issue): Promise<RequestStatus | null> {
    const regionId = issue.title.match(REGION_PREFIX)?.[1]
    const state = pillState({
      labels: labelsOf(issue),
      assigned: issue.assignees.length > 0,
      state: issue.state,
    })
    if (!regionId || state === 'none') return null
    const status: RequestStatus = {
      number: issue.number,
      regionId,
      state,
      url: issue.url,
      assigned: issue.assignees.length > 0,
    }
    if (state === 'declined') {
      const comment = await latestComment.get(issue.number)
      if (comment) status.comment = comment
    }
    return status
  }

  return async (req, res, next) => {
    // Plain `npm run dev` must not expose the board.
    if (process.env.VITE_DEMO_MODE !== '1') return next()
    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET')
      return send(res, 405, { error: 'method not allowed' })
    }
    const listed = await listIssues()
    const known = new Set(listed.map((issue) => issue.number))
    const ids = parseIds(req.url)
    const wanted = ids.filter((n) => !known.has(n))
    // Only a call that needs gh for its ids counts against the client; over
    // the limit its ids come from cache or not at all, and the board still loads.
    const mayFetch =
      wanted.every(viewIssue.isFresh) ||
      !overLimit(clientKey(req.headers, req.socket.remoteAddress))
    const extra = await Promise.all(
      wanted.map((n) => viewIssue.get(n, mayFetch)),
    )
    const candidates = [
      ...listed.filter((i) => onBoard(i) || ids.includes(i.number)),
      ...extra.filter((i) => i != null),
    ]
    const requests = (await Promise.all(candidates.map(toStatus))).filter(
      (s) => s !== null,
    )
    const shipped = listed
      .filter((i) => labelsOf(i).includes('shipped'))
      .map((i) => i.number)
    send(res, 200, { requests, shipped })
  }
}

function gh(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gh', args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(String(stderr).trim() || error.message))
      else resolve(String(stdout))
    })
  })
}

export default createStatusHandler(gh)
