import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import App from './App'

const editIds = [
  'header',
  'kpi-orders',
  'kpi-plowing',
  'kpi-done',
  'kpi-buried',
  'chart',
  'roster',
  'orders',
  'col-order',
  'col-driveway',
  'col-town',
  'col-yeti',
  'col-status',
  'col-due',
  'footer',
]

describe('App', () => {
  it('renders the client dashboard', () => {
    expect(renderToString(<App />)).toContain('Abominable Snow Services')
  })

  it('renders all 15 dashboard regions with their edit ids', () => {
    const html = renderToString(<App />)
    for (const id of editIds) {
      expect(html).toContain(`data-edit-id="${id}"`)
    }
  })
})

describe('App edit mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  async function renderApp(demoMode: string | undefined) {
    vi.stubEnv('VITE_DEMO_MODE', demoMode)
    vi.resetModules()
    const { default: FreshApp } = await import('./App')
    return renderToString(<FreshApp />)
  }

  it('shows the edit mode toggle, switched off, in demo mode', async () => {
    const html = await renderApp('1')
    expect(html).toMatch(/<button[^>]*aria-pressed="false"[^>]*>Edit mode</)
  })

  it('renders no demo-only UI outside demo mode', async () => {
    const html = await renderApp(undefined)
    expect(html).not.toContain('Edit mode')
    expect(html).not.toContain('data-demo')
  })
})
