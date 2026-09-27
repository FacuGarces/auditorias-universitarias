import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import mapaEstatico from '../data/mapa-estatico.json'
import { ubicacion } from '../lib/format'
import { UniversidadBadge } from '../components/UniversidadBadge'
import type { UniversidadMapa } from '../types'

const PROVINCIA_ALIAS: Record<string, string> = {
  'Ciudad Autónoma de Buenos Aires': 'Capital Federal',
}
function normalizar(nombre: string) {
  return (PROVINCIA_ALIAS[nombre] ?? nombre).trim().toLowerCase()
}

const { viewBox, width, height, provincias, pines } = mapaEstatico as {
  viewBox: string
  width: number
  height: number
  provincias: { nombre: string; d: string; bbox: [number, number, number, number] }[]
  pines: (UniversidadMapa & { x: number; y: number })[]
}

const BASE_FILL = '#4a5580'

export function Home() {
  const [activa, setActiva] = useState<(typeof provincias)[number] | null>(null)
  const [hover, setHover] = useState<UniversidadMapa | null>(null)
  const navigate = useNavigate()

  const matrix = useMemo(() => {
    if (!activa) return { s: 1, tx: 0, ty: 0 }
    const [x0, y0, x1, y1] = activa.bbox
    const bw = x1 - x0
    const bh = y1 - y0
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const s = Math.min((width * 0.8) / bw, (height * 0.56) / bh, 7)
    const tx = width / 2 - s * cx
    const ty = height * 0.38 - s * cy
    return { s, tx, ty }
  }, [activa])

  const pinesVisibles = useMemo(() => {
    if (!activa) return pines
    return pines.filter((u) => normalizar(u.provincia) === normalizar(activa.nombre))
  }, [activa])

  function handleSelectPin(u: UniversidadMapa) {
    if (u.tieneFicha) navigate(`/universidad/${u.id}`)
  }

  function handleProvinciaClick(p: (typeof provincias)[number]) {
    setActiva((cur) => (cur?.nombre === p.nombre ? null : p))
  }

  return (
    <div className="relative">
      {/* Fondo dinámico: mapa a pantalla completa */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="blob w-[38rem] h-[38rem] bg-upl-secundario/50 -top-40 -left-40" />
        <div className="blob w-[30rem] h-[30rem] bg-upl-resaltador/20 bottom-0 right-0" style={{ animationDelay: '4s' }} />

        <div className="absolute inset-0 flex items-center justify-center px-3 pt-24 pb-6">
          <svg viewBox={viewBox} className="w-full h-full max-w-5xl" style={{ overflow: 'visible' }}>
            {/* Capa base: mismo color, sin fisuras entre provincias */}
            <g style={{ transform: `matrix(${matrix.s},0,0,${matrix.s},${matrix.tx},${matrix.ty})`, transition: 'transform 0.85s cubic-bezier(0.16,1,0.3,1)' }}>
              {provincias.map((p) => (
                <path key={`base-${p.nombre}`} d={p.d} fill={BASE_FILL} stroke={BASE_FILL} strokeWidth={3} strokeLinejoin="round" />
              ))}
              {provincias.map((p) => {
                const esActiva = activa?.nombre === p.nombre
                return (
                  <path
                    key={p.nombre}
                    d={p.d}
                    className="province-shape"
                    fill={esActiva ? '#facf3b' : BASE_FILL}
                    stroke="rgba(255,255,249,0.65)"
                    strokeWidth={0.8 / Math.max(matrix.s, 1)}
                    onClick={() => handleProvinciaClick(p)}
                    onMouseEnter={(e) => {
                      if (!esActiva) (e.currentTarget as SVGPathElement).setAttribute('fill', '#6a76a8')
                    }}
                    onMouseLeave={(e) => {
                      if (!esActiva) (e.currentTarget as SVGPathElement).setAttribute('fill', BASE_FILL)
                    }}
                  />
                )
              })}
            </g>

            {/* Pines: capa sin transformar, para que no escalen con el zoom */}
            {pinesVisibles.map((u) => {
              const cx = matrix.s * u.x + matrix.tx
              const cy = matrix.s * u.y + matrix.ty
              return (
                <circle
                  key={u.id}
                  cx={cx}
                  cy={cy}
                  r={activa ? 6.5 : 3.4}
                  className={`pin ${!u.tieneFicha ? 'pin-no-data' : ''}`}
                  style={{ transition: 'cx 0.85s cubic-bezier(0.16,1,0.3,1), cy 0.85s cubic-bezier(0.16,1,0.3,1), r 0.3s ease' }}
                  onClick={() => handleSelectPin(u)}
                  onMouseEnter={() => setHover(u)}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </svg>
        </div>
      </div>

      {/* Header flotante */}
      <header className="fixed top-0 inset-x-0 z-20 flex justify-center pt-4 px-3">
        <div className="glass-strong rounded-2xl px-5 py-3 max-w-2xl w-full flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="UPL" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display font-800 text-lg text-upl-crema leading-tight">Auditorías Universitarias</h1>
            <p className="text-xs text-upl-resaltador truncate">Universitarios por la Libertad</p>
          </div>
          <Link
            to="/ranking"
            className="shrink-0 rounded-full bg-upl-amarillo text-upl-principal font-display font-600 text-sm px-4 py-2 hover:bg-upl-resaltador transition-colors"
          >
            Rankings
          </Link>
        </div>
      </header>

      {/* Leyenda + instrucciones flotante */}
      <div className="fixed left-3 bottom-3 z-20 glass rounded-xl px-4 py-3 text-xs text-upl-crema/80 max-w-[220px]">
        {!activa && <p className="mb-2">Hacé clic en una provincia para explorar sus sedes.</p>}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-upl-amarillo border border-upl-principal" /> Con ficha de datos
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-upl-amarillo" /> Sin datos reportados
          </div>
        </div>
      </div>

      {hover && (
        <div className="pointer-events-none fixed right-3 bottom-3 z-20 glass rounded-xl px-4 py-2.5 text-xs sm:text-sm max-w-[240px]">
          <div className="font-semibold text-upl-crema">{hover.sigla}</div>
          <div className="text-upl-crema/70">{ubicacion(hover.ciudad, hover.provincia)}</div>
          {!hover.tieneFicha && <div className="mt-1 text-upl-amarillo">Sin ficha de datos aún</div>}
        </div>
      )}

      {/* Panel de la provincia activa */}
      {activa && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3">
          <div className="glass-strong rounded-2xl w-full max-w-2xl max-h-[42vh] overflow-y-auto">
            <div className="sticky top-0 glass-strong flex items-center justify-between px-5 py-3 border-b border-upl-crema/10">
              <h2 className="font-display font-700 text-lg text-upl-crema">{activa.nombre}</h2>
              <button
                onClick={() => setActiva(null)}
                className="rounded-full bg-upl-amarillo text-upl-principal text-xs font-semibold px-3 py-1.5 hover:bg-upl-resaltador transition-colors"
              >
                ← Ver todo el país
              </button>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {pinesVisibles.length === 0 && (
                <p className="text-upl-crema/60 text-sm px-2 py-3">No relevamos sedes universitarias nacionales en esta provincia todavía.</p>
              )}
              {pinesVisibles.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectPin(u)}
                  disabled={!u.tieneFicha}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    u.tieneFicha ? 'hover:bg-upl-amarillo/15 cursor-pointer' : 'opacity-50 cursor-default'
                  }`}
                >
                  <UniversidadBadge sigla={u.sigla} size="sm" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-upl-crema truncate">{u.nombre}</div>
                    <div className="text-xs text-upl-crema/60 truncate">
                      {ubicacion(u.ciudad, u.provincia)}
                      {!u.tieneFicha && ' · sin ficha aún'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
