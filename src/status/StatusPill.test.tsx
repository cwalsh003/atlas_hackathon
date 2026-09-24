import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StatusPill } from './StatusPill.tsx'

const url = 'https://github.com/cwalsh003/atlas_hackathon/issues/42'

describe('StatusPill', () => {
  it('names the state and links to the issue in a new tab', () => {
    const html = renderToString(
      <StatusPill
        request={{ number: 42, state: 'pr-open', url }}
        isPhone={false}
      />,
    )
    expect(html).toBe(
      `<a data-demo="true" class="pill pill--pr-open" href="${url}" target="_blank" rel="noreferrer">PR open</a>`,
    )
  })

  it('carries the triage comment on a declined pill', () => {
    const html = renderToString(
      <StatusPill
        request={{
          number: 42,
          state: 'declined',
          url,
          comment: 'Too big for today',
        }}
        isPhone
      />,
    )
    expect(html).toContain('class="pill pill--declined"')
    expect(html).toContain('title="Too big for today"')
    expect(html).toContain('>declined<')
  })

  it('shows a just-filed request as queued before its link is known', () => {
    const html = renderToString(
      <StatusPill request={{ number: 43, state: 'queued' }} isPhone={false} />,
    )
    expect(html).toContain('class="pill pill--queued"')
    expect(html).not.toContain('href')
    expect(html).toContain('>queued<')
  })
})
