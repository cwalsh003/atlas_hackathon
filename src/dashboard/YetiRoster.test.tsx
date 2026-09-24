import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

function rosterTitle() {
  return /class="roster__title">([^<]*)</
}

async function titleInDemoMode(shipped: string[]) {
  vi.stubEnv('VITE_DEMO_MODE', '1')
  vi.resetModules()
  const { setShipped } = await import('../flags/flagStore.ts')
  const { default: App } = await import('../App.tsx')
  setShipped(new Set(shipped))
  return renderToString(<App />).match(rosterTitle())?.[1]
}

describe('YetiRoster req-49', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('titles the roster "Yeti roster" while req-49 is not shipped', async () => {
    expect(await titleInDemoMode([])).toBe('Yeti roster')
  })

  it('titles the roster "Crew roster" once req-49 is shipped', async () => {
    expect(await titleInDemoMode(['req-49'])).toBe('Crew roster')
  })
})
