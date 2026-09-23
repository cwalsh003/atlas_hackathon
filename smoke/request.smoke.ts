import { execFile } from 'node:child_process'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { createServer, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const run = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))

async function gh(...args: string[]): Promise<string> {
  const { stdout } = await run('gh', args, { cwd: root })
  return stdout.trim()
}

const newestIssue = () =>
  gh(
    'issue',
    'list',
    '--state',
    'all',
    '--limit',
    '1',
    '--json',
    'number',
    '--jq',
    '.[0].number',
  )

const prompt =
  'Smoke test: say "hi" with `backticks`, run $(id); then a semicolon; and keep going past the title cut'
const markup =
  '<section data-edit-id="kpi-buried" class="kpi-card"><span class="kpi-card__label">Buried</span></section>'
const request = {
  prompt,
  regionId: 'kpi-buried',
  markup,
  requester: 'npm run smoke',
  lane: 'implement',
  scratch: true,
}

let server: ViteDevServer
let base: string
let issue: number | undefined
let closed = false

function post(body: object) {
  return fetch(`${base}/api/requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  process.env.VITE_DEMO_MODE = '1'
  server = await createServer({
    root,
    logLevel: 'warn',
    server: { host: '127.0.0.1', port: 0, hmr: false },
  })
  await server.listen()
  const { port } = server.httpServer!.address() as AddressInfo
  base = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  if (issue && !closed) {
    await gh(
      'issue',
      'close',
      String(issue),
      '--comment',
      'Closed by npm run smoke (cleanup after a failure).',
    )
  }
  await server?.close()
})

describe('request endpoint against the real repo', () => {
  it('rejects a 501-character prompt with 400 and creates no issue', async () => {
    const before = await newestIssue()
    const res = await post({ ...request, prompt: 'a'.repeat(501) })
    expect(res.status).toBe(400)
    expect(await newestIssue()).toBe(before)
  })

  it('creates an issue and returns its number', async () => {
    const res = await post(request)
    const json = (await res.json()) as { number: number; url: string }
    expect(res.status, JSON.stringify(json)).toBe(201)
    expect(json.number).toEqual(expect.any(Number))
    issue = json.number
    console.log(`created issue #${issue} ${json.url}`)
  })

  it('labels the issue needs-triage, lane:implement, and scratch', async () => {
    const { labels } = JSON.parse(
      await gh('issue', 'view', String(issue), '--json', 'labels'),
    )
    const names = labels.map((label: { name: string }) => label.name)
    console.log(`labels on #${issue}: ${names.join(', ')}`)
    expect(names).toEqual(
      expect.arrayContaining(['needs-triage', 'lane:implement', 'scratch']),
    )
  })

  it('titles the issue <region id>: <prompt truncated to 72 characters>', async () => {
    const { title } = JSON.parse(
      await gh('issue', 'view', String(issue), '--json', 'title'),
    )
    console.log(`title of #${issue}: ${title}`)
    expect(title).toBe(`kpi-buried: ${prompt.slice(0, 72)}…`)
  })

  it('has every body section, with the prompt verbatim', async () => {
    const { body } = JSON.parse(
      await gh('issue', 'view', String(issue), '--json', 'body'),
    )
    const sections = [
      `## Prompt\n\n${prompt}\n`,
      '## Region\n\n`kpi-buried`\n',
      '## Source file hint\n\nsrc/dashboard/KpiCards.tsx\n',
      `## Region markup\n\n\`\`\`html\n${markup}\n\`\`\`\n`,
      '## Requester\n\nnpm run smoke\n',
      '## Lane\n\nimplement',
    ]
    let from = 0
    for (const section of sections) {
      const at = body.indexOf(section, from)
      expect(at, `missing or out of order: ${section}`).toBeGreaterThanOrEqual(
        from,
      )
      from = at + section.length
    }
    console.log(
      `body of #${issue} has all 6 sections in order; prompt verbatim`,
    )
  })

  it('closes the issue with a comment', async () => {
    await gh(
      'issue',
      'close',
      String(issue),
      '--comment',
      'Closed by npm run smoke.',
    )
    closed = true
    const { state } = JSON.parse(
      await gh('issue', 'view', String(issue), '--json', 'state'),
    )
    console.log(`closed issue #${issue}: state ${state}`)
    expect(state).toBe('CLOSED')
  })
})
