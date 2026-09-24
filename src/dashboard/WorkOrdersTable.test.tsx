import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

describe('WorkOrdersTable', () => {
  it('labels the yeti column "Crew" (request #49, consolidated)', () => {
    expect(renderToString(<App />)).toMatch(
      /data-edit-id="col-yeti"[^>]*>Crew</,
    )
  })
})

async function dashboardInDemoMode(shipped: string[]) {
  vi.stubEnv('VITE_DEMO_MODE', '1')
  vi.resetModules()
  const { setShipped } = await import('../flags/flagStore.ts')
  const { default: FreshApp } = await import('../App.tsx')
  setShipped(new Set(shipped))
  return renderToString(<FreshApp />)
}

describe('WorkOrdersTable req-58', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('renders the orders region while req-58 is not shipped', async () => {
    expect(await dashboardInDemoMode([])).toContain('data-edit-id="orders"')
  })

  it('removes the orders region once req-58 is shipped', async () => {
    const html = await dashboardInDemoMode(['req-58'])
    expect(html).not.toContain('data-edit-id="orders"')
    expect(html).not.toContain('orders__table')
  })
})
