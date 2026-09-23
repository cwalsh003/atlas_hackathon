import { isDemoMode } from '../demoMode.ts'
import { readOverrides } from './overrides.ts'

const POLL_MS = 5000

type FlagState = {
  shipped: ReadonlySet<string>
  overrides: ReadonlySet<string>
}

let state: FlagState = { shipped: new Set(), overrides: new Set() }
const listeners = new Set<() => void>()
let pollHandle: ReturnType<typeof setInterval> | undefined

function setState(next: FlagState): void {
  state = next
  for (const listener of listeners) listener()
}

/** Replaces the shipped set and notifies subscribers; exported so another poll can feed it. */
export function setShipped(shipped: ReadonlySet<string>): void {
  if (sameSet(shipped, state.shipped)) return
  setState({ ...state, shipped })
}

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const id of a) if (!b.has(id)) return false
  return true
}

async function pollShipped(): Promise<void> {
  try {
    const res = await fetch('/api/flags')
    if (!res.ok) return
    const data = (await res.json()) as { shipped: number[] }
    setShipped(new Set(data.shipped.map((n) => `req-${n}`)))
  } catch {
    // Leave the last known shipped set in place until the next poll succeeds.
  }
}

function startPolling(): void {
  state = { ...state, overrides: readOverrides() }
  void pollShipped()
  pollHandle = setInterval(() => void pollShipped(), POLL_MS)
}

function stopPolling(): void {
  if (pollHandle === undefined) return
  clearInterval(pollHandle)
  pollHandle = undefined
}

/** Subscribes to store changes; fetches and starts polling on the first subscriber, in demo mode only. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (isDemoMode && typeof window !== 'undefined' && listeners.size === 1) {
    startPolling()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stopPolling()
  }
}

export function getSnapshot(): FlagState {
  return state
}
