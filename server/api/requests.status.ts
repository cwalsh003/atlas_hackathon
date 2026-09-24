import { execFile } from 'node:child_process'
import type { ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import { pillState, type RequestStatus } from '../../src/status/pillState.ts'
import { createCachedFetcher } from '../cache.ts'

const CACHE_TTL_MS = 5000
const MAX_IDS = 20
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
    .filter((n) => Number.isInteger(n) && n > 0)
  return [...new Set(ids)].slice(0, MAX_IDS)
}

// ponytail: one cache per issue number, never evicted; bounded by the repo's issue count.
function cachedPerId<T>(
  fetch: (n: number) => Promise<T>,
): (n: number) => Promise<T> {
  const caches = new Map<number, () => Promise<T>>()
  return (n) => {
    let cached = caches.get(n)
    if (!cached) {
      cached = createCachedFetcher(() => fetch(n), CACHE_TTL_MS)
      caches.set(n, cached)
    }
    return cached()
  }
}

function send(res: ServerResponse, status: number, body: object) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Builds the `/api/requests/status` handler around an injectable `gh` runner. */
export function createStatusHandler(gh: Gh): Connect.NextHandleFunction {
  const listIssues = createCachedFetcher(
    async () =>
      JSON.parse(
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
      ) as Issue[],
    CACHE_TTL_MS,
  )
  // A missing or unreadable issue caches as null so it is not retried per caller.
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
    const { comments } = JSON.parse(
      await gh(['issue', 'view', String(n), '--json', 'comments']),
    ) as { comments: { body: string }[] }
    return comments.at(-1)?.body
  })

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
      const comment = await latestComment(issue.number).catch(() => undefined)
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
    const ids = parseIds(req.url)
    try {
      const listed = await listIssues()
      const known = new Set(listed.map((issue) => issue.number))
      const extra = await Promise.all(
        ids.filter((n) => !known.has(n)).map(viewIssue),
      )
      const candidates = [
        ...listed.filter((i) => onBoard(i) || ids.includes(i.number)),
        ...extra.filter((i) => i !== null),
      ]
      const requests = (await Promise.all(candidates.map(toStatus))).filter(
        (s) => s !== null,
      )
      const shipped = listed
        .filter((i) => labelsOf(i).includes('shipped'))
        .map((i) => i.number)
      send(res, 200, { requests, shipped })
    } catch (error) {
      send(res, 502, { error: (error as Error).message })
    }
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
