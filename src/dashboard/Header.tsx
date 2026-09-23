import { Region } from './Region'

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
    </Region>
  )
}
