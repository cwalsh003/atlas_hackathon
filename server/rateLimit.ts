/** Returns `(key) => true` once `key` exceeds `limit` hits within `windowMs`. */
// ponytail: in-memory, per dev-server process; resets on restart, which is fine for a demo.
export function createRateLimiter(
  limit: number,
  windowMs: number,
): (key: string) => boolean {
  const recent = new Map<string, number[]>()
  return (key) => {
    const now = Date.now()
    const hits = (recent.get(key) ?? []).filter((t) => now - t < windowMs)
    hits.push(now)
    recent.set(key, hits)
    return hits.length > limit
  }
}
