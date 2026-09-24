import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

function colYetiHeader() {
  return /data-edit-id="col-yeti"[^>]*>([^<]*)</
}

async function headerInDemoMode(shipped: string[]) {
  vi.stubEnv('VITE_DEMO_MODE', '1')
  vi.resetModules()
  const { setShipped } = await import('../flags/flagStore.ts')
  const { default: App } = await import('../App.tsx')
  setShipped(new Set(shipped))
  return renderToString(<App />).match(colYetiHeader())?.[1]
}

describe('WorkOrdersTable req-49', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('labels the yeti column "Yeti" while req-49 is not shipped', async () => {
    expect(await headerInDemoMode([])).toBe('Yeti')
  })

  it('labels the yeti column "Crew" once req-49 is shipped', async () => {
    expect(await headerInDemoMode(['req-49'])).toBe('Crew')
  })
})
