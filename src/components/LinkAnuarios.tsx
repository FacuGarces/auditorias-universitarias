import { ENLACES } from '../lib/rutas'

/** Link a la página oficial de los Anuarios de Estadísticas Universitarias (SPU), en otra pestaña. */
export function LinkAnuarios({ children = 'Anuarios de Estadísticas Universitarias', className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <a
      href={ENLACES.anuarios}
      target="_blank"
      rel="noreferrer"
      className={`underline decoration-dotted underline-offset-2 hover:text-upl-amarillo ${className}`}
    >
      {children}
      <span aria-hidden> ↗</span>
    </a>
  )
}
