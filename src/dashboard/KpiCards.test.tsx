import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

function kpiLabel(regionId: string) {
  return new RegExp(
    `data-edit-id="${regionId}"[^>]*><span class="kpi-card__label">([^<]*)<`,
  )
}

async function labelInDemoMode(regionId: string, shipped: string[]) {
  vi.stubEnv('VITE_DEMO_MODE', '1')
  vi.resetModules()
  const { setShipped } = await import('../flags/flagStore.ts')
  const { default: App } = await import('../App.tsx')
  setShipped(new Set(shipped))
  return renderToString(<App />).match(kpiLabel(regionId))?.[1]
}

describe('KpiCards req-42', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('labels the buried KPI "Buried" while req-42 is not shipped', async () => {
    expect(await labelInDemoMode('kpi-buried', [])).toBe('Buried')
  })

  it('labels the buried KPI "Snowed in" once req-42 is shipped', async () => {
    expect(await labelInDemoMode('kpi-buried', ['req-42'])).toBe('Snowed in')
  })
})

describe('KpiCards req-44', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('labels the done KPI "Done" while req-44 is not shipped', async () => {
    expect(await labelInDemoMode('kpi-done', [])).toBe('Done')
  })

  it('labels the done KPI "Cleared" once req-44 is shipped', async () => {
    expect(await labelInDemoMode('kpi-done', ['req-44'])).toBe('Cleared')
  })
})

describe('KpiCards req-51', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('labels the plowing KPI "Plowing now" while req-51 is not shipped', async () => {
    expect(await labelInDemoMode('kpi-plowing', [])).toBe('Plowing now')
  })

  it('labels the plowing KPI "Out plowing" once req-51 is shipped', async () => {
    expect(await labelInDemoMode('kpi-plowing', ['req-51'])).toBe('Out plowing')
  })
})
