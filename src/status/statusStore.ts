import { useSyncExternalStore } from 'react'
import { isDemoMode } from '../demoMode.ts'
import { markExternalFeed, setShipped } from '../flags/flagStore.ts'
import { readMyRequests } from './myRequests.ts'
import type { PillState, RequestStatus } from './pillState.ts'

const POLL_MS = 5000
const NONE: readonly RequestStatus[] = []

let requests = NONE
let lastBody = '[]'
let pollCount = 0
const listeners = new Set<() => void>()
let pollHandle: ReturnType<typeof setInterval> | undefined

async function poll(): Promise<void> {
  try {
    const res = await fetch(
      `/api/requests/status?ids=${readMyRequests().join(',')}`,
    )
    if (!res.ok) return
    const data = (await res.json()) as {
      requests: RequestStatus[]
      shipped: number[]
    }
    // The flag hook reads the shipped set from this same poll.
    setShipped(new Set(data.shipped.map((n) => `req-${n}`)))
    pollCount += 1
    const body = JSON.stringify(data.requests)
    if (body !== lastBody) {
      lastBody = body
      requests = data.requests
    }
    // Every poll notifies: optimistic pills expire by poll count, not board change.
    for (const listener of listeners) listener()
  } catch {
    // Keep the last known board until the next poll succeeds.
  }
}

/** Subscribes to board changes; fetches and starts polling on the first subscriber, in demo mode only. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (isDemoMode && typeof window !== 'undefined' && listeners.size === 1) {
    markExternalFeed()
    void poll()
    pollHandle = setInterval(() => void poll(), POLL_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && pollHandle !== undefined) {
      clearInterval(pollHandle)
      pollHandle = undefined
    }
  }
}

export function getSnapshot(): readonly RequestStatus[] {
  return requests
}

export function getServerSnapshot(): readonly RequestStatus[] {
  return NONE
}

/** Successful polls so far; a just-filed request is stamped with it. */
export function getPollCount(): number {
  return pollCount
}

/** A request filed from this browser, stamped with the poll count at filing. */
export type TargetedRequest = { issue: number; pollCount: number }

export type PillRequest = {
  number: number
  state: Exclude<PillState, 'none'>
  url?: string
  comment?: string
}

/**
 * The request a region's status pill shows: the highest-numbered one on the
 * board, or a just-filed `targeted` request as queued until the poll reports
 * it. The first poll after filing may predate the issue, so the optimistic
 * pill lasts through it and ends one poll later.
 */
export function regionRequest(
  board: readonly RequestStatus[],
  regionId: string,
  targeted: TargetedRequest | undefined,
  polls: number,
): PillRequest | undefined {
  let best: RequestStatus | undefined
  for (const request of board) {
    if (request.regionId === regionId && request.number > (best?.number ?? 0))
      best = request
  }
  if (
    targeted &&
    polls <= targeted.pollCount + 1 &&
    targeted.issue > (best?.number ?? 0)
  )
    return { number: targeted.issue, state: 'queued' }
  return best
}

export function useRegionRequest(
  regionId: string,
  targeted?: TargetedRequest,
): PillRequest | undefined {
  const board = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // Clamped so a region re-renders for poll counts only until its optimistic pill expires.
  const polls = useSyncExternalStore(
    subscribe,
    () => (targeted ? Math.min(pollCount, targeted.pollCount + 2) : 0),
    () => 0,
  )
  return regionRequest(board, regionId, targeted, polls)
}
