import { describe, expect, it, vi } from 'vitest'
import health from './health.ts'

describe('health handler', () => {
  it('responds 200 with json {"ok":true}', () => {
    const res = {
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
    const next = vi.fn()

    // @ts-expect-error - fake req/res are enough for this handler
    health({}, res, next)

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('application/json')
    expect(res.body).toBe(JSON.stringify({ ok: true }))
    expect(next).not.toHaveBeenCalled()
  })
})
