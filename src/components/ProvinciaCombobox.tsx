import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { nombreProvincia, provinciasConDatos } from '../lib/provincias'

interface Props {
  value: string | null
  onChange: (provincia: string | null) => void
}

/**
 * Selector de provincia hecho a mano (no un <select> nativo): son 24 opciones, así que va en un
 * popover con lista navegable por teclado, con "Todo el país" y Provincia de Buenos Aires arriba.
 */
export function ProvinciaCombobox({ value, onChange }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const raiz = useRef<HTMLDivElement>(null)
  const listaId = useId()
  const opciones: { provincia: string | null; cantidad: number | null }[] = [
    { provincia: null, cantidad: null },
    ...provinciasConDatos(),
  ]

  useEffect(() => {
    if (!abierto) return
    const cerrar = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [abierto])

  function abrir() {
    setActivo(Math.max(0, opciones.findIndex((o) => o.provincia === value)))
    setAbierto(true)
  }

  function elegir(i: number) {
    onChange(opciones[i].provincia)
    setAbierto(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!abierto) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        abrir()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, opciones.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      elegir(activo)
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div ref={raiz} className="relative z-30 inline-block">
      <button
        type="button"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-haspopup="listbox"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={onKeyDown}
        className="flex items-center gap-2.5 rounded-full glass-chip pl-3 pr-3.5 py-2 text-sm font-display font-600 text-upl-crema hover:bg-upl-crema/15 focus-visible:outline-2 focus-visible:outline-upl-amarillo transition-colors"
      >
        <svg viewBox="0 0 20 20" className="w-4 h-4 text-upl-amarillo shrink-0" fill="currentColor" aria-hidden>
          <path d="M10 1.5a6 6 0 0 0-6 6c0 4.3 5.1 10.2 5.4 10.5a.8.8 0 0 0 1.2 0C10.9 17.7 16 11.8 16 7.5a6 6 0 0 0-6-6Zm0 8.3a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z" />
        </svg>
        <span className="text-upl-crema/55 font-sans font-500 text-xs">Ver:</span>
        <span>{value ? nombreProvincia(value) : 'Todo el país'}</span>
        <motion.svg
          viewBox="0 0 20 20"
          className="w-3.5 h-3.5 text-upl-crema/60"
          fill="currentColor"
          animate={{ rotate: abierto ? 180 : 0 }}
          aria-hidden
        >
          <path d="M5.2 7.5a.8.8 0 0 1 1.1 0L10 11.1l3.7-3.6a.8.8 0 1 1 1.1 1.1l-4.2 4.2a.8.8 0 0 1-1.2 0L5.2 8.6a.8.8 0 0 1 0-1.1Z" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.ul
            id={listaId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-40 w-72 max-h-80 overflow-y-auto rounded-2xl bg-[#1b2142]/[0.97] border border-upl-crema/15 shadow-[0_20px_60px_rgba(5,4,20,0.6)] p-1.5 origin-top-left"
          >
            {opciones.map((o, i) => {
              const seleccionado = o.provincia === value
              return (
                <li
                  key={o.provincia ?? 'todas'}
                  role="option"
                  aria-selected={seleccionado}
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => elegir(i)}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm cursor-pointer transition-colors ${
                    i === activo ? 'bg-upl-crema/10' : ''
                  } ${i === 1 ? 'mb-1' : ''} ${i === 0 ? 'mb-0.5' : ''}`}
                >
                  <span className={seleccionado ? 'text-upl-amarillo font-semibold' : 'text-upl-crema/90'}>
                    {o.provincia ? nombreProvincia(o.provincia) : 'Todo el país'}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {o.cantidad != null && (
                      <span className="text-[11px] text-upl-crema/40">
                        {o.cantidad} {o.cantidad === 1 ? 'univ.' : 'univs.'}
                      </span>
                    )}
                    {seleccionado && <span className="text-upl-amarillo text-xs">✓</span>}
                  </span>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
