import { isDemoMode } from '../demoMode'
import { useEditMode } from '../edit/EditModeContext'
import { Region } from './Region'

function EditToggle() {
  const { enabled, toggle } = useEditMode()
  return (
    <button
      type="button"
      data-demo
      className="edit-toggle"
      aria-pressed={enabled}
      onClick={toggle}
    >
      Edit mode
    </button>
  )
}

export function Header() {
  const today = new Date().toLocaleDateString()

  return (
    <Region id="header" as="header" className="header">
      <span className="header__brand">Abominable Snow Services</span>
      <nav className="header__nav">
        <span>Dispatch</span>
        <span>Yetis</span>
        <span>Reports</span>
      </nav>
      <span className="header__date">{today}</span>
      {isDemoMode && <EditToggle />}
    </Region>
  )
}
