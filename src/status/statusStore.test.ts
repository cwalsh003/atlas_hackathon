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
    const { subscribe, getSnapshot, getPollCount } =
      await import('./statusStore.ts')
    const flags = await import('../flags/flagStore.ts')
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/requests/status?ids=12,30')
    await vi.advanceTimersByTimeAsync(0)
    expect(getSnapshot()).toEqual([request(12, 'chart')])
    expect(flags.getSnapshot().shipped).toEqual(new Set(['req-7', 'req-12']))
    expect(listener).toHaveBeenCalledTimes(1)
    expect(getPollCount()).toBe(1)

    const firstBoard = getSnapshot()
    await vi.advanceTimersByTimeAsync(5000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Same board again: the snapshot keeps its identity, so regions do not re-render for it.
    expect(getSnapshot()).toBe(firstBoard)

    expect(getPollCount()).toBe(2)

    unsubscribe()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('makes itself the only shipped feed, so the flag store stops polling /api/flags', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '1')
    vi.useFakeTimers()
    const fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      json: async () => ({ requests: [], shipped: [] }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', {
      location: { search: '' },
      localStorage: { getItem: () => null, setItem: () => {} },
    })
    const status = await import('./statusStore.ts')
    const flags = await import('../flags/flagStore.ts')
    const stopStatus = status.subscribe(() => {})
    const stopFlags = flags.subscribe(() => {})

    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/flags')
    stopFlags()
    stopStatus()
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
    expect(regionRequest(board, 'chart', undefined, 0)?.number).toBe(25)
    expect(regionRequest(board, 'roster', undefined, 0)).toBeUndefined()
  })

  it('shows a just-filed request as queued until the poll confirms it', () => {
    const filed = { issue: 40, pollCount: 3 }
    expect(regionRequest(board, 'roster', filed, 3)).toEqual({
      number: 40,
      state: 'queued',
    })
    expect(regionRequest(board, 'chart', filed, 3)).toEqual({
      number: 40,
      state: 'queued',
    })
    expect(
      regionRequest([...board, request(40, 'chart')], 'chart', filed, 4),
    ).toEqual(request(40, 'chart'))
  })

  it('drops the optimistic pill when two polls after filing still do not report the request', () => {
    const filed = { issue: 40, pollCount: 3 }
    // The first poll after filing may predate the issue, so it keeps the pill.
    expect(regionRequest(board, 'roster', filed, 4)?.state).toBe('queued')
    expect(regionRequest(board, 'roster', filed, 5)).toBeUndefined()
    expect(regionRequest(board, 'chart', filed, 5)?.number).toBe(25)
  })
})
