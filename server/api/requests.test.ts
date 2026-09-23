import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// gh is the external boundary; capture what the endpoint hands it.
const gh = vi.hoisted(() => ({
  calls: [] as { args: string[]; options: object; body: string }[],
  fail: false,
}))
vi.mock('node:child_process', () => ({
  execFile: (
    _cmd: string,
    args: string[],
    options: object,
    cb: (err: Error | null, stdout: string, stderr: string) => void,
  ) => {
    const body = readFileSync(args[args.indexOf('--body-file') + 1], 'utf8')
    gh.calls.push({ args, options, body })
    if (gh.fail) cb(new Error('exit 1'), '', 'HTTP 401: Bad credentials')
    else
      cb(null, 'https://github.com/cwalsh003/atlas_hackathon/issues/42\n', '')
  },
}))

vi.stubEnv('VITE_DEMO_MODE', '1')
const { default: requests } = await import('./requests.ts')

const valid = {
  prompt: 'Make the buried count red',
  regionId: 'kpi-buried',
  markup: '<section data-edit-id="kpi-buried">3</section>',
  requester: 'Colin',
  lane: 'implement',
}

let nextIp = 0

async function send({
  method = 'POST',
  body = valid as unknown,
  raw,
  headers = {},
  remoteAddress = `10.0.0.${++nextIp}`,
  next = vi.fn(),
}: {
  method?: string
  body?: unknown
  raw?: string
  headers?: Record<string, string>
  remoteAddress?: string
  next?: () => void
} = {}) {
  const req = Object.assign(Readable.from([raw ?? JSON.stringify(body)]), {
    method,
    headers,
    socket: { remoteAddress },
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
  await requests(req, res, next)
  return {
    status: res.statusCode,
    json: res.body ? JSON.parse(res.body) : null,
  }
}

describe('POST /api/requests', () => {
  beforeEach(() => {
    gh.calls = []
    gh.fail = false
  })

  it('creates an issue and returns its number', async () => {
    const res = await send()
    expect(res).toEqual({
      status: 201,
      json: {
        number: 42,
        url: 'https://github.com/cwalsh003/atlas_hackathon/issues/42',
      },
    })
    expect(gh.calls[0].args).toEqual([
      'issue',
      'create',
      '--title',
      'kpi-buried: Make the buried count red',
      '--label',
      'needs-triage',
      '--label',
      'lane:implement',
      '--body-file',
      expect.any(String),
    ])
  })

  it('gives gh 30 seconds before treating it as hung', async () => {
    await send()
    expect(gh.calls[0].options).toEqual({ timeout: 30_000 })
  })

  it('writes the body with the source file hint for the region', async () => {
    await send()
    expect(gh.calls[0].body).toContain(
      '## Source file hint\n\nsrc/dashboard/KpiCards.tsx',
    )
  })

  it('reports an unknown source file for a region it cannot find', async () => {
    await send({ body: { ...valid, regionId: 'nowhere' } })
    expect(gh.calls[0].body).toContain('## Source file hint\n\nunknown')
  })

  it('rejects a prompt over 500 characters without creating an issue', async () => {
    const res = await send({ body: { ...valid, prompt: 'a'.repeat(501) } })
    expect(res.status).toBe(400)
    expect(res.json.error).toMatch(/prompt/)
    expect(gh.calls).toHaveLength(0)
  })

  it('rejects malformed JSON with 400', async () => {
    expect((await send({ raw: '{nope' })).status).toBe(400)
  })

  it('rejects a body over 1 MB with 413', async () => {
    const res = await send({ raw: 'x'.repeat(1024 * 1024 + 1) })
    expect(res.status).toBe(413)
    expect(gh.calls).toHaveLength(0)
  })

  it('rejects anything but POST with 405', async () => {
    expect((await send({ method: 'GET' })).status).toBe(405)
  })

  it('adds the scratch label for a loopback request', async () => {
    await send({
      body: { ...valid, scratch: true },
      remoteAddress: '127.0.0.1',
    })
    expect(gh.calls[0].args).toContain('scratch')
  })

  it('ignores scratch from a non-loopback address', async () => {
    await send({ body: { ...valid, scratch: true } })
    expect(gh.calls[0].args).not.toContain('scratch')
  })

  it('ignores scratch that arrives through the tunnel', async () => {
    await send({
      body: { ...valid, scratch: true },
      remoteAddress: '127.0.0.1',
      headers: { 'cf-connecting-ip': '203.0.113.9' },
    })
    expect(gh.calls[0].args).not.toContain('scratch')
  })

  it('limits each client to 10 requests per minute', async () => {
    const headers = { 'cf-connecting-ip': '203.0.113.50' }
    const statuses = []
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await send({ headers, remoteAddress: '127.0.0.1' })).status,
      )
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(201))
    expect(statuses[10]).toBe(429)
    // A different client behind the same tunnel is unaffected.
    const other = { 'cf-connecting-ip': '203.0.113.51' }
    expect(
      (await send({ headers: other, remoteAddress: '127.0.0.1' })).status,
    ).toBe(201)
  })

  it('passes the request on untouched outside demo mode', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '')
    const next = vi.fn()
    const res = await send({ next })
    vi.stubEnv('VITE_DEMO_MODE', '1')
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).toBe(0)
    expect(gh.calls).toHaveLength(0)
  })

  it('responds 502 with the gh error when issue creation fails', async () => {
    gh.fail = true
    const res = await send()
    expect(res.status).toBe(502)
    expect(res.json.error).toContain('Bad credentials')
  })
})
