import { describe, expect, it } from 'vitest'
import { PILL_TEXT, pillState } from './pillState.ts'

const open = (labels: string[], assigned = false) =>
  pillState({ labels, assigned, state: 'OPEN' })

describe('pillState', () => {
  it('reads needs-triage as queued until someone is assigned, then triaging', () => {
    expect(open(['needs-triage', 'lane:implement'])).toBe('queued')
    expect(open(['needs-triage', 'lane:implement'], true)).toBe('triaging')
  })

  it.each(['planning', 'in-progress', 'ai-review'])(
    'reads %s as building',
    (label) => {
      expect(open([label, 'lane:implement'])).toBe('building')
    },
  )

  it('reads human-review as PR open and plan-review as waiting for approval', () => {
    expect(open(['human-review'])).toBe('pr-open')
    expect(open(['plan-review'])).toBe('waiting-approval')
  })

  it.each(['needs-info', 'wontfix'])('reads %s as declined', (label) => {
    expect(open([label, 'lane:implement'])).toBe('declined')
  })

  it('reads shipped as shipped, open or closed', () => {
    expect(open(['shipped'])).toBe('shipped')
    expect(
      pillState({ labels: ['shipped'], assigned: true, state: 'CLOSED' }),
    ).toBe('shipped')
  })

  it('falls back to queued for an unknown label set', () => {
    expect(open(['lane:implement', 'size:small'])).toBe('queued')
    expect(open([])).toBe('queued')
  })

  it('shows nothing for a closed request that did not ship', () => {
    expect(
      pillState({ labels: ['needs-triage'], assigned: false, state: 'CLOSED' }),
    ).toBe('none')
  })

  it('applies the priority order when several labels apply', () => {
    expect(
      open([
        'needs-triage',
        'planning',
        'human-review',
        'plan-review',
        'wontfix',
        'shipped',
      ]),
    ).toBe('shipped')
    expect(
      open([
        'needs-triage',
        'planning',
        'human-review',
        'plan-review',
        'needs-info',
      ]),
    ).toBe('declined')
    expect(
      open(['needs-triage', 'planning', 'human-review', 'plan-review']),
    ).toBe('waiting-approval')
    expect(open(['needs-triage', 'in-progress', 'human-review'], true)).toBe(
      'pr-open',
    )
    expect(open(['needs-triage', 'ai-review'], true)).toBe('building')
  })

  it('names every state the way CONTEXT.md does', () => {
    expect(PILL_TEXT).toEqual({
      queued: 'queued',
      triaging: 'triage',
      building: 'building',
      'pr-open': 'PR open',
      'waiting-approval': 'waiting for approval',
      shipped: 'shipped',
      declined: 'declined',
    })
  })
})
