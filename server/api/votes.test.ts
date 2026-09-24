import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// gh is the external boundary: answer each subcommand from fixtures and
// capture what the endpoint hands it.
const gh = vi.hoisted(() => ({
  calls: [] as { args: string[]; options: object; body?: string }[],
  list: [] as object[],
  view: {} as Record<string, object>,
  fail: false,
}))
vi.mock('node:child_process', () => ({
  execFile: (
    _cmd: string,
    args: string[],
    options: object,
    cb: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    const bodyFile = args.indexOf('--body-file')
    const body =
      bodyFile >= 0 ? readFileSync(args[bodyFile + 1], 'utf8') : undefined
    gh.calls.push({ args, options, body })
    if (gh.fail) return cb(new Error('exit 1'), '', 'HTTP 401: Bad credentials')
    const verb = args[1]
    if (verb === 'list') return cb(null, JSON.stringify(gh.list), '')
    if (verb === 'view') return cb(null, JSON.stringify(gh.view[args[2]]), '')
    if (verb === 'create')
      return cb(
        null,
        'https://github.com/cwalsh003/atlas_hackathon/issues/50\n',
        '',
      )
    cb(null, '', '')
  },
}))

vi.stubEnv('VITE_DEMO_MODE', '1')
const { createVotesHandler } = await import('./votes.ts')

// An issue body exactly as the request modal files it (#3's body contract).
const buriedBody = [
  '## Prompt',
  '',
  'Make the buried count red.',
  '',
  'And bold.',
  '',
  '## Region',
  '',
  '`kpi-buried`',
  '',
  '## Source file hint',
  '',
  'src/dashboard/KpiCards.tsx',
  '',
  '## Region markup',
  '',
  '```html',
  '<section data-edit-id="kpi-buried">3</section>',
  '```',
  '',
  '## Requester',
  '',
  'Colin',
  '',
  '## Lane',
  '',
  'vote',
  '',
].join('\n')

const footerBody = [
  '## Prompt',
  '',
  'Add a phone number',
  '',
  '## Region',
  '',
  '`footer`',
  '',
  '## Source file hint',
  '',
  'src/dashboard/Footer.tsx',
  '',
  '## Region markup',
  '',
  '```html',
  '<footer data-edit-id="footer">ASD</footer>',
  '```',
  '',
  '## Requester',
  '',
  'Dana',
  '',
  '## Lane',
  '',
  'vote',
  '',
].join('\n')

const buried = {
  number: 31,
  title: 'kpi-buried: Make the buried count red. And bold.',
  body: buriedBody,
  url: 'https://github.com/cwalsh003/atlas_hackathon/issues/31',
  createdAt: '2026-09-24T10:00:00Z',
}
const footer = {
  number: 32,
  title: 'footer: Add a phone number',
  body: footerBody,
  url: 'https://github.com/cwalsh003/atlas_hackathon/issues/32',
  createdAt: '2026-09-24T11:00:00Z',
}

let dir: string
let handler: ReturnType<typeof createVotesHandler>

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'asd-votes-'))
  handler = createVotesHandler(path.join(dir, 'votes.local.json'))
  gh.calls = []
  gh.list = [buried, footer]
  gh.view = {}
  gh.fail = false
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

async function send({
  method = 'POST',
  body,
  raw,
  next = vi.fn(),
}: {
  method?: string
  body?: unknown
  raw?: string
  next?: () => void
} = {}) {
  const req = Object.assign(Readable.from([raw ?? JSON.stringify(body)]), {
    method,
    headers: {},
    socket: { remoteAddress: '127.0.0.1' },
  })
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    end(chunk?: string) {
      this.body = chunk ?? ''
    },
  }
  // @ts-expect-error - fake req/res are enough for this handler
  await handler(req, res, next)
  return {
    status: res.statusCode,
    json: res.body ? JSON.parse(res.body) : null,
  }
}

describe('GET /api/votes', () => {
  it('lists open proposals newest first with region, prompt, requester, and no votes yet', async () => {
    const res = await send({ method: 'GET' })
    expect(res).toEqual({
      status: 200,
      json: {
        proposals: [
          {
            number: 32,
            regionId: 'footer',
            prompt: 'Add a phone number',
            requester: 'Dana',
            url: 'https://github.com/cwalsh003/atlas_hackathon/issues/32',
            createdAt: '2026-09-24T11:00:00Z',
            votes: 0,
            voters: [],
          },
          {
            number: 31,
            regionId: 'kpi-buried',
            prompt: 'Make the buried count red.\n\nAnd bold.',
            requester: 'Colin',
            url: 'https://github.com/cwalsh003/atlas_hackathon/issues/31',
            createdAt: '2026-09-24T10:00:00Z',
            votes: 0,
            voters: [],
          },
        ],
      },
    })
  })

  it('asks gh for open vote-lane issues only, with a 30 second timeout', async () => {
    await send({ method: 'GET' })
    expect(gh.calls[0]).toEqual({
      args: [
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
      ],
      options: { timeout: 30_000 },
      body: undefined,
    })
  })

  it('serves repeat reads within five seconds from one gh call', async () => {
    await send({ method: 'GET' })
    await send({ method: 'GET' })
    expect(gh.calls).toHaveLength(1)
  })

  it('responds 502 with the gh error when listing fails', async () => {
    gh.fail = true
    const res = await send({ method: 'GET' })
    expect(res.status).toBe(502)
    expect(res.json.error).toContain('Bad credentials')
  })

  it('passes the request on untouched outside demo mode', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '')
    const next = vi.fn()
    const res = await send({ method: 'GET', next })
    vi.stubEnv('VITE_DEMO_MODE', '1')
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).toBe(0)
    expect(gh.calls).toHaveLength(0)
  })

  it('rejects anything but GET and POST with 405', async () => {
    expect((await send({ method: 'DELETE' })).status).toBe(405)
  })
})

describe('POST /api/votes with a vote', () => {
  it('counts the same voter twice on one proposal once', async () => {
    await send({ body: { number: 31, voter: 'Colin' } })
    const res = await send({ body: { number: 31, voter: 'Colin' } })
    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ number: 31, votes: 1, voters: ['Colin'] })
  })

  it('counts two voters on one proposal twice', async () => {
    await send({ body: { number: 31, voter: 'Colin' } })
    const res = await send({ body: { number: 31, voter: 'Dana' } })
    expect(res.json).toMatchObject({
      number: 31,
      regionId: 'kpi-buried',
      votes: 2,
      voters: ['Colin', 'Dana'],
    })
  })

  it('shows recorded votes in the proposal list', async () => {
    await send({ body: { number: 32, voter: 'Colin' } })
    const res = await send({ method: 'GET' })
    expect(res.json.proposals[0]).toMatchObject({
      number: 32,
      votes: 1,
      voters: ['Colin'],
    })
  })

  it.each([
    ['an empty voter', ''],
    ['a voter over 60 characters', 'a'.repeat(61)],
    ['a voter with control characters', 'Colin\nDana'],
  ])('rejects %s with 400', async (_, voter) => {
    const res = await send({ body: { number: 31, voter } })
    expect(res.status).toBe(400)
    expect(res.json.error).toMatch(/voter/)
  })

  it('rejects a vote on an issue that is not an open proposal with 404', async () => {
    const res = await send({ body: { number: 99, voter: 'Colin' } })
    expect(res.status).toBe(404)
  })

  it('rejects a missing issue number with 400', async () => {
    const res = await send({ body: { number: 'x', voter: 'Colin' } })
    expect(res.status).toBe(400)
  })

  it('rejects malformed JSON with 400', async () => {
    expect((await send({ raw: '{nope' })).status).toBe(400)
  })

  it('rejects an unknown action with 400', async () => {
    expect((await send({ body: { action: 'merge', number: 31 } })).status).toBe(
      400,
    )
  })
})

describe('POST /api/votes to promote', () => {
  function viewing(labels: string[], state = 'OPEN') {
    gh.view['31'] = {
      title: buried.title,
      body: buriedBody,
      labels: labels.map((name) => ({ name })),
      state,
    }
  }

  it('files an implement-lane request with the proposal copied into every body section', async () => {
    viewing(['needs-triage', 'lane:vote'])
    const res = await send({ body: { action: 'promote', number: 31 } })
    expect(res).toEqual({
      status: 201,
      json: {
        number: 50,
        url: 'https://github.com/cwalsh003/atlas_hackathon/issues/50',
      },
    })
    const create = gh.calls.find((call) => call.args[1] === 'create')!
    expect(create.args).toEqual([
      'issue',
      'create',
      '--title',
      'kpi-buried: Make the buried count red. And bold.',
      '--label',
      'needs-triage',
      '--label',
      'lane:implement',
      '--body-file',
      expect.any(String),
    ])
    expect(create.body).toBe(
      [
        '## Prompt',
        '',
        'Make the buried count red.',
        '',
        'And bold.',
        '',
        '## Region',
        '',
        '`kpi-buried`',
        '',
        '## Source file hint',
        '',
        'src/dashboard/KpiCards.tsx',
        '',
        '## Region markup',
        '',
        '```html',
        '<section data-edit-id="kpi-buried">3</section>',
        '```',
        '',
        '## Requester',
        '',
        'Colin',
        '',
        '## Lane',
        '',
        'implement',
        '',
      ].join('\n'),
    )
  })

  it('comments the new issue link on the proposal and closes it', async () => {
    viewing(['lane:vote'])
    await send({ body: { action: 'promote', number: 31 } })
    expect(gh.calls.map((call) => call.args.slice(0, 3))).toEqual([
      ['issue', 'view', '31'],
      ['issue', 'create', '--title'],
      ['issue', 'comment', '31'],
      ['issue', 'close', '31'],
    ])
    const comment = gh.calls.find((call) => call.args[1] === 'comment')!
    expect(comment.body).toContain(
      'https://github.com/cwalsh003/atlas_hackathon/issues/50',
    )
  })

  it('carries the scratch label from the proposal to the new request', async () => {
    viewing(['lane:vote', 'scratch'])
    await send({ body: { action: 'promote', number: 31 } })
    const create = gh.calls.find((call) => call.args[1] === 'create')!
    expect(create.args).toContain('scratch')
  })

  it('drops the promoted proposal from the list straight away', async () => {
    await send({ method: 'GET' })
    viewing(['lane:vote'])
    await send({ body: { action: 'promote', number: 31 } })
    gh.list = [footer]
    const res = await send({ method: 'GET' })
    expect(res.json.proposals.map((p: { number: number }) => p.number)).toEqual(
      [32],
    )
  })

  it('refuses to promote an issue that is not a vote-lane proposal', async () => {
    viewing(['needs-triage', 'lane:implement'])
    const res = await send({ body: { action: 'promote', number: 31 } })
    expect(res.status).toBe(400)
    expect(gh.calls.map((call) => call.args[1])).toEqual(['view'])
  })

  it('refuses to promote a closed proposal', async () => {
    viewing(['lane:vote'], 'CLOSED')
    const res = await send({ body: { action: 'promote', number: 31 } })
    expect(res.status).toBe(400)
    expect(gh.calls.map((call) => call.args[1])).toEqual(['view'])
  })

  it('responds 502 with the gh error when gh fails', async () => {
    viewing(['lane:vote'])
    gh.fail = true
    const res = await send({ body: { action: 'promote', number: 31 } })
    expect(res.status).toBe(502)
    expect(res.json.error).toContain('Bad credentials')
  })
})
