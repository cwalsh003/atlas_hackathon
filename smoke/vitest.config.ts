import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Real-dependency smoke tests: they talk to GitHub through the authenticated
// gh CLI, so they run only via `npm run smoke`, never under `npm test`.
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: {
    include: ['smoke/**/*.smoke.ts'],
    reporters: ['verbose'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
