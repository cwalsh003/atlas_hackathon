import { afterEach, describe, expect, it, vi } from 'vitest'
import { readMyRequests, rememberRequest } from './myRequests.ts'

function stubStorage(initial?: string) {
  const store = new Map<string, string>()
  if (initial !== undefined) store.set('asd.myRequests', initial)
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  })
  return store
}

describe('my requests', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('remembers each filed request once, in filing order', () => {
    const store = stubStorage()
    rememberRequest(41)
    rememberRequest(42)
    rememberRequest(41)
    expect(readMyRequests()).toEqual([41, 42])
    expect(store.get('asd.myRequests')).toBe('[41,42]')
  })

  it('keeps only the latest 20 so the status poll stays within its id cap', () => {
    stubStorage(JSON.stringify(Array.from({ length: 20 }, (_, i) => i + 1)))
    rememberRequest(99)
    expect(readMyRequests()).toHaveLength(20)
    expect(readMyRequests().at(0)).toBe(2)
    expect(readMyRequests().at(-1)).toBe(99)
  })

  it('reads nothing from missing or garbled storage', () => {
    stubStorage('not json')
    expect(readMyRequests()).toEqual([])
    stubStorage('{"a":1}')
    expect(readMyRequests()).toEqual([])
    stubStorage('[3,"x",-1,2.5]')
    expect(readMyRequests()).toEqual([3])
  })

  it('reads nothing without a browser', () => {
    expect(readMyRequests()).toEqual([])
  })
})
