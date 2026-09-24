import {
  createContext,
  use,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { rememberRequest } from '../status/myRequests'

type EditMode = {
  enabled: boolean
  toggle: () => void
  isPhone: boolean
  targeted: Record<string, number>
  markTargeted: (regionId: string, issueNumber: number) => void
}

// Matches the phone breakpoint in index.css.
const PHONE_QUERY = '(max-width: 720px)'

const EditModeContext = /* @__PURE__ */ createContext<EditMode | null>(null)

function subscribeToPhone(onChange: () => void) {
  const query = window.matchMedia(PHONE_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [targeted, setTargeted] = useState<Record<string, number>>({})
  const isPhone = useSyncExternalStore(
    subscribeToPhone,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  )

  return (
    <EditModeContext
      value={{
        enabled,
        toggle: () => setEnabled((on) => !on),
        isPhone,
        targeted,
        markTargeted: (regionId, issueNumber) => {
          rememberRequest(issueNumber)
          setTargeted((prev) => ({ ...prev, [regionId]: issueNumber }))
        },
      }}
    >
      {children}
    </EditModeContext>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useEditMode(): EditMode {
  const editMode = use(EditModeContext)
  if (!editMode) throw new Error('useEditMode needs an EditModeProvider')
  return editMode
}
