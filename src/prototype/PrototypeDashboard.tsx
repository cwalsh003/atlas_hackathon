// PROTOTYPE, throwaway.
// Three variants of the dashboard + edit mode, switchable via ?variant=, on the existing / route.
// Question: what should edit mode (pens, prompt, lane choice, status pill) look like, and what
// dashboard layout reads as a real client deliverable? A also has pens always visible; B uses hover;
// C makes the whole region the tap target (phone-first).
import { useState } from 'react'
import { PrototypeSwitcher } from './PrototypeSwitcher'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'
import type { RequestState } from './data'
import './prototype.css'

const variants = [
  { key: 'A', name: 'Ops board, pens always on' },
  { key: 'B', name: 'Dispatch sheet, hover + drawer' },
  { key: 'C', name: 'Phone-first tiles, tap region' },
]

export type VariantProps = {
  edit: boolean
  state: RequestState
  target: string | null
  onPick: (regionId: string | null) => void
}

export function PrototypeDashboard() {
  const [variant, setVariantState] = useState(
    () =>
      new URLSearchParams(globalThis.location?.search).get('variant') ?? 'A',
  )
  const [edit, setEdit] = useState(true)
  const [state, setState] = useState<RequestState>('none')
  const [target, setTarget] = useState<string | null>(null)
  const setVariant = (k: string) => {
    const u = new URL(location.href)
    u.searchParams.set('variant', k)
    history.replaceState(null, '', u)
    setVariantState(k)
    setTarget(null)
  }
  const props: VariantProps = { edit, state, target, onPick: setTarget }
  return (
    <>
      {variant === 'A' && <VariantA {...props} />}
      {variant === 'B' && <VariantB {...props} />}
      {variant === 'C' && <VariantC {...props} />}
      <PrototypeSwitcher
        variants={variants}
        current={variant}
        onChange={setVariant}
        edit={edit}
        onEdit={setEdit}
        state={state}
        onState={setState}
      />
    </>
  )
}
