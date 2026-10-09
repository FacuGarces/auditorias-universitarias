import { NavLink } from 'react-router-dom'
import { motion } from 'motion/react'
import { MonedaToggle } from './MonedaToggle'
import { useVolver } from '../lib/volver'

function NavItem({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className="relative px-2.5 sm:px-4 py-2 rounded-full font-display font-600 text-xs sm:text-sm whitespace-nowrap"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="navbar-pill"
              className="absolute inset-0 rounded-full bg-upl-amarillo"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span
            className={`relative transition-colors duration-200 ${
              isActive ? 'text-upl-principal' : 'text-upl-crema hover:text-upl-amarillo'
            }`}
          >
            {children}
          </span>
        </>
      )}
    </NavLink>
  )
}

export function Navbar() {
  const volver = useVolver()
  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-30 glass-strong border-b-0"
    >
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between px-3 sm:px-4 py-3 gap-x-3 gap-y-2">
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
        {/* En celular no hay barra del navegador a mano: botón propio para volver a la pantalla anterior. */}
        <button
          type="button"
          onClick={volver}
          aria-label="Volver"
          className="sm:hidden shrink-0 w-9 h-9 rounded-full glass-chip text-upl-crema text-lg leading-none flex items-center justify-center active:bg-upl-crema/15"
        >
          ‹
        </button>
        <NavLink to="/" className="flex items-center gap-2 sm:gap-3 min-w-0 group">
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt="UPL"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-md object-cover shrink-0"
          />
          <div className="leading-tight min-w-0">
            <div className="font-display font-800 text-upl-crema text-sm sm:text-lg truncate">Auditorías Universitarias</div>
            <div className="hidden sm:block text-[11px] text-upl-resaltador tracking-wide">Universitarios por la Libertad</div>
          </div>
        </NavLink>
        <MonedaToggle className="ml-auto sm:hidden" />
        </div>
        <nav className="flex gap-1.5 sm:gap-2 shrink-0 items-center">
          <NavItem to="/" end>Mapa</NavItem>
          <NavItem to="/ranking">Rankings</NavItem>
          <NavItem to="/kirchneristas">Universidades K</NavItem>
          <NavItem to="/propuestas">Propuestas</NavItem>
          <span className="hidden sm:inline-flex ml-1">
            <MonedaToggle />
          </span>
        </nav>
      </div>
    </motion.header>
  )
}
