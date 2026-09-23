import { describe, expect, it } from 'vitest'
import {
  clientKey,
  isScratchAllowed,
  validateRequest,
} from './validateRequest.ts'

const valid = {
  prompt: 'Make the buried count red',
  regionId: 'kpi-buried',
  markup: '<section data-edit-id="kpi-buried">3</section>',
  requester: 'Colin',
  lane: 'implement',
}

describe('validateRequest', () => {
  it('accepts a well-formed request', () => {
    expect(validateRequest(valid)).toEqual({
      ok: true,
      value: { ...valid, scratch: false },
    })
  })

  it('accepts a 500-character prompt and rejects a 501-character one', () => {
    expect(validateRequest({ ...valid, prompt: 'a'.repeat(500) }).ok).toBe(true)
    expect(validateRequest({ ...valid, prompt: 'a'.repeat(501) })).toEqual({
      ok: false,
      error: 'prompt must be 1-500 characters',
    })
  })

  it('rejects an empty prompt', () => {
    expect(validateRequest({ ...valid, prompt: '' }).ok).toBe(false)
  })

  it('accepts region markup up to 32 KB and rejects anything larger', () => {
    expect(
      validateRequest({ ...valid, markup: 'x'.repeat(32 * 1024) }).ok,
    ).toBe(true)
    expect(
      validateRequest({ ...valid, markup: 'x'.repeat(32 * 1024 + 1) }),
    ).toEqual({ ok: false, error: 'markup must be at most 32 KB' })
  })

  it('measures markup in bytes, not characters', () => {
    // 11,000 snowflakes is 33,000 bytes of UTF-8.
    expect(validateRequest({ ...valid, markup: '❄'.repeat(11_000) }).ok).toBe(
      false,
    )
  })

  it('rejects a region id that is not a lowercase slug', () => {
    for (const regionId of ['', 'Header', '1kpi', 'kpi buried', '../x']) {
      expect(validateRequest({ ...valid, regionId }).ok).toBe(false)
    }
  })

  it('requires a requester of 1-60 characters', () => {
    expect(validateRequest({ ...valid, requester: '' }).ok).toBe(false)
    expect(validateRequest({ ...valid, requester: 'a'.repeat(61) }).ok).toBe(
      false,
    )
  })

  it('accepts only the implement and vote lanes', () => {
    expect(validateRequest({ ...valid, lane: 'vote' }).ok).toBe(true)
    expect(validateRequest({ ...valid, lane: 'ship-it' }).ok).toBe(false)
  })

  it('passes scratch through only when it is a boolean', () => {
    expect(validateRequest({ ...valid, scratch: true })).toMatchObject({
      ok: true,
      value: { scratch: true },
    })
    expect(validateRequest({ ...valid, scratch: 'yes' }).ok).toBe(false)
  })

  it('rejects a body that is not an object or has wrong field types', () => {
    expect(validateRequest(null).ok).toBe(false)
    expect(validateRequest('hello').ok).toBe(false)
    expect(validateRequest({ ...valid, prompt: 42 }).ok).toBe(false)
  })
})

describe('isScratchAllowed', () => {
  it('allows scratch from loopback with no tunnel header', () => {
    for (const address of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
      expect(isScratchAllowed({}, address)).toBe(true)
    }
  })

  it('ignores scratch from a non-loopback address', () => {
    expect(isScratchAllowed({}, '192.168.1.20')).toBe(false)
    expect(isScratchAllowed({}, undefined)).toBe(false)
  })

  it('ignores scratch that arrives through the tunnel, even from loopback', () => {
    expect(
      isScratchAllowed({ 'cf-connecting-ip': '203.0.113.9' }, '127.0.0.1'),
    ).toBe(false)
  })
})

describe('clientKey', () => {
  it('prefers CF-Connecting-IP', () => {
    expect(
      clientKey(
        {
          'cf-connecting-ip': '203.0.113.9',
          'x-forwarded-for': '198.51.100.1',
        },
        '127.0.0.1',
      ),
    ).toBe('203.0.113.9')
  })

  it('falls back to the first X-Forwarded-For entry', () => {
    expect(
      clientKey({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }, '127.0.0.1'),
    ).toBe('198.51.100.1')
  })

  it('falls back to the socket address', () => {
    expect(clientKey({}, '::1')).toBe('::1')
  })
})
