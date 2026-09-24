/**
 * Wraps an async fetch in a cache that dedupes concurrent calls into one
 * underlying fetch and serves the last value for `ttlMs` before refetching.
 */
export function createCachedFetcher<T>(
  fn: () => Promise<T>,
  ttlMs: number,
): () => Promise<T> {
  let cached: { value: T; expiresAt: number } | undefined
  let pending: Promise<T> | undefined

  return function fetchCached(): Promise<T> {
    if (cached && Date.now() < cached.expiresAt) {
      return Promise.resolve(cached.value)
    }

    if (!pending) {
      pending = fn()
        .then((value) => {
          cached = { value, expiresAt: Date.now() + ttlMs }
          return value
        })
        .finally(() => {
          pending = undefined
        })
    }

    return pending
  }
}
