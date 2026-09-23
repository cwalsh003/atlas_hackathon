import { describe, expect, it } from 'vitest'
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
