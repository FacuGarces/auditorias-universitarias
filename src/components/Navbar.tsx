import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-full font-display font-600 text-sm transition-colors ${
    isActive ? 'bg-upl-amarillo text-upl-principal' : 'text-upl-crema hover:bg-upl-principal-light'
  }`

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 bg-upl-principal border-b border-upl-secundario/60">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3 gap-4">
        <NavLink to="/" className="flex items-center gap-3 shrink-0">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="UPL" className="h-10 w-10 rounded-md object-cover" />
          <div className="leading-tight">
            <div className="font-display font-800 text-upl-crema text-lg">Auditorías Universitarias</div>
            <div className="text-[11px] text-upl-resaltador tracking-wide">Universitarios por la Libertad</div>
          </div>
        </NavLink>
        <nav className="flex gap-2">
          <NavLink to="/" end className={linkClass}>Mapa</NavLink>
          <NavLink to="/ranking" className={linkClass}>Rankings</NavLink>
        </nav>
      </div>
    </header>
  )
}
