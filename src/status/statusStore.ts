import { useSyncExternalStore } from 'react'
import { isDemoMode } from '../demoMode.ts'
import { setShipped } from '../flags/flagStore.ts'
import { readMyRequests } from './myRequests.ts'
import type { PillState, RequestStatus } from './pillState.ts'

const POLL_MS = 5000
const NONE: readonly RequestStatus[] = []

let requests = NONE
let lastBody = '[]'
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
    const body = JSON.stringify(data.requests)
    if (body === lastBody) return
    lastBody = body
    requests = data.requests
    for (const listener of listeners) listener()
  } catch {
    // Keep the last known board until the next poll succeeds.
  }
}

/** Subscribes to board changes; fetches and starts polling on the first subscriber, in demo mode only. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (isDemoMode && typeof window !== 'undefined' && listeners.size === 1) {
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

export type PillRequest = {
  number: number
  state: Exclude<PillState, 'none'>
  url?: string
  comment?: string
}

/**
 * The request a region's status pill shows: the highest-numbered one on the
 * board, or a just-filed `targetedIssue` as queued until the poll reports it.
 */
export function regionRequest(
  board: readonly RequestStatus[],
  regionId: string,
  targetedIssue?: number,
): PillRequest | undefined {
  let best: RequestStatus | undefined
  for (const request of board) {
    if (request.regionId === regionId && request.number > (best?.number ?? 0))
      best = request
  }
  if (targetedIssue !== undefined && targetedIssue > (best?.number ?? 0))
    return { number: targetedIssue, state: 'queued' }
  return best
}

export function useRegionRequest(
  regionId: string,
  targetedIssue?: number,
): PillRequest | undefined {
  const board = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return regionRequest(board, regionId, targetedIssue)
}
