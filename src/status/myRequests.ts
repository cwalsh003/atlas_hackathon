// Requests filed from this browser, remembered so their status pills come
// back after a reload. Demo-only: reached through the status store and edit mode.

const STORAGE_KEY = 'asd.myRequests'
// Matches the status endpoint's per-call id cap.
const MAX_REMEMBERED = 20

export function readMyRequests(): number[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]',
    ) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (n): n is number => Number.isInteger(n) && (n as number) > 0,
    )
  } catch {
    return []
  }
}

export function rememberRequest(issueNumber: number): void {
  if (typeof window === 'undefined') return
  const ids = readMyRequests()
  if (ids.includes(issueNumber)) return
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...ids, issueNumber].slice(-MAX_REMEMBERED)),
  )
}
