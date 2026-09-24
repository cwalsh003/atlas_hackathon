import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'

describe('YetiRoster', () => {
  it('titles the roster "Crew roster" (request #49, consolidated)', () => {
    expect(renderToString(<App />)).toContain(
      'class="roster__title">Crew roster<',
    )
  })
})
