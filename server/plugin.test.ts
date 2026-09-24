import { describe, expect, it } from 'vitest'
import { apiRoutes } from './plugin.ts'

describe('apiRoutes', () => {
  it('turns a dot in a filename into a path segment', () => {
    expect(apiRoutes(['requests.status.ts'])).toEqual([
      ['/api/requests/status', 'requests.status.ts'],
    ])
  })

  it('registers longer paths first so /api/requests/status wins over /api/requests', () => {
    expect(
      apiRoutes(['flags.ts', 'requests.ts', 'requests.status.ts']).map(
        ([route]) => route,
      ),
    ).toEqual(['/api/requests/status', '/api/requests', '/api/flags'])
  })

  it('skips tests and non-TypeScript files', () => {
    expect(
      apiRoutes([
        'health.ts',
        'health.test.ts',
        'requests.status.test.ts',
        'notes.md',
      ]),
    ).toEqual([['/api/health', 'health.ts']])
  })
})
