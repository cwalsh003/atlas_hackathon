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
