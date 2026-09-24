import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { Connect } from 'vite'
import { createCachedFetcher } from '../cache.ts'
import { gh, ghWithBody } from '../gh.ts'
import { buildBody, buildTitle } from '../issueBody.ts'
import { sourceFileHint } from '../regionSource.ts'
import { addVote, readVotes, type Votes } from '../voteStore.ts'

const CACHE_TTL_MS = 5000
const MAX_BODY_BYTES = 4096
const VOTES_FILE = fileURLToPath(
  new URL('../../votes.local.json', import.meta.url),
)
const TITLE_REGION = /^([a-z][a-z0-9-]*):/
// #3's body contract, in order; the prompt may span paragraphs.
const REQUEST_BODY =
  /^## Prompt\n\n([\s\S]*)\n\n## Region\n\n`([^`\n]*)`\n\n## Source file hint\n\n.*\n\n## Region markup\n\n(`{3,})html\n([\s\S]*)\n\3\n\n## Requester\n\n(.*)\n\n## Lane\n\n/

type Issue = {
  number: number
  title: string
  body: string
  url: string
  createdAt: string
}

function parseRequestBody(body: string) {
  const match = body.replace(/\r\n/g, '\n').match(REQUEST_BODY)
  return (
    match && {
      prompt: match[1],
      regionId: match[2],
      markup: match[4],
      requester: match[5],
    }
  )
}

function toProposal(issue: Issue, votes: Votes) {
  const request = parseRequestBody(issue.body)
  const voters = votes[issue.number] ?? []
  return {
    number: issue.number,
    regionId: issue.title.match(TITLE_REGION)?.[1] ?? '',
    prompt: request?.prompt ?? issue.title,
    requester: request?.requester ?? '',
    url: issue.url,
    createdAt: issue.createdAt,
    votes: voters.length,
    voters,
  }
}

async function listOpenProposals(): Promise<Issue[]> {
  const issues = JSON.parse(
    await gh([
      'issue',
      'list',
      '--state',
      'open',
      '--label',
      'lane:vote',
      '--limit',
      '200',
      '--json',
      'number,title,body,url,createdAt',
    ]),
  ) as Issue[]
  return issues.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Promotes an open proposal: files the implement-lane request, links it on the
// proposal, closes the proposal. Returns an error for anything not a proposal.
async function promote(
  number: number,
): Promise<{ number: number; url: string } | { error: string }> {
  const issue = JSON.parse(
    await gh([
      'issue',
      'view',
      String(number),
      '--json',
      'title,body,labels,state',
    ]),
  ) as { body: string; labels: { name: string }[]; state: string }
  const labels = issue.labels.map((label) => label.name)
  if (issue.state !== 'OPEN' || !labels.includes('lane:vote')) {
    return { error: `#${number} is not an open proposal` }
  }
  const request = parseRequestBody(issue.body)
  if (!request) return { error: `#${number} is not in the request format` }

  const stdout = await ghWithBody(
    [
      'issue',
      'create',
      '--title',
      buildTitle(request.regionId, request.prompt),
      '--label',
      'needs-triage',
      '--label',
      'lane:implement',
      // Evidence proposals stay out of the loop after promotion too.
      ...(labels.includes('scratch') ? ['--label', 'scratch'] : []),
    ],
    buildBody({
      ...request,
      sourceFile: await sourceFileHint(request.regionId),
      lane: 'implement',
    }),
  )
  const url = stdout.trim().split('\n').pop() ?? ''
  const match = url.match(/\/issues\/(\d+)$/)
  if (!match) throw new Error(`unexpected gh output: ${stdout}`)
  await ghWithBody(
    ['issue', 'comment', String(number)],
    `Promoted to an implement-lane request: ${url}\n`,
  )
  await gh(['issue', 'close', String(number)])
  return { number: Number(match[1]), url }
}

// Resolves null when the body exceeds the cap, without buffering the rest.
function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.from(chunk)
      size += buf.length
      if (size > MAX_BODY_BYTES) {
        req.removeAllListeners('data')
        req.pause()
        resolve(null)
      } else {
        chunks.push(buf)
      }
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res: ServerResponse, status: number, body: object) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Builds the `/api/votes` handler around the votes file it reads and writes. */
export function createVotesHandler(
  votesFile: string,
): Connect.NextHandleFunction {
  let fetchIssues = createCachedFetcher(listOpenProposals, CACHE_TTL_MS)

  async function proposals() {
    const [issues, votes] = await Promise.all([
      fetchIssues(),
      readVotes(votesFile),
    ])
    return issues.map((issue) => toProposal(issue, votes))
  }

  return async (req, res, next) => {
    // Plain `npm run dev` must not expose the vote page's endpoint.
    if (process.env.VITE_DEMO_MODE !== '1') return next()
    try {
      if (req.method === 'GET') {
        return send(res, 200, { proposals: await proposals() })
      }
      if (req.method !== 'POST') {
        res.setHeader('allow', 'GET, POST')
        return send(res, 405, { error: 'method not allowed' })
      }

      const raw = await readBody(req)
      if (raw === null) {
        res.setHeader('connection', 'close')
        return send(res, 413, { error: 'body must be at most 4 KB' })
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        return send(res, 400, { error: 'body must be JSON' })
      }
      const { action, number, voter } = (parsed ?? {}) as Record<
        string,
        unknown
      >
      if (
        typeof number !== 'number' ||
        !Number.isInteger(number) ||
        number < 1
      ) {
        return send(res, 400, { error: 'number must be an issue number' })
      }

      if (action === 'promote') {
        const result = await promote(number)
        if ('error' in result) return send(res, 400, result)
        // Start a fresh cache so the closed proposal leaves the list at once.
        fetchIssues = createCachedFetcher(listOpenProposals, CACHE_TTL_MS)
        return send(res, 201, result)
      }
      if (action !== undefined) {
        return send(res, 400, { error: 'action must be promote' })
      }

      const name = typeof voter === 'string' ? voter.trim() : ''
      if (name.length < 1 || name.length > 60) {
        return send(res, 400, { error: 'voter must be 1-60 characters' })
      }
      // oxlint-disable-next-line no-control-regex
      if (/[\u0000-\u001f\u007f]/.test(name)) {
        return send(res, 400, {
          error: 'voter must not contain control characters',
        })
      }
      const proposal = (await proposals()).find((p) => p.number === number)
      if (!proposal) {
        return send(res, 404, { error: `#${number} is not an open proposal` })
      }
      const voters = await addVote(votesFile, number, name)
      return send(res, 200, { ...proposal, votes: voters.length, voters })
    } catch (error) {
      send(res, 502, { error: (error as Error).message })
    }
  }
}

export default createVotesHandler(VOTES_FILE)
