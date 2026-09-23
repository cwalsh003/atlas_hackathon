import { execFile } from 'node:child_process'
import type { Connect } from 'vite'
import { createCachedFetcher } from '../cache.ts'

const CACHE_TTL_MS = 5000

function fetchShippedFromGh(): Promise<number[]> {
  return new Promise((resolve, reject) => {
    execFile(
      'gh',
      [
        'issue',
        'list',
        '--state',
        'all',
        '--label',
        'shipped',
        '--limit',
        '200',
        '--json',
        'number',
      ],
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        try {
          const issues = JSON.parse(stdout) as Array<{ number: number }>
          resolve(issues.map((issue) => issue.number))
        } catch (parseError) {
          reject(parseError)
        }
      },
    )
  })
}

/** Builds the `/api/flags` handler around an injectable shipped-issues fetcher. */
export function createFlagsHandler(
  fetchShipped: () => Promise<number[]>,
): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      next()
      return
    }

    try {
      const shipped = await fetchShipped()
      res.statusCode = 200
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ shipped }))
    } catch {
      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'failed to fetch shipped issues' }))
    }
  }
}

const cachedFetchShipped = createCachedFetcher(fetchShippedFromGh, CACHE_TTL_MS)

const flags: Connect.NextHandleFunction = createFlagsHandler(cachedFetchShipped)

export default flags
