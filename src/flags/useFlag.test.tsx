import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { useFlag } from './useFlag.ts'

function Flagged() {
  const on = useFlag('req-1')
  return <span>{on ? 'new' : 'old'}</span>
}

describe('useFlag', () => {
  it('server-renders without a browser and reads false', () => {
    expect(renderToString(<Flagged />)).toBe('<span>old</span>')
  })
})
