import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const plowingLabel =
  /data-edit-id="kpi-plowing"[^>]*><span class="kpi-card__label">([^<]*)</

async function plowingLabelInDemoMode(shipped: string[]) {
  vi.stubEnv('VITE_DEMO_MODE', '1')
  vi.resetModules()
  const { setShipped } = await import('../flags/flagStore.ts')
  const { default: App } = await import('../App.tsx')
  setShipped(new Set(shipped))
  return renderToString(<App />).match(plowingLabel)?.[1]
}

describe('KpiCards req-51', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('labels the plowing KPI "Plowing now" while req-51 is not shipped', async () => {
    expect(await plowingLabelInDemoMode([])).toBe('Plowing now')
  })

  it('labels the plowing KPI "Out plowing" once req-51 is shipped', async () => {
    expect(await plowingLabelInDemoMode(['req-51'])).toBe('Out plowing')
  })
})
