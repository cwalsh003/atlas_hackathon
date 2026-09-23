// PROTOTYPE, throwaway. Floating variant switcher + demo-state controls. Hidden in production builds.
import { useEffect } from 'react'
import { requestStates, type RequestState } from './data'

type Props = {
  variants: { key: string; name: string }[]
  current: string
  onChange: (key: string) => void
  edit: boolean
  onEdit: (v: boolean) => void
  state: RequestState
  onState: (s: RequestState) => void
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
  edit,
  onEdit,
  state,
  onState,
}: Props) {
  const i = variants.findIndex((v) => v.key === current)
  const go = (d: number) =>
    onChange(variants[(i + d + variants.length) % variants.length].key)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })
  if (import.meta.env.PROD) return null
  return (
    <div className="proto-bar">
      <button onClick={() => go(-1)}>←</button>
      <strong>
        {current} ({variants[i]?.name})
      </strong>
      <button onClick={() => go(1)}>→</button>
      <span className="proto-sep" />
      <label>
        <input
          type="checkbox"
          checked={edit}
          onChange={(e) => onEdit(e.target.checked)}
        />{' '}
        edit mode
      </label>
      <label>
        request state
        <select
          value={state}
          onChange={(e) => onState(e.target.value as RequestState)}
        >
          {requestStates.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
