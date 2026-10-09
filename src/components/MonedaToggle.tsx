import { setMoneda, useMoneda, type Moneda } from '../lib/moneda'
import { formatNumero } from '../lib/format'

/** Selector pesos / dólares (oficial vendedor, vía dolarapi.com). */
export function MonedaToggle({ className = '' }: { className?: string }) {
  const { moneda, tc } = useMoneda()
  const fecha = new Date(tc.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  const titulo = `Dólar oficial vendedor: $${formatNumero(tc.venta)}${tc.enVivo ? ` (al ${fecha})` : ' (valor de respaldo)'}`
  const opciones: { id: Moneda; label: string }[] = [
    { id: 'ARS', label: '$' },
    { id: 'USD', label: 'US$' },
  ]
  return (
    <div
      role="radiogroup"
      aria-label="Moneda de los montos"
      title={titulo}
      className={`inline-flex shrink-0 rounded-full glass-chip p-0.5 text-xs font-display font-700 ${className}`}
    >
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={moneda === o.id}
          onClick={() => setMoneda(o.id)}
          className={`rounded-full px-2.5 py-1 transition-colors ${
            moneda === o.id ? 'bg-upl-amarillo text-upl-principal' : 'text-upl-crema/70 hover:text-upl-crema'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
