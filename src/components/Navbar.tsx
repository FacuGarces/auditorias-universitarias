import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-2.5 sm:px-4 py-2 rounded-full font-display font-600 text-xs sm:text-sm whitespace-nowrap transition-colors ${
    isActive ? 'bg-upl-amarillo text-upl-principal' : 'text-upl-crema hover:bg-upl-crema/10'
  }`

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 glass-strong border-b-0">
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between px-3 sm:px-4 py-3 gap-x-3 gap-y-2">
        <NavLink to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="UPL" className="h-9 w-9 sm:h-10 sm:w-10 rounded-md object-cover shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="font-display font-800 text-upl-crema text-sm sm:text-lg truncate">Auditorías Universitarias</div>
            <div className="hidden sm:block text-[11px] text-upl-resaltador tracking-wide">Universitarios por la Libertad</div>
          </div>
        </NavLink>
        <nav className="flex gap-1.5 sm:gap-2 shrink-0">
          <NavLink to="/" end className={linkClass}>Mapa</NavLink>
          <NavLink to="/ranking" className={linkClass}>Rankings</NavLink>
          <NavLink to="/kirchneristas" className={linkClass}>Universidades K</NavLink>
        </nav>
      </div>
    </header>
  )
}
