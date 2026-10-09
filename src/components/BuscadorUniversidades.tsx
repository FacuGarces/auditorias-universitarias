import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { rutaUniversidad } from '../lib/rutas'
import { mapaUniversidades } from '../data/mapaUniversidades'
import { ubicacion } from '../lib/format'
import { UniversidadBadge } from './UniversidadBadge'

function normalizar(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Buscador de universidades en un panel modal. Pensado sobre todo para celular, donde tocar una
 * provincia chica (Tucumán, CABA) o un punto del mapa es difícil: acá se llega a cualquier ficha
 * escribiendo nombre, sigla, ciudad o provincia.
 */
export function BuscadorUniversidades({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const [texto, setTexto] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // El texto se limpia al cerrar (no al abrir), así la próxima vez arranca vacío.
  const cerrar = useCallback(() => {
    setTexto('')
    onCerrar()
  }, [onCerrar])

  useEffect(() => {
    if (!abierto) return
    const t = setTimeout(() => input.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [abierto, cerrar])

  const resultados = useMemo(() => {
    const q = normalizar(texto.trim())
    const todas = [...mapaUniversidades].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    if (!q) return todas
    return todas.filter((u) => normalizar(`${u.nombre} ${u.sigla} ${u.ciudad} ${u.provincia}`).includes(q))
  }, [texto])

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:pt-[12vh] bg-[#0b0d1c]/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cerrar}
        >
          <motion.div
            role="dialog"
            aria-label="Buscar universidad"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg max-h-[82vh] sm:max-h-[70vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#1b2142] border border-upl-crema/15 shadow-[0_20px_60px_rgba(5,4,20,0.6)]"
          >
            <div className="flex items-center gap-2 p-3 border-b border-upl-crema/10">
              <div className="flex-1 flex items-center gap-2 rounded-2xl bg-upl-crema/8 px-3 py-2.5">
                <svg viewBox="0 0 20 20" className="w-4 h-4 text-upl-crema/50 shrink-0" fill="currentColor" aria-hidden>
                  <path d="M8.5 2a6.5 6.5 0 0 1 5.2 10.4l3.9 3.9a.9.9 0 1 1-1.3 1.3l-3.9-3.9A6.5 6.5 0 1 1 8.5 2Zm0 1.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Z" />
                </svg>
                <input
                  ref={input}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Nombre, sigla o ciudad"
                  className="flex-1 min-w-0 bg-transparent text-base text-upl-crema placeholder:text-upl-crema/40 outline-none"
                />
              </div>
              <button onClick={cerrar} className="shrink-0 rounded-full px-3 py-2 text-sm text-upl-crema/70 hover:text-upl-amarillo">
                Cerrar
              </button>
            </div>
            <ul className="overflow-y-auto p-2 flex flex-col gap-1">
              {resultados.length === 0 && <li className="px-3 py-6 text-center text-sm text-upl-crema/50">Sin resultados.</li>}
              {resultados.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => navigate(rutaUniversidad(u.id))}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-upl-amarillo/15 active:bg-upl-amarillo/15 transition-colors"
                  >
                    <UniversidadBadge sigla={u.sigla} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-upl-crema truncate">{u.nombre}</div>
                      <div className="text-xs text-upl-crema/55 truncate">{ubicacion(u.ciudad, u.provincia)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
