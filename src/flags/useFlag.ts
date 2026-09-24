import { useSyncExternalStore } from 'react'
import { isDemoMode } from '../demoMode.ts'
import { getSnapshot, subscribe } from './flagStore.ts'
import { isFlagOn } from './isFlagOn.ts'

/**
 * How to wrap a change for a request: import `useFlag` from this module,
 * call `const on = useFlag('req-<issue-number>')` with the request's own
 * issue number, and render the prior branch when `on` is false and the new
 * branch when `on` is true — never touch any other flag's id while doing so,
 * and never add a flags registry file (ADR 0001); the shipped set and any
 * viewer override already resolve `on` for you.
 */
export function useFlag(id: string): boolean {
  const { shipped, overrides } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  )
  return isFlagOn(id, shipped, overrides, isDemoMode)
}
