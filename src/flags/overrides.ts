// Viewer-local flag overrides. Demo-only because flagStore reaches this module
// only inside its `isDemoMode` branch. A `?flag=req-100` query param turns a
// flag on for this viewer; `?unflag=req-100` turns it off. Both persist to
// localStorage so the choice survives a reload.

const STORAGE_KEY = 'asd.flagOverrides'

function readStored(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function writeStored(ids: ReadonlySet<string>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
}

function applyQueryParams(ids: ReadonlySet<string>): Set<string> {
  if (typeof window === 'undefined') return new Set(ids)
  const params = new URLSearchParams(window.location.search)
  const next = new Set(ids)
  for (const id of params.getAll('flag')) next.add(id)
  for (const id of params.getAll('unflag')) next.delete(id)
  return next
}

/** Reads viewer overrides, applying and persisting any `?flag=`/`?unflag=` query params. */
export function readOverrides(): Set<string> {
  const next = applyQueryParams(readStored())
  writeStored(next)
  return next
}
