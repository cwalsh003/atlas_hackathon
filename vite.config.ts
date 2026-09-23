import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import { apiPlugin } from './server/plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  test: {
    // Smoke tests hit GitHub; they run only through `npm run smoke`.
    exclude: [...configDefaults.exclude, 'smoke/**'],
  },
  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
})
