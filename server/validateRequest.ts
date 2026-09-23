import type { IncomingHttpHeaders } from 'node:http'

export type Lane = 'implement' | 'vote'

export type RequestInput = {
  prompt: string
  regionId: string
  markup: string
  requester: string
  lane: Lane
  scratch: boolean
}

export type Validation =
  { ok: true; value: RequestInput } | { ok: false; error: string }

const MAX_MARKUP_BYTES = 32 * 1024
const REGION_ID = /^[a-z][a-z0-9-]*$/
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

function isText(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max
}

export function validateRequest(body: unknown): Validation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'body must be a JSON object' }
  }
  const { prompt, regionId, markup, requester, lane, scratch } = body as Record<
    string,
    unknown
  >
  if (!isText(prompt, 1, 500)) {
    return { ok: false, error: 'prompt must be 1-500 characters' }
  }
  if (typeof regionId !== 'string' || !REGION_ID.test(regionId)) {
    return { ok: false, error: 'regionId must be a lowercase slug' }
  }
  if (
    typeof markup !== 'string' ||
    Buffer.byteLength(markup) > MAX_MARKUP_BYTES
  ) {
    return { ok: false, error: 'markup must be at most 32 KB' }
  }
  if (!isText(requester, 1, 60)) {
    return { ok: false, error: 'requester must be 1-60 characters' }
  }
  if (lane !== 'implement' && lane !== 'vote') {
    return { ok: false, error: 'lane must be implement or vote' }
  }
  if (scratch !== undefined && typeof scratch !== 'boolean') {
    return { ok: false, error: 'scratch must be a boolean' }
  }
  return {
    ok: true,
    value: {
      prompt,
      regionId,
      markup,
      requester,
      lane,
      scratch: scratch ?? false,
    },
  }
}

// Behind the tunnel every request arrives from loopback, so a CF-Connecting-IP
// header means the request came from the public internet.
export function isScratchAllowed(
  headers: IncomingHttpHeaders,
  remoteAddress: string | undefined,
): boolean {
  return (
    !headers['cf-connecting-ip'] &&
    remoteAddress !== undefined &&
    LOOPBACK.has(remoteAddress)
  )
}

export function clientKey(
  headers: IncomingHttpHeaders,
  remoteAddress: string | undefined,
): string {
  const cf = headers['cf-connecting-ip']
  if (typeof cf === 'string' && cf) return cf
  const forwarded = headers['x-forwarded-for']
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(',')[0]
    ?.trim()
  return first || remoteAddress || 'unknown'
}
