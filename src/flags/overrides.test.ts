import { afterEach, describe, expect, it, vi } from 'vitest'
import { readOverrides } from './overrides.ts'

function stubWindow(
  search: string,
  initialStorage: Record<string, string> = {},
) {
  const store = new Map(Object.entries(initialStorage))
  vi.stubGlobal('window', {
    location: { search },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  })
  return store
}

describe('readOverrides', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an empty set with no query params and no stored overrides', () => {
    stubWindow('')
    expect(readOverrides()).toEqual(new Set())
  })

  it('adds ids from repeated ?flag= params', () => {
    stubWindow('?flag=req-100&flag=req-7')
    expect(readOverrides()).toEqual(new Set(['req-100', 'req-7']))
  })

  it('removes ids from repeated ?unflag= params, even when previously stored', () => {
    stubWindow('?unflag=req-100', {
      'asd.flagOverrides': JSON.stringify(['req-100', 'req-7']),
    })
    expect(readOverrides()).toEqual(new Set(['req-7']))
  })

  it('persists the resulting set to localStorage', () => {
    const store = stubWindow('?flag=req-100')
    readOverrides()
    expect(store.get('asd.flagOverrides')).toBe(JSON.stringify(['req-100']))
  })

  it('returns an empty set outside the browser (no window)', () => {
    expect(readOverrides()).toEqual(new Set())
  })
})
