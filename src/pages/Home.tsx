import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import mapaEstatico from '../data/mapa-estatico.json'
import { ubicacion } from '../lib/format'
import { UniversidadBadge } from '../components/UniversidadBadge'
import type { UniversidadMapa } from '../types'

// Límites de departamentos/partidos por provincia — se cargan sólo al hacer zoom (code-split).
const departamentosModules = import.meta.glob('../data/departamentos/*.json')

function slug(nombre: string) {
  return nombre
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function cargarDepartamentos(nombreProvincia: string): Promise<string[]> {
  const key = `../data/departamentos/${slug(nombreProvincia)}.json`
  const loader = departamentosModules[key]
  if (!loader) return []
  const mod = (await loader()) as { default: string[] }
  return mod.default
}

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
const CAPITAL = provincias.find((p) => p.nombre === 'Capital Federal') ?? null

type Vista = { k: number; x: number; y: number }
const VISTA_PAIS: Vista = { k: 1, x: 0, y: 0 }
const ZOOM_MIN = 0.8
const ZOOM_MAX = 500

export function Home() {
  const [activa, setActiva] = useState<(typeof provincias)[number] | null>(null)
  const [hover, setHover] = useState<UniversidadMapa | null>(null)
  const [deptoPaths, setDeptoPaths] = useState<string[]>([])
  const [vista, setVista] = useState<Vista>(VISTA_PAIS)
  const [animar, setAnimar] = useState(false)
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const arrastre = useRef<{ x: number; y: number; vx: number; vy: number; movido: boolean } | null>(null)
  const justArrastre = useRef(false)
  const UMBRAL_ARRASTRE = 8 // px de tolerancia antes de considerar que es un arrastre y no un click (trackpads tiemblan)

  // Al elegir una provincia, encuadrarla (con animación); al volver al país, vista fija de origen.
  useEffect(() => {
    setAnimar(true)
    if (!activa) {
      setVista(VISTA_PAIS)
      setDeptoPaths([])
      return
    }
    const [x0, y0, x1, y1] = activa.bbox
    const bw = x1 - x0
    const bh = y1 - y0
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const k = Math.min((width * 0.88) / bw, (height * 0.62) / bh, 60)
    setVista({ k, x: width / 2 - k * cx, y: height * 0.38 - k * cy })

    let vigente = true
    cargarDepartamentos(activa.nombre).then((paths) => {
      if (vigente) setDeptoPaths(paths)
    })
    return () => {
      vigente = false
    }
  }, [activa])

  // Zoom libre con la rueda del mouse, anclado en el punto exacto del cursor (no en un centro fijo).
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    function onWheel(e: WheelEvent) {
      if (!svg) return
      e.preventDefault()
      setAnimar(false)
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const q = pt.matrixTransform(ctm.inverse())
      const factor = e.deltaY < 0 ? 1.22 : 1 / 1.22
      setVista((v) => {
        const k = Math.min(Math.max(v.k * factor, ZOOM_MIN), ZOOM_MAX)
        const f = k / v.k
        return { k, x: q.x * (1 - f) + f * v.x, y: q.y * (1 - f) + f * v.y }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    svgRef.current?.setPointerCapture?.(e.pointerId)
    arrastre.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, movido: false }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const a = arrastre.current
    const svg = svgRef.current
    if (!a || !svg) return
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    if (!a.movido && Math.abs(e.clientX - a.x) < UMBRAL_ARRASTRE && Math.abs(e.clientY - a.y) < UMBRAL_ARRASTRE) return
    if (!a.movido) {
      a.movido = true
      setAnimar(false)
    }
    const dx = (e.clientX - a.x) / ctm.a
    const dy = (e.clientY - a.y) / ctm.d
    setVista((v) => ({ ...v, x: a.vx + dx, y: a.vy + dy }))
  }

  function handlePointerUp() {
    if (arrastre.current?.movido) justArrastre.current = true
    arrastre.current = null
  }

  // Si hubo un arrastre real, cancelamos el click que caería sobre lo que quede debajo del cursor
  // (evita que "soltar" el arrastre sobre una provincia distinta la seleccione por accidente).
  function handleClickCapture(e: React.MouseEvent) {
    if (justArrastre.current) {
      e.stopPropagation()
      justArrastre.current = false
    }
  }

  const pinesDeLaProvincia = useMemo(() => {
    if (!activa) return pines
    return pines.filter((u) => normalizar(u.provincia) === normalizar(activa.nombre))
  }, [activa])

  function handleSelectPin(u: UniversidadMapa) {
    if (u.tieneFicha) navigate(`/universidad/${u.id}`)
  }

  function handleProvinciaClick(p: (typeof provincias)[number]) {
    if (p.nombre === 'Capital Federal') return // se accede solo por el botón dedicado
    setActiva((cur) => (cur?.nombre === p.nombre ? null : p))
  }

  // Radio de pin en unidades "de mapa": al dividir por vista.k, el tamaño en pantalla queda
  // constante sin importar el zoom (el mismo truco que ya usamos para los strokeWidth).
  const radioPinPantalla = Math.max(2.2, Math.min(6.5, 40 / Math.sqrt(vista.k)))
  const radioPin = radioPinPantalla / Math.max(vista.k, 0.0001)

  return (
    <div className="relative">
      {/* Fondo dinámico: mapa a pantalla completa */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="blob w-[38rem] h-[38rem] bg-upl-secundario/50 -top-40 -left-40" />
        <div className="blob w-[30rem] h-[30rem] bg-upl-resaltador/20 bottom-0 right-0" style={{ animationDelay: '4s' }} />

        <div className="absolute inset-0 flex items-center justify-center px-3 pt-24 pb-6">
          <svg
            ref={svgRef}
            viewBox={viewBox}
            className="w-full h-full max-w-5xl"
            style={{ overflow: 'visible', cursor: activa ? 'grab' : 'default', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClickCapture={handleClickCapture}
          >
            <g
              style={{
                transform: `matrix(${vista.k},0,0,${vista.k},${vista.x},${vista.y})`,
                transition: animar ? 'transform 0.7s cubic-bezier(0.16,1,0.3,1)' : 'none',
              }}
            >
              {/* Capa base: mismo color, sin fisuras entre provincias */}
              {provincias.map((p) => (
                <path key={`base-${p.nombre}`} d={p.d} fill={BASE_FILL} stroke={BASE_FILL} strokeWidth={3} strokeLinejoin="round" />
              ))}
              {provincias.map((p) => {
                const esActiva = activa?.nombre === p.nombre
                const esCapital = p.nombre === 'Capital Federal'
                return (
                  <path
                    key={p.nombre}
                    d={p.d}
                    className={esCapital ? '' : 'province-shape'}
                    fill={esActiva ? '#5b6796' : BASE_FILL}
                    stroke={esActiva ? '#facf3b' : 'rgba(255,255,249,0.65)'}
                    strokeWidth={(esActiva ? 1.6 : 0.8) / Math.max(vista.k, 1)}
                    style={{ pointerEvents: esCapital ? 'none' : 'auto' }}
                    onClick={() => handleProvinciaClick(p)}
                    onMouseEnter={(e) => {
                      if (!esActiva && !esCapital) (e.currentTarget as SVGPathElement).setAttribute('fill', '#6a76a8')
                    }}
                    onMouseLeave={(e) => {
                      if (!esActiva && !esCapital) (e.currentTarget as SVGPathElement).setAttribute('fill', BASE_FILL)
                    }}
                  />
                )
              })}

              {/* Límites de departamentos/partidos: contexto visual al hacer zoom a una provincia */}
              {activa &&
                deptoPaths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,249,0.3)"
                    strokeWidth={0.6 / Math.max(vista.k, 1)}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}

              {/* Pines: hijos del mismo grupo transformado que el mapa — quedan pegados a él
                  en todo momento (arrastre, zoom o animación), nunca se desincronizan. */}
              {pines.map((u) => {
                const visible = !activa || normalizar(u.provincia) === normalizar(activa.nombre)
                return (
                  <circle
                    key={u.id}
                    cx={u.x}
                    cy={u.y}
                    r={radioPin}
                    className={`pin ${!u.tieneFicha ? 'pin-no-data' : ''}`}
                    style={{
                      opacity: visible ? 1 : 0,
                      pointerEvents: visible ? 'auto' : 'none',
                      transition: 'opacity 0.4s ease',
                    }}
                    onClick={() => handleSelectPin(u)}
                    onMouseEnter={() => setHover(u)}
                    onMouseLeave={() => setHover(null)}
                  />
                )
              })}
            </g>
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
          {CAPITAL && (
            <button
              onClick={() => setActiva(CAPITAL)}
              className="shrink-0 rounded-full glass-chip text-upl-crema font-display font-600 text-sm px-4 py-2 hover:bg-upl-crema/15 transition-colors"
            >
              CABA
            </button>
          )}
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
        {!activa ? (
          <p className="mb-2">Hacé clic en una provincia para explorar sus sedes.</p>
        ) : (
          <p className="mb-2">Arrastrá para mover el mapa y girá la rueda para acercar donde quieras.</p>
        )}
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
            <div className="sticky top-0 glass-strong flex items-center justify-between px-5 py-3 border-b border-upl-crema/10 gap-3">
              <div className="min-w-0">
                <h2 className="font-display font-700 text-lg text-upl-crema truncate">{activa.nombre}</h2>
                <p className="text-[11px] text-upl-crema/45">{Math.round(vista.k * 10) / 10}x de zoom</p>
              </div>
              <button
                onClick={() => setActiva(null)}
                className="shrink-0 rounded-full bg-upl-amarillo text-upl-principal text-xs font-semibold px-3 py-1.5 hover:bg-upl-resaltador transition-colors"
              >
                ← Ver todo el país
              </button>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {pinesDeLaProvincia.length === 0 && (
                <p className="text-upl-crema/60 text-sm px-2 py-3">No relevamos sedes universitarias nacionales en esta provincia todavía.</p>
              )}
              {pinesDeLaProvincia.map((u) => (
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
