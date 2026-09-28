import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import mapaEstatico from '../data/mapa-estatico.json'
import { ubicacion } from '../lib/format'
import { UniversidadBadge } from '../components/UniversidadBadge'
import type { UniversidadMapa } from '../types'

// Límites de departamentos/partidos por provincia — se cargan sólo al entrar a una provincia (code-split).
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

type Provincia = { nombre: string; d: string; bbox: [number, number, number, number] }

const { viewBox, width, height, provincias, pines } = mapaEstatico as {
  viewBox: string
  width: number
  height: number
  provincias: Provincia[]
  pines: (UniversidadMapa & { x: number; y: number })[]
}

const BASE_FILL = '#4a5580'
// El viewBox completo (800 de ancho) reserva mucho mar vacío al este que ningún territorio usa
// (la costa llega como máximo a ~595). En la vista nacional recortamos ese margen para que el
// mapa quede pegado al anexo de Capital Federal, sin tocar el sistema de coordenadas compartido.
const NATIONAL_VIEWBOX = '0 0 620 900'
const CAPITAL = provincias.find((p) => p.nombre === 'Capital Federal') ?? null

const PIN_R_NACIONAL = 3.4
const PIN_STROKE_W_BASE = 0.6
const PIN_DASH_BASE: [number, number] = [1.2, 1]
const PIN_FILL = '#facf3b'
const PIN_STROKE_DATA = '#242c50'
const PIN_STROKE_NODATA = '#facf3b'
const ZOOM_MAX = 400

/**
 * Radio "de mapa" (unidades crudas) que representa un tamaño en pantalla CRECIENTE a medida que
 * se hace zoom (k crece respecto del encuadre inicial kMin), con un techo para que no se dispare.
 * Al encuadre inicial (k===kMin) el punto se ve igual que en el mapa nacional (PIN_R_NACIONAL).
 * Crecimiento lineal (no logarítmico) para que se note de verdad al acercar.
 */
function radioCreciente(k: number, kMin: number) {
  const zoomRelativo = k / kMin
  const pantalla = Math.min(16, PIN_R_NACIONAL * zoomRelativo)
  return pantalla / k
}

/**
 * Borde y punteado siempre proporcionales al radio actual — así un pin "sin datos" es SIEMPRE
 * un círculo punteado sin relleno, y uno "con datos" SIEMPRE un círculo amarillo sólido, sin
 * importar el nivel de zoom (antes el borde/punteado tenían un grosor fijo en CSS que se
 * escalaba con el <g> transformado y terminaba tapando o deformando el círculo).
 */
function pinVisual(tieneFicha: boolean, r: number) {
  const ratio = r / PIN_R_NACIONAL
  return {
    fill: tieneFicha ? PIN_FILL : 'transparent',
    stroke: tieneFicha ? PIN_STROKE_DATA : PIN_STROKE_NODATA,
    strokeWidth: PIN_STROKE_W_BASE * ratio,
    strokeDasharray: tieneFicha ? undefined : `${PIN_DASH_BASE[0] * ratio} ${PIN_DASH_BASE[1] * ratio}`,
  }
}

type Vista = { k: number; x: number; y: number }

function calcularFit(p: Provincia, focoY = 0.4): Vista {
  const [x0, y0, x1, y1] = p.bbox
  const bw = x1 - x0
  const bh = y1 - y0
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const k = Math.min((width * 0.88) / bw, (height * 0.62) / bh, 60)
  return { k, x: width / 2 - k * cx, y: height * focoY - k * cy }
}

/** Vista de una provincia: mapa acercado, con arrastre y zoom libres, pero nunca más lejos que el encuadre inicial. */
function VistaProvincia({
  provincia,
  onVolver,
  onSelectPin,
  onCambiarProvincia,
}: {
  provincia: Provincia
  onVolver: () => void
  onSelectPin: (u: UniversidadMapa) => void
  onCambiarProvincia: (p: Provincia) => void
}) {
  const fitInicial = useMemo(() => calcularFit(provincia), [provincia])
  const [vista, setVista] = useState<Vista>(fitInicial)
  const [animar, setAnimar] = useState(true)
  const [deptoPaths, setDeptoPaths] = useState<string[]>([])
  const [hover, setHover] = useState<UniversidadMapa | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const minK = useRef(fitInicial.k)
  const arrastre = useRef<{ x: number; y: number; vx: number; vy: number; movido: boolean } | null>(null)
  const justArrastre = useRef(false)
  const UMBRAL_ARRASTRE = 8

  useEffect(() => {
    minK.current = fitInicial.k
    setVista(fitInicial)
    setAnimar(true)
    let vigente = true
    cargarDepartamentos(provincia.nombre).then((paths) => {
      if (vigente) setDeptoPaths(paths)
    })
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provincia.nombre])

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
        const k = Math.min(Math.max(v.k * factor, minK.current), ZOOM_MAX)
        const f = k / v.k
        return { k, x: q.x * (1 - f) + f * v.x, y: q.y * (1 - f) + f * v.y }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    // Ojo: NO capturamos el puntero acá todavía. Si lo hiciéramos en todo mousedown, en algunos
    // navegadores el click posterior puede no resolverse igual sobre el path que está debajo del
    // cursor. Solo capturamos una vez que confirmamos que es un arrastre real (ver handlePointerMove).
    arrastre.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, movido: false }
  }
  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const a = arrastre.current
    const svg = svgRef.current
    if (!a || !svg) return
    if (!a.movido && Math.abs(e.clientX - a.x) < UMBRAL_ARRASTRE && Math.abs(e.clientY - a.y) < UMBRAL_ARRASTRE) return
    if (!a.movido) {
      a.movido = true
      setAnimar(false)
      svg.setPointerCapture?.(e.pointerId)
    }
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const dx = (e.clientX - a.x) / ctm.a
    const dy = (e.clientY - a.y) / ctm.d
    setVista((v) => ({ ...v, x: a.vx + dx, y: a.vy + dy }))
  }
  function handlePointerUp() {
    if (arrastre.current?.movido) justArrastre.current = true
    arrastre.current = null
  }
  function handleClickCapture(e: React.MouseEvent) {
    if (justArrastre.current) {
      e.stopPropagation()
      justArrastre.current = false
    }
  }

  const pinesDeLaProvincia = useMemo(
    () => pines.filter((u) => normalizar(u.provincia) === normalizar(provincia.nombre)),
    [provincia],
  )

  // Crece con el zoom (más acercás, más grande y representativo el punto), con techo — y como
  // vista.k nunca puede bajar de minK.current, tampoco puede encogerse por debajo del punto de partida.
  const radioPin = radioCreciente(vista.k, minK.current)
  const clipId = `clip-${slug(provincia.nombre)}`
  // CABA se muestra siempre aislada: ni Buenos Aires ni ninguna otra provincia se dibuja alrededor.
  // No es "una vecina más" con zoom — es una vista aparte, como pidió el usuario explícitamente.
  const esAislada = provincia.nombre === 'Capital Federal'
  const provinciasDeContexto = esAislada ? [provincia] : provincias

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center px-3 pt-24 pb-6">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="w-full h-full max-w-5xl"
          style={{ overflow: 'visible', cursor: 'grab', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={handleClickCapture}
        >
          <defs>
            <clipPath id={clipId}>
              <path d={provincia.d} />
            </clipPath>
          </defs>
          <g
            style={{
              transform: `matrix(${vista.k},0,0,${vista.k},${vista.x},${vista.y})`,
              transition: animar ? 'transform 0.7s cubic-bezier(0.16,1,0.3,1)' : 'none',
            }}
          >
            {/* Esta capa "base" solo existe para tapar fisuras contra provincias VECINAS (su borde
                grueso se disimula porque el vecino comparte el mismo color de relleno). CABA aislada
                no tiene vecinas en esta vista, así que ese borde quedaría flotando como una mancha
                — se omite acá. */}
            {!esAislada &&
              provinciasDeContexto.map((p) => (
                <path key={`base-${p.nombre}`} d={p.d} fill={BASE_FILL} stroke={BASE_FILL} strokeWidth={3} strokeLinejoin="round" />
              ))}
            {provinciasDeContexto.map((p) => {
              const esActiva = p.nombre === provincia.nombre
              // CABA también es "saltable" como cualquier vecina: un click ahí te lleva directo a su
              // propia vista de zoom, igual que cualquier otra provincia. Si la vista actual es la de
              // CABA (aislada), acá solo está ella misma, sin vecinas a las que saltar.
              const esSaltable = !esActiva
              return (
                <path
                  key={p.nombre}
                  d={p.d}
                  fill={esActiva ? '#5b6796' : BASE_FILL}
                  stroke={esActiva ? '#facf3b' : 'rgba(255,255,249,0.65)'}
                  strokeWidth={(esActiva ? 1.6 : 0.8) / vista.k}
                  style={{ pointerEvents: esSaltable ? 'auto' : 'none', cursor: esSaltable ? 'pointer' : 'default' }}
                  onClick={esSaltable ? () => onCambiarProvincia(p) : undefined}
                  onMouseEnter={
                    esSaltable ? (e) => (e.currentTarget as SVGPathElement).setAttribute('fill', '#6a76a8') : undefined
                  }
                  onMouseLeave={esSaltable ? (e) => (e.currentTarget as SVGPathElement).setAttribute('fill', BASE_FILL) : undefined}
                />
              )
            })}

            {/* Recortadas exactamente al contorno de la provincia: los datasets de departamentos y de
                provincias vienen de fuentes distintas y no calzan vértice a vértice — sin este clip,
                el límite de algunas comunas se pasa unos pixeles de la línea dorada. */}
            <g clipPath={`url(#${clipId})`}>
              {deptoPaths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="rgba(255,255,249,0.3)" strokeWidth={0.6 / vista.k} style={{ pointerEvents: 'none' }} />
              ))}
            </g>

            {pines.map((u) => {
              const visible = normalizar(u.provincia) === normalizar(provincia.nombre)
              return (
                <circle
                  key={u.id}
                  cx={u.x}
                  cy={u.y}
                  r={radioPin}
                  className="pin"
                  {...pinVisual(u.tieneFicha, radioPin)}
                  style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.4s ease' }}
                  onClick={() => onSelectPin(u)}
                  onMouseEnter={() => setHover(u)}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </g>
        </svg>
      </div>

      <div className="fixed left-3 bottom-3 z-20 glass rounded-xl px-4 py-3 text-xs text-upl-crema/80 max-w-[220px]">
        <p className="mb-2">
          Arrastrá para mover el mapa y girá la rueda para acercar. Tocá una provincia vecina para saltar directo a
          ella.
        </p>
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

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3">
        <div className="glass-strong rounded-2xl w-full max-w-2xl max-h-[42vh] overflow-y-auto">
          <div className="sticky top-0 glass-strong flex items-center justify-between px-5 py-3 border-b border-upl-crema/10 gap-3">
            <div className="min-w-0">
              <h2 className="font-display font-700 text-lg text-upl-crema truncate">{provincia.nombre}</h2>
              <p className="text-[11px] text-upl-crema/45">{Math.round((vista.k / fitInicial.k) * 10) / 10}x de zoom</p>
            </div>
            <button
              onClick={onVolver}
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
                onClick={() => onSelectPin(u)}
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
    </>
  )
}

/** Mapa nacional: completamente estático — sin pan ni zoom, solo click para elegir una provincia. */
function MapaNacional({
  onSelectProvincia,
  onSelectPin,
}: {
  onSelectProvincia: (p: Provincia) => void
  onSelectPin: (u: UniversidadMapa) => void
}) {
  const [hover, setHover] = useState<UniversidadMapa | null>(null)

  const capitalVb = useMemo(() => {
    if (!CAPITAL) return null
    const [x0, y0, x1, y1] = CAPITAL.bbox
    const pad = Math.max(x1 - x0, y1 - y0) * 0.4
    return { x0: x0 - pad, y0: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 }
  }, [])

  // El anexo se comporta como una "cámara" fija equivalente a vista.k = 800/capitalVb.w, así el
  // radio de los pines sale de la MISMA fórmula que en el resto del mapa — nunca un ajuste manual aparte.
  // Tamaño fijo elegido a ojo para que, en el recorte chico del anexo, las 5 sedes se distingan
  // bien sin transformarse en un blob (la fórmula "proporcional" del zoom daba puntos ilegibles acá).
  const radioPinCapital = capitalVb ? capitalVb.w / 55 : PIN_R_NACIONAL

  const pinesCapital = useMemo(() => pines.filter((u) => normalizar(u.provincia) === 'capital federal'), [])

  return (
    <>
      <div className="absolute inset-0 flex items-stretch justify-center px-3 pt-24 pb-6 gap-1">
        <div className="flex-1 flex items-center justify-end min-w-0">
          <svg viewBox={NATIONAL_VIEWBOX} className="w-full h-full max-w-3xl" style={{ overflow: 'visible' }}>
            {/* Capa base: mismo color y borde, sin fisuras entre provincias vecinas (los datasets no
                comparten vértices exactos en los límites, y sin esto queda un hueco visible, p. ej.
                entre Santiago del Estero, Chaco y Santa Fe). */}
            {provincias.map((p) => (
              <path key={`base-${p.nombre}`} d={p.d} fill={BASE_FILL} stroke={BASE_FILL} strokeWidth={3} strokeLinejoin="round" />
            ))}
            {/* CABA también es clickeable acá como cualquier otra provincia: te manda directo a su
                propia vista de zoom (además del acceso rápido desde el anexo de al lado). */}
            {provincias.map((p) => (
              <path
                key={p.nombre}
                d={p.d}
                className="province-shape"
                fill={BASE_FILL}
                stroke="rgba(255,255,249,0.65)"
                strokeWidth={0.8}
                onClick={() => onSelectProvincia(p)}
                onMouseEnter={(e) => (e.currentTarget as SVGPathElement).setAttribute('fill', '#6a76a8')}
                onMouseLeave={(e) => (e.currentTarget as SVGPathElement).setAttribute('fill', BASE_FILL)}
              />
            ))}

            {pines.map((u) => (
              <circle
                key={u.id}
                cx={u.x}
                cy={u.y}
                r={PIN_R_NACIONAL}
                className="pin"
                {...pinVisual(u.tieneFicha, PIN_R_NACIONAL)}
                onClick={() => onSelectPin(u)}
                onMouseEnter={() => setHover(u)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>
        </div>

        {/* Anexo de Capital Federal: mismo fondo, sin panel ni borde — es una continuación del mapa, no un modal aparte. */}
        {CAPITAL && capitalVb && (
          <div className="hidden sm:flex flex-col items-stretch w-[32%] max-w-[380px] min-w-[190px] relative">
            <button
              onClick={() => onSelectProvincia(CAPITAL)}
              className="flex-1 cursor-pointer bg-transparent border-0 p-0"
              aria-label="Ver Capital Federal en detalle"
            >
              <svg
                viewBox={`${capitalVb.x0} ${capitalVb.y0} ${capitalVb.w} ${capitalVb.h}`}
                className="w-full h-full"
                style={{ overflow: 'visible' }}
              >
                <path
                  d={CAPITAL.d}
                  fill={BASE_FILL}
                  stroke="rgba(255,255,249,0.65)"
                  strokeWidth={capitalVb.w / 350}
                  onMouseEnter={(e) => (e.currentTarget as SVGPathElement).setAttribute('fill', '#6a76a8')}
                  onMouseLeave={(e) => (e.currentTarget as SVGPathElement).setAttribute('fill', BASE_FILL)}
                />
                {pinesCapital.map((u) => (
                  <circle
                    key={u.id}
                    cx={u.x}
                    cy={u.y}
                    r={radioPinCapital}
                    className="pin"
                    {...pinVisual(u.tieneFicha, radioPinCapital)}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectPin(u)
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      setHover(u)
                    }}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="fixed left-3 bottom-3 z-20 glass rounded-xl px-4 py-3 text-xs text-upl-crema/80 max-w-[220px]">
        <p className="mb-2">Hacé clic en una provincia para explorar sus sedes.</p>
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
    </>
  )
}

export function Home() {
  const [activa, setActiva] = useState<Provincia | null>(null)
  const navigate = useNavigate()

  function handleSelectPin(u: UniversidadMapa) {
    if (u.tieneFicha) navigate(`/universidad/${u.id}`)
  }

  // CABA se muestra sola, sin nada más alrededor — los blobs decorativos de fondo quedaban pegados
  // a su silueta como si fueran una extensión del mismo color, así que ahí van afuera.
  const esCabaAislada = activa?.nombre === 'Capital Federal'

  return (
    <div className="relative">
      <div className="fixed inset-0 overflow-hidden">
        {!esCabaAislada && (
          <>
            <div className="blob w-[38rem] h-[38rem] bg-upl-secundario/50 -top-40 -left-40" />
            <div className="blob w-[30rem] h-[30rem] bg-upl-resaltador/20 bottom-0 right-0" style={{ animationDelay: '4s' }} />
          </>
        )}

        {activa ? (
          <VistaProvincia
            provincia={activa}
            onVolver={() => setActiva(null)}
            onSelectPin={handleSelectPin}
            onCambiarProvincia={setActiva}
          />
        ) : (
          <MapaNacional onSelectProvincia={setActiva} onSelectPin={handleSelectPin} />
        )}
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
    </div>
  )
}
