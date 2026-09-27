import { useMemo, useState } from 'react'
import mapaEstatico from '../data/mapa-estatico.json'
import type { UniversidadMapa } from '../types'
import { ubicacion } from '../lib/format'

const PROVINCIA_ALIAS: Record<string, string> = {
  'Ciudad Autónoma de Buenos Aires': 'Capital Federal',
}

function normalizar(nombre: string) {
  return (PROVINCIA_ALIAS[nombre] ?? nombre).trim().toLowerCase()
}

interface Props {
  onSelectUniversidad: (u: UniversidadMapa) => void
}

const { viewBox, provincias, pines } = mapaEstatico as {
  viewBox: string
  width: number
  height: number
  provincias: { nombre: string; d: string }[]
  pines: (UniversidadMapa & { x: number; y: number })[]
}

export function MapaArgentina({ onSelectUniversidad }: Props) {
  const [provinciaActiva, setProvinciaActiva] = useState<string | null>(null)
  const [hover, setHover] = useState<UniversidadMapa | null>(null)

  const pinesVisibles = useMemo(() => {
    if (!provinciaActiva) return pines
    return pines.filter((u) => normalizar(u.provincia) === normalizar(provinciaActiva))
  }, [provinciaActiva])

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="text-sm">
          {provinciaActiva ? (
            <button
              onClick={() => setProvinciaActiva(null)}
              className="inline-flex items-center gap-2 rounded-full bg-upl-principal-light px-4 py-1.5 font-semibold text-upl-crema hover:bg-upl-resaltador hover:text-upl-principal transition-colors"
            >
              ← Ver todo el país
            </button>
          ) : (
            <span className="text-upl-principal/70">Hacé clic en una provincia para ver sus sedes universitarias.</span>
          )}
        </div>
        {provinciaActiva && (
          <span className="font-display text-lg font-700 text-upl-principal">{provinciaActiva}</span>
        )}
      </div>

      <div className="rounded-2xl bg-upl-principal p-2 sm:p-4 shadow-xl">
        <svg viewBox={viewBox} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {provincias.map((p) => {
            const activa = provinciaActiva && normalizar(p.nombre) === normalizar(provinciaActiva)
            return (
              <path
                key={p.nombre}
                d={p.d}
                fill={activa ? '#facf3b' : '#4a5580'}
                stroke="#fffff9"
                strokeWidth={0.8}
                style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
                onClick={() => setProvinciaActiva(activa ? null : p.nombre)}
                onMouseEnter={(e) => {
                  if (!activa) (e.currentTarget as SVGPathElement).setAttribute('fill', '#e4b862')
                }}
                onMouseLeave={(e) => {
                  if (!activa) (e.currentTarget as SVGPathElement).setAttribute('fill', '#4a5580')
                }}
              />
            )
          })}

          {pinesVisibles.map((u) => (
            <circle
              key={u.id}
              cx={u.x}
              cy={u.y}
              r={provinciaActiva ? 6 : 3.4}
              className={`pin ${!u.tieneFicha ? 'pin-no-data' : ''}`}
              onClick={() => onSelectUniversidad(u)}
              onMouseEnter={() => setHover(u)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
      </div>

      {hover && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-upl-principal text-upl-crema text-xs sm:text-sm px-3 py-2 shadow-lg max-w-[240px]">
          <div className="font-semibold">{hover.sigla}</div>
          <div className="opacity-80">
            {ubicacion(hover.ciudad, hover.provincia)}
          </div>
          {!hover.tieneFicha && <div className="mt-1 text-upl-amarillo">Sin ficha de datos aún</div>}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-upl-principal/70">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-upl-amarillo border border-upl-principal" /> Con
          ficha de datos
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-upl-amarillo" /> Sin
          datos reportados
        </div>
      </div>
    </div>
  )
}
