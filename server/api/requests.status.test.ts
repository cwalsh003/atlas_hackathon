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
  method = 'GET',
) {
  const res = makeRes()
  const next = vi.fn()
  // @ts-expect-error - fake req/res are enough for this handler
  await handler({ method, url }, res, next)
  return { res, next, json: res.body ? JSON.parse(res.body) : undefined }
}

const listCalls = (gh: ReturnType<typeof fakeGh>) =>
  gh.mock.calls.filter(([args]) => args[1] === 'list')

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

  it('answers 502 when gh fails', async () => {
    const { res } = await get(
      createStatusHandler(async () => {
        throw new Error('HTTP 401: Bad credentials')
      }),
    )
    expect(res.statusCode).toBe(502)
  })

  it('refuses anything but GET', async () => {
    const { res } = await get(createStatusHandler(fakeGh()), '/', 'POST')
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
