import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('WorkOrdersTable', () => {
  it('labels the yeti column "Crew" (request #49, consolidated)', () => {
    expect(renderToString(<App />)).toMatch(
      /data-edit-id="col-yeti"[^>]*>Crew</,
    )
  })
})
