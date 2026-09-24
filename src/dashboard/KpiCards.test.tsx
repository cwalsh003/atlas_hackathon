import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const buriedLabel =
  /data-edit-id="kpi-buried"[^>]*><span class="kpi-card__label">([^<]*)</

async function buriedLabelInDemoMode(shipped: string[]) {
  vi.stubEnv('VITE_DEMO_MODE', '1')
  vi.resetModules()
  const { setShipped } = await import('../flags/flagStore.ts')
  const { default: App } = await import('../App.tsx')
  setShipped(new Set(shipped))
  return renderToString(<App />).match(buriedLabel)?.[1]
}

describe('KpiCards req-42', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('labels the buried KPI "Buried" while req-42 is not shipped', async () => {
    expect(await buriedLabelInDemoMode([])).toBe('Buried')
  })

  it('labels the buried KPI "Snowed in" once req-42 is shipped', async () => {
    expect(await buriedLabelInDemoMode(['req-42'])).toBe('Snowed in')
  })
})
