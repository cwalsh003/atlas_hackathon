import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStatusHandler } from './requests.status.ts'

const URL_BASE = 'https://github.com/cwalsh003/atlas_hackathon/issues/'

function issue(
  number: number,
  title: string,
  labels: string[],
  state: 'OPEN' | 'CLOSED' = 'OPEN',
  assignees: string[] = [],
) {
  return {
    number,
    title,
    labels: labels.map((name) => ({ name })),
    assignees: assignees.map((login) => ({ login })),
    state,
    url: URL_BASE + number,
  }
}

const board = [
  issue(20, 'kpi-buried: Make it red', ['needs-triage', 'lane:implement']),
  issue(
    21,
    'chart: Scratch check',
    ['needs-triage', 'lane:implement', 'scratch'],
    'OPEN',
    ['atlas-bot'],
  ),
  issue(22, 'footer: Say hello', ['lane:implement', 'shipped'], 'CLOSED'),
  issue(
    23,
    'footer: Old smoke',
    ['lane:implement', 'shipped', 'scratch'],
    'CLOSED',
  ),
  issue(24, 'roster: Dropped', ['needs-triage', 'lane:implement'], 'CLOSED'),
  issue(25, 'A title without a region', ['needs-triage', 'lane:implement']),
  issue(26, 'orders: Rewrite everything', ['wontfix', 'lane:implement']),
]
const elsewhere = {
  30: issue(30, 'kpi-done: Put it to a vote', ['needs-triage', 'lane:vote']),
}

// gh is the external boundary: a fake that answers list, view, and comments.
function fakeGh() {
  return vi.fn(async (args: string[]) => {
    if (args[1] === 'list') return JSON.stringify(board)
    const n = Number(args[2])
    if (args.at(-1) === 'comments') {
      return JSON.stringify({
        comments: [{ body: 'Looking' }, { body: 'Too big for today' }],
      })
    }
    const found = elsewhere[n as keyof typeof elsewhere]
    if (!found) throw new Error(`GraphQL: Could not resolve to an issue (${n})`)
    return JSON.stringify(found)
  })
}

function makeRes() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(name: string, value: string) {
      this.headers[name] = value
    },
    end(chunk: string) {
      this.body = chunk
    },
  }
}

async function get(
  handler: ReturnType<typeof createStatusHandler>,
  url = '/',
  { method = 'GET', client = '198.51.100.1' } = {},
) {
  const res = makeRes()
  const next = vi.fn()
  const req = {
    method,
    url,
    headers: { 'cf-connecting-ip': client },
    socket: { remoteAddress: '127.0.0.1' },
  }
  // @ts-expect-error - fake req/res are enough for this handler
  await handler(req, res, next)
  return { res, next, json: res.body ? JSON.parse(res.body) : undefined }
}

const listCalls = (gh: ReturnType<typeof fakeGh>) =>
  gh.mock.calls.filter(([args]) => args[1] === 'list')

const viewsOf = (gh: ReturnType<typeof fakeGh>, n: number) =>
  gh.mock.calls.filter(
    ([args]) =>
      args[1] === 'view' && args[2] === String(n) && args.at(-1) !== 'comments',
  )

describe('GET /api/requests/status', () => {
  beforeEach(() => vi.stubEnv('VITE_DEMO_MODE', '1'))
  afterEach(() => vi.unstubAllEnvs())

  it('lists open requests and shipped non-scratch requests with region id, state, and url', async () => {
    const gh = fakeGh()
    const { res, json } = await get(createStatusHandler(gh))

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json')
    expect(json).toEqual({
      requests: [
        {
          number: 20,
          regionId: 'kpi-buried',
          state: 'queued',
          url: URL_BASE + 20,
          assigned: false,
        },
        {
          number: 21,
          regionId: 'chart',
          state: 'triaging',
          url: URL_BASE + 21,
          assigned: true,
        },
        {
          number: 22,
          regionId: 'footer',
          state: 'shipped',
          url: URL_BASE + 22,
          assigned: false,
        },
        {
          number: 26,
          regionId: 'orders',
          state: 'declined',
          url: URL_BASE + 26,
          assigned: false,
          comment: 'Too big for today',
        },
      ],
      shipped: [22, 23],
    })
    expect(listCalls(gh)[0][0]).toEqual([
      'issue',
      'list',
      '--state',
      'all',
      '--label',
      'lane:implement',
      '--limit',
      '200',
      '--json',
      'number,title,labels,assignees,state,url',
    ])
  })

  it('adds requested ids that are not on the board and ignores ids it cannot use', async () => {
    const gh = fakeGh()
    const { json } = await get(
      createStatusHandler(gh),
      '/?ids=30,20,24,99,abc,-4',
    )

    expect(json.requests.map((r: { number: number }) => r.number)).toEqual([
      20, 21, 22, 26, 30,
    ])
    expect(json.requests.at(-1)).toEqual({
      number: 30,
      regionId: 'kpi-done',
      state: 'queued',
      url: URL_BASE + 30,
      assigned: false,
    })
  })

  it('makes one gh list call for two callers with different ids inside five seconds', async () => {
    const gh = fakeGh()
    const handler = createStatusHandler(gh)

    await get(handler, '/?ids=30')
    await get(handler, '/?ids=31')
    await get(handler, '/?ids=30')

    expect(listCalls(gh)).toHaveLength(1)
    const viewsOf30 = gh.mock.calls.filter(
      ([args]) =>
        args[1] === 'view' && args[2] === '30' && args.at(-1) !== 'comments',
    )
    expect(viewsOf30).toHaveLength(1)
  })

  it('serves the last good board when gh list fails and retries only after five seconds', async () => {
    vi.useFakeTimers()
    let failing = true
    const gh: ReturnType<typeof fakeGh> = vi.fn(async (args: string[]) => {
      if (failing) throw new Error('HTTP 401: Bad credentials')
      return args[1] === 'list' ? JSON.stringify(board) : '{}'
    })
    const handler = createStatusHandler(gh)

    const first = await get(handler)
    await get(handler)
    expect(first.res.statusCode).toBe(200)
    expect(first.json).toEqual({ requests: [], shipped: [] })
    expect(listCalls(gh)).toHaveLength(1)

    failing = false
    vi.advanceTimersByTime(5001)
    expect((await get(handler)).json.requests).toHaveLength(4)

    failing = true
    vi.advanceTimersByTime(5001)
    expect((await get(handler)).json.requests).toHaveLength(4)
    expect(listCalls(gh)).toHaveLength(3)
    vi.useRealTimers()
  })

  it('stops looking up new ids for a client over 10 lookups a minute, still serving the board and ids it already has', async () => {
    const gh = fakeGh()
    const handler = createStatusHandler(gh)
    const client = '203.0.113.9'

    await get(handler, '/?ids=30', { client })
    for (let n = 40; n < 49; n++) await get(handler, `/?ids=${n}`, { client })
    const { json } = await get(handler, '/?ids=30,60', { client })

    expect(viewsOf(gh, 60)).toHaveLength(0)
    expect(json.requests.map((r: { number: number }) => r.number)).toEqual([
      20, 21, 22, 26, 30,
    ])

    await get(handler, '/?ids=60', { client: '203.0.113.10' })
    expect(viewsOf(gh, 60)).toHaveLength(1)
  })

  it('ignores ids above 100000', async () => {
    const gh = fakeGh()
    await get(createStatusHandler(gh), '/?ids=100001,30')
    expect(viewsOf(gh, 100001)).toHaveLength(0)
    expect(viewsOf(gh, 30)).toHaveLength(1)
  })

  it('forgets every cached id lookup once more than 500 are held', async () => {
    const gh = fakeGh()
    const handler = createStatusHandler(gh)
    const ids = Array.from({ length: 501 }, (_, i) => 1000 + i)
    for (let i = 0; i < ids.length; i += 20) {
      const batch = ids.slice(i, i + 20).join(',')
      await get(handler, `/?ids=${batch}`, { client: `192.0.2.${i / 20}` })
    }
    await get(handler, '/?ids=1001,1500', { client: '192.0.2.200' })

    // 1001 was dropped when the 501st id arrived; 1500 is still cached.
    expect(viewsOf(gh, 1001)).toHaveLength(2)
    expect(viewsOf(gh, 1500)).toHaveLength(1)
  })

  it('refuses anything but GET', async () => {
    const { res } = await get(createStatusHandler(fakeGh()), '/', {
      method: 'POST',
    })
    expect(res.statusCode).toBe(405)
    expect(res.headers.allow).toBe('GET')
  })

  it('does nothing outside demo mode', async () => {
    vi.stubEnv('VITE_DEMO_MODE', undefined)
    const gh = fakeGh()
    const { res, next } = await get(createStatusHandler(gh))
    expect(next).toHaveBeenCalled()
    expect(res.statusCode).toBe(0)
    expect(gh).not.toHaveBeenCalled()
  })
})
