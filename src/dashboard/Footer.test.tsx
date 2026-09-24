import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const footerText = /data-edit-id="footer"[^>]*>([^<]*)</

async function footerTextInDemoMode(shipped: string[]) {
  vi.stubEnv('VITE_DEMO_MODE', '1')
  vi.resetModules()
  const { setShipped } = await import('../flags/flagStore.ts')
  const { default: App } = await import('../App.tsx')
  setShipped(new Set(shipped))
  return renderToString(<App />).match(footerText)?.[1]
}

describe('Footer req-45', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('renders "Built by Jahnel Group" without a snowflake while req-45 is not shipped', async () => {
    expect(await footerTextInDemoMode([])).toBe('Built by Jahnel Group')
  })

  it('renders a snowflake before "Built by Jahnel Group" once req-45 is shipped', async () => {
    expect(await footerTextInDemoMode(['req-45'])).toBe(
      '❄️ Built by Jahnel Group',
    )
  })
})
