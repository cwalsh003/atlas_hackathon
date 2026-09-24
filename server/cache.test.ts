import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCachedFetcher } from './cache.ts'

describe('createCachedFetcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('dedupes concurrent calls into a single underlying fetch', async () => {
    let calls = 0
    const fetcher = createCachedFetcher(async () => {
      calls++
      return calls
    }, 1000)

    const [a, b] = await Promise.all([fetcher(), fetcher()])

    expect(calls).toBe(1)
    expect(a).toBe(1)
    expect(b).toBe(1)
  })

  it('serves the cached value within the ttl without refetching', async () => {
    let calls = 0
    const fetcher = createCachedFetcher(async () => {
      calls++
      return calls
    }, 1000)

    await fetcher()
    vi.advanceTimersByTime(500)
    const value = await fetcher()

    expect(calls).toBe(1)
    expect(value).toBe(1)
  })

  it('refetches after the ttl elapses', async () => {
    let calls = 0
    const fetcher = createCachedFetcher(async () => {
      calls++
      return calls
    }, 1000)

    await fetcher()
    vi.advanceTimersByTime(1500)
    const value = await fetcher()

    expect(calls).toBe(2)
    expect(value).toBe(2)
  })
})
