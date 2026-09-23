import { describe, expect, it, vi } from 'vitest'
import { createFlagsHandler } from './flags.ts'

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

describe('flags handler', () => {
  it('responds with the shipped issue numbers as json', async () => {
    const handler = createFlagsHandler(async () => [42, 7])
    const res = makeRes()
    const next = vi.fn()

    // @ts-expect-error - fake req/res are enough for this handler
    await handler({ method: 'GET' }, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json')
    expect(res.body).toBe(JSON.stringify({ shipped: [42, 7] }))
    expect(next).not.toHaveBeenCalled()
  })

  it('responds 502 when the fetcher fails', async () => {
    const handler = createFlagsHandler(async () => {
      throw new Error('gh failed')
    })
    const res = makeRes()
    const next = vi.fn()

    // @ts-expect-error - fake req/res are enough for this handler
    await handler({ method: 'GET' }, res, next)

    expect(res.statusCode).toBe(502)
    expect(next).not.toHaveBeenCalled()
  })

  it('passes non-GET requests to next instead of handling them', async () => {
    const handler = createFlagsHandler(async () => [1])
    const res = makeRes()
    const next = vi.fn()

    // @ts-expect-error - fake req/res are enough for this handler
    await handler({ method: 'POST' }, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.statusCode).toBe(0)
  })
})
