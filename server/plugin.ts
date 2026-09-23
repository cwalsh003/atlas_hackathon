import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const API_DIR = 'server/api'

export function apiPlugin(): Plugin {
  return {
    name: 'atlas-api-plugin',
    async configureServer(server) {
      const apiDir = path.resolve(server.config.root, API_DIR)
      const entries = await readdir(apiDir)

      for (const entry of entries) {
        if (entry.endsWith('.test.ts')) continue

        const basename = entry.replace(/\.ts$/, '')
        const file = path.join(apiDir, entry)

        const handler: Connect.NextHandleFunction = async (req, res, next) => {
          const mod = await server.ssrLoadModule(file)
          mod.default(req, res, next)
        }

        server.middlewares.use(`/api/${basename}`, handler)
      }
    },
  }
}
