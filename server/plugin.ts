import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const API_DIR = 'server/api'

/**
 * Maps `server/api/` filenames to routes: a dot becomes a path segment, so
 * `requests.status.ts` mounts at `/api/requests/status`. Longest path first,
 * because a Connect prefix route would otherwise swallow its sub-routes.
 */
export function apiRoutes(entries: string[]): [route: string, entry: string][] {
  return entries
    .filter((entry) => entry.endsWith('.ts') && !entry.endsWith('.test.ts'))
    .map((entry): [string, string] => [
      `/api/${entry.replace(/\.ts$/, '').replaceAll('.', '/')}`,
      entry,
    ])
    .sort(([a], [b]) => b.length - a.length)
}

export function apiPlugin(): Plugin {
  return {
    name: 'atlas-api-plugin',
    async configureServer(server) {
      const apiDir = path.resolve(server.config.root, API_DIR)

      for (const [route, entry] of apiRoutes(await readdir(apiDir))) {
        const file = path.join(apiDir, entry)

        const handler: Connect.NextHandleFunction = async (req, res, next) => {
          try {
            const mod = await server.ssrLoadModule(file)
            await mod.default(req, res, next)
          } catch (error) {
            next(error)
          }
        }

        server.middlewares.use(route, handler)
      }
    },
  }
}
