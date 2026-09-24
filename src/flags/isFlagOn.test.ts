import { describe, expect, it } from 'vitest'
import { isFlagOn } from './isFlagOn.ts'

describe('isFlagOn', () => {
  it('is false for an unknown id', () => {
    expect(isFlagOn('req-99', new Set(), new Set(), true)).toBe(false)
  })

  it('is true when the id is in the shipped set', () => {
    expect(isFlagOn('req-100', new Set(['req-100']), new Set(), true)).toBe(
      true,
    )
  })

  it('is true when only an override is on', () => {
    expect(isFlagOn('req-100', new Set(), new Set(['req-100']), true)).toBe(
      true,
    )
  })

  it('is false in a production build regardless of the shipped set or an override', () => {
    expect(
      isFlagOn('req-100', new Set(['req-100']), new Set(['req-100']), false),
    ).toBe(false)
  })
})
