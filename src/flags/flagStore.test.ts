import { afterEach, describe, expect, it, vi } from 'vitest'

describe('flagStore', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('notifies subscribers when setShipped is called', async () => {
    vi.stubEnv('VITE_DEMO_MODE', undefined)
    const { setShipped, subscribe, getSnapshot } =
      await import('./flagStore.ts')
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    setShipped(new Set(['req-42']))

    expect(listener).toHaveBeenCalled()
    expect(getSnapshot().shipped).toEqual(new Set(['req-42']))
    unsubscribe()
  })

  it('polls /api/flags every 5 s in demo mode and stops when the last subscriber leaves', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '1')
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ shipped: [16] }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      location: { search: '?flag=req-7' },
      localStorage: { getItem: () => null, setItem: () => {} },
    })
    const { subscribe, getSnapshot } = await import('./flagStore.ts')
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(getSnapshot().shipped).toEqual(new Set(['req-16']))
    expect(getSnapshot().overrides).toEqual(new Set(['req-7']))
    expect(listener).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Same shipped set again: subscribers are not re-notified.
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('never fetches outside demo mode', async () => {
    vi.stubEnv('VITE_DEMO_MODE', undefined)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: { getItem: () => null, setItem: () => {} },
    })
    const { subscribe } = await import('./flagStore.ts')
    const unsubscribe = subscribe(() => {})

    expect(fetchMock).not.toHaveBeenCalled()
    unsubscribe()
  })
})
