import { describe, expect, it } from 'vitest'
import { buildBody, buildTitle } from './issueBody.ts'

describe('buildTitle', () => {
  it('prefixes the prompt with the region id', () => {
    expect(buildTitle('kpi-buried', 'Make it red')).toBe(
      'kpi-buried: Make it red',
    )
  })

  it('keeps a prompt of exactly 72 characters whole', () => {
    const prompt = 'a'.repeat(72)
    expect(buildTitle('chart', prompt)).toBe(`chart: ${prompt}`)
  })

  it('truncates a longer prompt to 72 characters with a trailing ellipsis', () => {
    const prompt = `${'a'.repeat(72)}bcdef`
    expect(buildTitle('chart', prompt)).toBe(`chart: ${'a'.repeat(72)}…`)
  })

  it('collapses newlines so the title stays on one line', () => {
    expect(buildTitle('footer', 'Line one\n\nline two')).toBe(
      'footer: Line one line two',
    )
  })
})

describe('buildBody', () => {
  const request = {
    prompt: 'Say "hi" with `code`, $(id); done',
    regionId: 'kpi-buried',
    sourceFile: 'src/dashboard/KpiCards.tsx',
    markup: '<section data-edit-id="kpi-buried">3</section>',
    requester: 'Colin',
    lane: 'implement' as const,
  }

  it('renders every section in order', () => {
    expect(buildBody(request)).toBe(
      [
        '## Prompt',
        '',
        'Say "hi" with `code`, $(id); done',
        '',
        '## Region',
        '',
        '`kpi-buried`',
        '',
        '## Source file hint',
        '',
        'src/dashboard/KpiCards.tsx',
        '',
        '## Region markup',
        '',
        '```html',
        '<section data-edit-id="kpi-buried">3</section>',
        '```',
        '',
        '## Requester',
        '',
        'Colin',
        '',
        '## Lane',
        '',
        'implement',
        '',
      ].join('\n'),
    )
  })

  it('fences markup that itself contains backtick runs', () => {
    const body = buildBody({ ...request, markup: '<p>```x````</p>' })
    expect(body).toContain('`````html\n<p>```x````</p>\n`````')
  })
})
