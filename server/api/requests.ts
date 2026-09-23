import { execFile } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect } from 'vite'
import { buildBody, buildTitle } from '../issueBody.ts'
import {
  clientKey,
  isScratchAllowed,
  validateRequest,
} from '../validateRequest.ts'

const MAX_BODY_BYTES = 1024 * 1024
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const DASHBOARD_DIR = fileURLToPath(
  new URL('../../src/dashboard/', import.meta.url),
)

// ponytail: in-memory, per dev-server process; resets on restart, which is fine for a demo.
const recentRequests = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const hits = (recentRequests.get(key) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  )
  hits.push(now)
  recentRequests.set(key, hits)
  return hits.length > RATE_LIMIT
}

function send(res: ServerResponse, status: number, body: object) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
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

async function sourceFileHint(regionId: string): Promise<string> {
  const files = (await readdir(DASHBOARD_DIR))
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
    .sort()
  for (const file of files) {
    const text = await readFile(path.join(DASHBOARD_DIR, file), 'utf8')
    if (text.includes(`id="${regionId}"`)) return `src/dashboard/${file}`
  }
  return 'unknown'
}

function gh(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('gh', args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(String(stderr).trim() || error.message))
      else resolve(String(stdout))
    })
  })
}

const requests: Connect.NextHandleFunction = async (req, res, next) => {
  // Plain `npm run dev` must not expose issue creation.
  if (process.env.VITE_DEMO_MODE !== '1') return next()
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST')
    return send(res, 405, { error: 'method not allowed' })
  }
  const remoteAddress = req.socket.remoteAddress
  if (rateLimited(clientKey(req.headers, remoteAddress))) {
    return send(res, 429, { error: 'too many requests, try again in a minute' })
  }

  const raw = await readBody(req)
  if (raw === null) {
    res.setHeader('connection', 'close')
    return send(res, 413, { error: 'body must be at most 1 MB' })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return send(res, 400, { error: 'body must be JSON' })
  }
  const result = validateRequest(parsed)
  if (!result.ok) return send(res, 400, { error: result.error })

  const request = result.value
  const scratch =
    request.scratch && isScratchAllowed(req.headers, remoteAddress)
  const body = buildBody({
    ...request,
    sourceFile: await sourceFileHint(request.regionId),
  })
  const dir = await mkdtemp(path.join(os.tmpdir(), 'asd-request-'))
  const bodyFile = path.join(dir, 'body.md')
  try {
    await writeFile(bodyFile, body)
    const stdout = await gh([
      'issue',
      'create',
      '--title',
      buildTitle(request.regionId, request.prompt),
      '--label',
      'needs-triage',
      '--label',
      `lane:${request.lane}`,
      ...(scratch ? ['--label', 'scratch'] : []),
      '--body-file',
      bodyFile,
    ])
    const url = stdout.trim().split('\n').pop() ?? ''
    const match = url.match(/\/issues\/(\d+)$/)
    if (!match) throw new Error(`unexpected gh output: ${stdout}`)
    send(res, 201, { number: Number(match[1]), url })
  } catch (error) {
    send(res, 502, { error: (error as Error).message })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export default requests
