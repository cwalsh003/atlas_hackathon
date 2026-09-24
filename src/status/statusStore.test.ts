import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RequestStatus } from './pillState.ts'
import { regionRequest } from './statusStore.ts'

const url = (n: number) =>
  `https://github.com/cwalsh003/atlas_hackathon/issues/${n}`
const request = (number: number, regionId: string): RequestStatus => ({
  number,
  regionId,
  state: 'building',
  url: url(number),
  assigned: true,
})

describe('statusStore', () => {
  // regionRequest's static import already loaded the store; start each test fresh.
  beforeEach(() => vi.resetModules())
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
    vi.useRealTimers()
  })

  it('polls the status endpoint with remembered ids every 5 s in demo mode, feeds the shipped set, and stops after the last subscriber leaves', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '1')
    vi.useFakeTimers()
    const body = { requests: [request(12, 'chart')], shipped: [7, 12] }
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => body,
    }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      localStorage: { getItem: () => '[12,30]', setItem: () => {} },
    })
    const { subscribe, getSnapshot } = await import('./statusStore.ts')
    const flags = await import('../flags/flagStore.ts')
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/requests/status?ids=12,30')
    await vi.advanceTimersByTimeAsync(0)
    expect(getSnapshot()).toEqual([request(12, 'chart')])
    expect(flags.getSnapshot().shipped).toEqual(new Set(['req-7', 'req-12']))
    expect(listener).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Same board again: subscribers are not re-notified.
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('never fetches outside demo mode', async () => {
    vi.stubEnv('VITE_DEMO_MODE', undefined)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      localStorage: { getItem: () => null, setItem: () => {} },
    })
    const { subscribe } = await import('./statusStore.ts')
    const unsubscribe = subscribe(() => {})
    expect(fetchMock).not.toHaveBeenCalled()
    unsubscribe()
  })

  it('has an empty server snapshot', async () => {
    const { getServerSnapshot } = await import('./statusStore.ts')
    expect(getServerSnapshot()).toEqual([])
  })
})

describe('regionRequest', () => {
  const board = [
    request(20, 'chart'),
    request(25, 'chart'),
    request(21, 'footer'),
  ]

  it('shows the highest-numbered request on a region', () => {
    expect(regionRequest(board, 'chart')?.number).toBe(25)
    expect(regionRequest(board, 'roster')).toBeUndefined()
  })

  it('shows a just-filed request as queued until the poll confirms it', () => {
    expect(regionRequest(board, 'roster', 40)).toEqual({
      number: 40,
      state: 'queued',
    })
    expect(regionRequest(board, 'chart', 40)).toEqual({
      number: 40,
      state: 'queued',
    })
    expect(
      regionRequest([...board, request(40, 'chart')], 'chart', 40),
    ).toEqual(request(40, 'chart'))
  })
})
