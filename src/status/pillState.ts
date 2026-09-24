// Label-to-state mapping for the status pill. Pure: the status endpoint runs
// it on the server, so it must stay free of browser and React imports.

export type PillState =
  | 'queued'
  | 'triaging'
  | 'building'
  | 'pr-open'
  | 'waiting-approval'
  | 'shipped'
  | 'declined'
  | 'none'

export const PILL_TEXT: Record<Exclude<PillState, 'none'>, string> = {
  queued: 'queued',
  triaging: 'triage',
  building: 'building',
  'pr-open': 'PR open',
  'waiting-approval': 'waiting for approval',
  shipped: 'shipped',
  declined: 'declined',
}

export function pillState({
  labels,
  assigned,
  state,
}: {
  labels: string[]
  assigned: boolean
  state: 'OPEN' | 'CLOSED'
}): PillState {
  const has = (...names: string[]) => names.some((n) => labels.includes(n))
  if (has('shipped')) return 'shipped'
  if (state === 'CLOSED') return 'none'
  if (has('needs-info', 'wontfix')) return 'declined'
  if (has('plan-review')) return 'waiting-approval'
  if (has('human-review')) return 'pr-open'
  if (has('planning', 'in-progress', 'ai-review')) return 'building'
  if (has('needs-triage') && assigned) return 'triaging'
  return 'queued'
}

/** One request on the board, as `/api/requests/status` returns it. */
export type RequestStatus = {
  number: number
  regionId: string
  state: Exclude<PillState, 'none'>
  url: string
  assigned: boolean
  comment?: string
}
