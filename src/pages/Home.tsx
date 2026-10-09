import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import mapaEstatico from '../data/mapa-estatico.json'
import { sedes, type Sede } from '../data/sedes'
import { ubicacion } from '../lib/format'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { BuscadorUniversidades } from '../components/BuscadorUniversidades'
import { MonedaToggle } from '../components/MonedaToggle'
import { PinTooltip, type HoverMapa } from '../components/PinTooltip'
import type { UniversidadMapa } from '../types'
import { ENLACES, RUTAS, rutaProvincia, rutaSede, rutaUniversidad, slugProvincia } from '../lib/rutas'
import { LinkAnuarios } from '../components/LinkAnuarios'
import { useMeta } from '../lib/meta'

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
// En celular no hay anexo de CABA al costado: el recorte se ajusta al territorio (x 205–595) para que
// el mapa quede centrado en vez de corrido a la derecha por el margen vacío del oeste.
const NATIONAL_VIEWBOX_MOVIL = '195 10 410 880'
const CAPITAL = provincias.find((p) => p.nombre === 'Capital Federal') ?? null

const PIN_R_NACIONAL = 3.4
const PIN_STROKE_W_BASE = 0.6
const PIN_DASH_BASE: [number, number] = [1.2, 1]
const PIN_FILL = '#facf3b'
const PIN_STROKE_DATA = '#242c50'
const PIN_STROKE_NODATA = '#facf3b'
const ZOOM_MAX = 400
// Sedes y unidades académicas: otro color y un poco más chicas que la sede central.
const SEDE_FILL = '#8fb7ff'
const SEDE_ESCALA = 0.72

// Mismo corte que el breakpoint `sm` de Tailwind. Es reactivo (y no un chequeo de window.innerWidth
// al renderizar) porque si la página se abre en escritorio y después se achica la ventana, el mapa
// se quedaba con el recorte de escritorio y aparecía corrido a la derecha.
const MQ_MOVIL = '(max-width: 639px)'

function useEsMovil() {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(MQ_MOVIL)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => window.matchMedia(MQ_MOVIL).matches,
  )
}

/** Hover sobre un punto del mapa (sede central o sede regional) a partir del evento del mouse. */
function hoverDe(e: React.MouseEvent, u: UniversidadMapa | Sede): HoverMapa {
  return 'universidad' in u
    ? { universidad: u.universidad, sede: { nombre: u.nombre, ciudad: u.ciudad, provincia: u.provincia }, x: e.clientX, y: e.clientY }
    : { universidad: u.id, x: e.clientX, y: e.clientY }
}

function sedeVisual(r: number) {
  return { fill: SEDE_FILL, stroke: PIN_STROKE_DATA, strokeWidth: PIN_STROKE_W_BASE * (r / PIN_R_NACIONAL) }
}

/** Switch para mostrar u ocultar las sedes regionales / unidades académicas. */
function ToggleSedes({ activo, onChange }: { activo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className="flex items-center gap-2 text-left"
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${activo ? 'bg-[#8fb7ff]' : 'bg-upl-crema/25'}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-upl-principal shadow transition-transform ${activo ? 'translate-x-3.5' : 'translate-x-0.5'}`}
        />
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8fb7ff] border border-upl-principal" />
        Sedes y facultades {activo ? '' : '(ocultas)'}
      </span>
    </button>
  )
}

/**
 * Radio "de mapa" (unidades crudas) que representa un tamaño en pantalla CRECIENTE a medida que
 * se hace zoom (k crece respecto del encuadre inicial kMin), con un techo para que no se dispare.
 * Al encuadre inicial (k===kMin) el punto mide `base` en pantalla — más grande que en el mapa
 * nacional, porque en una provincia grande (Río Negro, Santa Cruz) con el tamaño nacional los puntos
 * quedaban casi invisibles hasta hacer zoom. Crecimiento lineal (no logarítmico) para que se note
 * de verdad al acercar.
 */
function radioCreciente(k: number, kMin: number, base: number) {
  const zoomRelativo = k / kMin
  const pantalla = Math.min(18, base * zoomRelativo)
  return pantalla / k
}

// Tamaño inicial de los puntos al abrir una provincia. CABA va más chico: concentra 20 puntos en
// pocas cuadras y con el tamaño general quedaban encimados.
const PIN_R_PROVINCIA = 5.5
const PIN_R_CABA = 3.8

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

function calcularFit(p: Provincia, movil: boolean, focoY = 0.4): Vista {
  const [x0, y0, x1, y1] = p.bbox
  const bw = x1 - x0
  const bh = y1 - y0
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  // En celular el mapa se dibuja mucho más chico, así que se permite acercar más de entrada: si no,
  // una provincia mínima como CABA quedaba como un punto en el medio de la pantalla.
  // CABA (la provincia más chica, y ahora con sus facultades y sedes) necesita más zoom también en
  // escritorio: con el tope general de 60 quedaba como una mancha chica con 20 puntos encimados.
  const kMax = movil ? 200 : p.nombre === 'Capital Federal' ? 95 : 60
  const k = Math.min((width * 0.88) / bw, (height * 0.62) / bh, kMax)
  return { k, x: width / 2 - k * cx, y: height * focoY - k * cy }
}

/** Vista de una provincia: mapa acercado, con arrastre y zoom libres, pero nunca más lejos que el encuadre inicial. */
function VistaProvincia({
  provincia,
  onVolver,
  onSelectPin,
  onCambiarProvincia,
  mostrarSedes,
  onMostrarSedes,
}: {
  provincia: Provincia
  onVolver: () => void
  onSelectPin: (id: string, sede?: Sede) => void
  onCambiarProvincia: (p: Provincia) => void
  mostrarSedes: boolean
  onMostrarSedes: (v: boolean) => void
}) {
  const movil = useEsMovil()
  const fitInicial = useMemo(
    () => calcularFit(provincia, movil, provincia.nombre === 'Capital Federal' && !movil ? 0.3 : 0.4),
    [provincia, movil],
  )
  const [vista, setVista] = useState<Vista>(fitInicial)
  const [animar, setAnimar] = useState(true)
  const [deptoPaths, setDeptoPaths] = useState<string[]>([])
  const [hover, setHover] = useState<HoverMapa | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const minK = useRef(fitInicial.k)
  const arrastre = useRef<{ x: number; y: number; vx: number; vy: number; movido: boolean } | null>(null)
  const justArrastre = useRef(false)
  const UMBRAL_ARRASTRE = 8
  // Pellizco (pinch) en pantallas táctiles: punteros activos y estado al empezar el gesto.
  const punteros = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ d0: number; v0: Vista; q: { x: number; y: number }; m0: { x: number; y: number } } | null>(null)

  /** Pasa una coordenada de pantalla al sistema de coordenadas del viewBox (sin la transformación de zoom). */
  function aCoordenadasMapa(clientX: number, clientY: number) {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(ctm.inverse())
  }

  /** Zoom anclado en un punto de pantalla (el cursor, el centro del pellizco o el centro del mapa). */
  function zoomEn(factor: number, clientX: number, clientY: number) {
    const q = aCoordenadasMapa(clientX, clientY)
    if (!q) return
    setVista((v) => {
      const k = Math.min(Math.max(v.k * factor, minK.current), ZOOM_MAX)
      const f = k / v.k
      return { k, x: q.x * (1 - f) + f * v.x, y: q.y * (1 - f) + f * v.y }
    })
  }

  function zoomBoton(factor: number) {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return
    setAnimar(true)
    zoomEn(factor, r.left + r.width / 2, r.top + r.height / 2)
  }

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

  // Si cambia el layout (celular ↔ escritorio) se re-encuadra con el fit que corresponde.
  useEffect(() => {
    minK.current = fitInicial.k
    setVista(fitInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movil])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    function onWheel(e: WheelEvent) {
      if (!svg) return
      e.preventDefault()
      setAnimar(false)
      zoomEn(e.deltaY < 0 ? 1.22 : 1 / 1.22, e.clientX, e.clientY)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    // Ojo: NO capturamos el puntero acá todavía. Si lo hiciéramos en todo mousedown, en algunos
    // navegadores el click posterior puede no resolverse igual sobre el path que está debajo del
    // cursor. Solo capturamos una vez que confirmamos que es un arrastre real (ver handlePointerMove).
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (punteros.current.size === 2) {
      // Arranca un pellizco: se cancela el arrastre de un dedo y se toma la foto inicial del gesto.
      const [a, b] = [...punteros.current.values()]
      const m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const q = aCoordenadasMapa(m0.x, m0.y)
      if (q) {
        pinch.current = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, v0: vista, q, m0 }
        arrastre.current = null
        justArrastre.current = true
        setAnimar(false)
      }
      return
    }
    arrastre.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, movido: false }
  }
  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (punteros.current.has(e.pointerId)) punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const p = pinch.current
    if (p && punteros.current.size >= 2) {
      const [a, b] = [...punteros.current.values()]
      const ctm = svgRef.current?.getScreenCTM()
      if (!ctm) return
      const k = Math.min(Math.max(p.v0.k * (Math.hypot(a.x - b.x, a.y - b.y) / p.d0), minK.current), ZOOM_MAX)
      const f = k / p.v0.k
      const dx = ((a.x + b.x) / 2 - p.m0.x) / ctm.a
      const dy = ((a.y + b.y) / 2 - p.m0.y) / ctm.d
      setVista({ k, x: p.q.x * (1 - f) + f * p.v0.x + dx, y: p.q.y * (1 - f) + f * p.v0.y + dy })
      return
    }
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
  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    punteros.current.delete(e.pointerId)
    if (punteros.current.size < 2) pinch.current = null
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
  const sedesDeLaProvincia = useMemo(
    () => sedes.filter((s) => normalizar(s.provincia) === normalizar(provincia.nombre)),
    [provincia],
  )

  // Crece con el zoom (más acercás, más grande y representativo el punto), con techo — y como
  // vista.k nunca puede bajar de minK.current, tampoco puede encogerse por debajo del punto de partida.
  // En celular el SVG se dibuja a ~40% del tamaño de escritorio: sin este factor los puntos quedan de
  // 1-2 px, imposibles de ver y de tocar.
  const escalaPin = movil ? 2.2 : 1.4
  const radioPin =
    radioCreciente(vista.k, minK.current, provincia.nombre === 'Capital Federal' ? PIN_R_CABA : PIN_R_PROVINCIA) * escalaPin
  const clipId = `clip-${slug(provincia.nombre)}`
  // CABA se muestra siempre aislada: ni Buenos Aires ni ninguna otra provincia se dibuja alrededor.
  // No es "una vecina más" con zoom — es una vista aparte, como pidió el usuario explícitamente.
  const esAislada = provincia.nombre === 'Capital Federal'
  const provinciasDeContexto = esAislada ? [provincia] : provincias

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center px-3 pt-32 pb-[40vh] sm:pt-24 sm:pb-6">
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
                  className={esSaltable ? 'transition-colors duration-200 ease-out hover:fill-[#6a76a8]' : undefined}
                  style={{ pointerEvents: esSaltable ? 'auto' : 'none', cursor: esSaltable ? 'pointer' : 'default' }}
                  onClick={esSaltable ? () => onCambiarProvincia(p) : undefined}
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

            {sedes.map((s) => {
              const visible = mostrarSedes && normalizar(s.provincia) === normalizar(provincia.nombre)
              const r = radioPin * SEDE_ESCALA
              return (
                <circle
                  key={s.id}
                  cx={s.x}
                  cy={s.y}
                  r={r}
                  className="pin"
                  {...sedeVisual(r)}
                  style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.35s ease-out' }}
                  onClick={() => onSelectPin(s.universidad, s)}
                  onMouseEnter={(e) => setHover(hoverDe(e, s))}
                  onMouseMove={(e) => setHover(hoverDe(e, s))}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}

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
                  style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', transition: 'opacity 0.35s ease-out' }}
                  onClick={() => onSelectPin(u.id)}
                  onMouseEnter={(e) => setHover(hoverDe(e, u))}
                  onMouseMove={(e) => setHover(hoverDe(e, u))}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </g>
        </svg>
      </div>

      <div className="fixed right-3 z-20 bottom-[calc(38vh+1.25rem)] sm:bottom-auto sm:top-28 flex flex-col overflow-hidden rounded-xl glass-strong">
        <button
          onClick={() => zoomBoton(1.6)}
          aria-label="Acercar"
          className="w-10 h-10 text-xl text-upl-crema hover:bg-upl-crema/10 active:bg-upl-crema/15"
        >
          +
        </button>
        <div className="h-px bg-upl-crema/15" />
        <button
          onClick={() => zoomBoton(1 / 1.6)}
          aria-label="Alejar"
          className="w-10 h-10 text-xl text-upl-crema hover:bg-upl-crema/10 active:bg-upl-crema/15"
        >
          −
        </button>
      </div>

      <div className="hidden sm:block fixed left-3 bottom-3 z-20 glass rounded-xl px-4 py-3 text-xs text-upl-crema/80 max-w-[220px]">
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
          <ToggleSedes activo={mostrarSedes} onChange={onMostrarSedes} />
        </div>
      </div>

      <PinTooltip hover={hover} />

      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3">
        <div className="glass-strong rounded-2xl w-full max-w-2xl max-h-[38vh] sm:max-h-[42vh] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-[#1b2142] flex items-center justify-between px-4 sm:px-5 py-3 border-b border-upl-crema/10 gap-3">
            <div className="min-w-0">
              <h2 className="font-display font-700 text-lg text-upl-crema truncate">{provincia.nombre}</h2>
              <p className="text-[11px] text-upl-crema/45">
                {pinesDeLaProvincia.length} {pinesDeLaProvincia.length === 1 ? 'universidad' : 'universidades'}
                {sedesDeLaProvincia.length > 0 && ` · ${sedesDeLaProvincia.length} sedes y facultades`}
                <span className="sm:hidden"> · pellizcá el mapa para acercar</span>
              </p>
              {sedesDeLaProvincia.length > 0 && (
                <div className="sm:hidden mt-1 text-[11px] text-upl-crema/70">
                  <ToggleSedes activo={mostrarSedes} onChange={onMostrarSedes} />
                </div>
              )}
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
              // Link real (<a href>) y no botón: se puede abrir en otra pestaña y Google lo sigue.
              <Link
                key={u.id}
                to={rutaUniversidad(u.id)}
                aria-disabled={!u.tieneFicha}
                onClick={(e) => !u.tieneFicha && e.preventDefault()}
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
              </Link>
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
  onBuscar,
  mostrarSedes,
  onMostrarSedes,
}: {
  onSelectProvincia: (p: Provincia) => void
  onSelectPin: (id: string, sede?: Sede) => void
  onBuscar: () => void
  mostrarSedes: boolean
  onMostrarSedes: (v: boolean) => void
}) {
  const [hover, setHover] = useState<HoverMapa | null>(null)
  const movil = useEsMovil()

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

  // Recuadro de CABA en celular: mismo recorte pero con poco margen, para que la ciudad llene la tarjeta.
  const capitalVbMovil = useMemo(() => {
    if (!CAPITAL) return null
    const [x0, y0, x1, y1] = CAPITAL.bbox
    const lado = Math.max(x1 - x0, y1 - y0) * 1.15
    return { x0: (x0 + x1) / 2 - lado / 2, y0: (y0 + y1) / 2 - lado / 2, w: lado, h: lado }
  }, [])

  const pinesCapital = useMemo(() => pines.filter((u) => normalizar(u.provincia) === 'capital federal'), [])
  const sedesCapital = useMemo(() => sedes.filter((s) => normalizar(s.provincia) === 'capital federal'), [])

  return (
    <>
      <div className="absolute inset-0 flex items-stretch justify-center px-3 pt-32 pb-28 sm:pt-24 sm:pb-6 gap-1">
        <div className="flex-1 flex items-center justify-center sm:justify-end min-w-0">
          <svg viewBox={movil ? NATIONAL_VIEWBOX_MOVIL : NATIONAL_VIEWBOX} className="w-full h-full max-w-3xl" style={{ overflow: 'visible' }}>
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
                className="cursor-pointer transition-colors duration-200 ease-out hover:fill-[#6a76a8]"
                fill={BASE_FILL}
                stroke="rgba(255,255,249,0.65)"
                strokeWidth={0.8}
                onClick={() => onSelectProvincia(p)}
              />
            ))}

            {mostrarSedes &&
              sedes
                .filter((s) => normalizar(s.provincia) !== 'capital federal')
                .map((s) => (
                  <circle
                    key={s.id}
                    cx={s.x}
                    cy={s.y}
                    r={PIN_R_NACIONAL * SEDE_ESCALA}
                    className="pin"
                    {...sedeVisual(PIN_R_NACIONAL * SEDE_ESCALA)}
                    onClick={() => onSelectPin(s.universidad, s)}
                    onMouseEnter={(e) => setHover(hoverDe(e, s))}
                    onMouseMove={(e) => setHover(hoverDe(e, s))}
                    onMouseLeave={() => setHover(null)}
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
                onClick={() => onSelectPin(u.id)}
                onMouseEnter={(e) => setHover(hoverDe(e, u))}
                onMouseMove={(e) => setHover(hoverDe(e, u))}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>
        </div>

        {/* En celular el anexo lateral no entra: CABA (invisible a esta escala) va en un recuadro flotante
            sobre el mar, a la altura de la Patagonia, que lleva directo a su vista. */}
        {CAPITAL && capitalVbMovil && (
          <button
            onClick={() => onSelectProvincia(CAPITAL)}
            className="sm:hidden fixed right-3 top-[56%] z-10 w-28 rounded-2xl glass-strong p-2 text-left"
            aria-label="Ver Capital Federal en detalle"
          >
            <svg viewBox={`${capitalVbMovil.x0} ${capitalVbMovil.y0} ${capitalVbMovil.w} ${capitalVbMovil.h}`} className="w-full aspect-square">
              <path d={CAPITAL.d} fill={BASE_FILL} stroke="rgba(255,255,249,0.65)" strokeWidth={capitalVbMovil.w / 120} />
              {mostrarSedes &&
                sedesCapital.map((s) => (
                  <circle key={s.id} cx={s.x} cy={s.y} r={capitalVbMovil.w / 52} {...sedeVisual(capitalVbMovil.w / 52)} />
                ))}
              {pinesCapital.map((u) => (
                <circle key={u.id} cx={u.x} cy={u.y} r={capitalVbMovil.w / 28} {...pinVisual(u.tieneFicha, capitalVbMovil.w / 28)} />
              ))}
            </svg>
            <div className="mt-1 text-[11px] font-semibold text-upl-crema leading-tight">CABA</div>
            <div className="text-[10px] text-upl-crema/55 leading-tight">
              {pinesCapital.length} universidades · tocá para ver
            </div>
          </button>
        )}

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
                  className="transition-colors duration-200 ease-out hover:fill-[#6a76a8]"
                  fill={BASE_FILL}
                  stroke="rgba(255,255,249,0.65)"
                  strokeWidth={capitalVb.w / 350}
                />
                {mostrarSedes &&
                  sedesCapital.map((s) => (
                    <circle
                      key={s.id}
                      cx={s.x}
                      cy={s.y}
                      r={radioPinCapital * SEDE_ESCALA}
                      className="pin"
                      {...sedeVisual(radioPinCapital * SEDE_ESCALA)}
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectPin(s.universidad, s)
                      }}
                      onMouseEnter={(e) => setHover(hoverDe(e, s))}
                      onMouseMove={(e) => setHover(hoverDe(e, s))}
                      onMouseLeave={() => setHover(null)}
                    />
                  ))}
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
                      onSelectPin(u.id)
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      setHover(hoverDe(e, u))
                    }}
                    onMouseMove={(e) => setHover(hoverDe(e, u))}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:left-3 z-20 glass-strong sm:glass rounded-2xl sm:rounded-xl px-4 py-3 text-xs text-upl-crema/80 sm:max-w-[240px]">
        <p className="mb-2">Tocá una provincia para ver sus sedes, o buscá una universidad.</p>
        <div className="flex sm:flex-col gap-x-4 gap-y-1.5 mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-upl-amarillo border border-upl-principal" /> Con ficha de datos
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-upl-amarillo" /> Sin datos reportados
          </div>
        </div>
        <div className="mb-2.5">
          <ToggleSedes activo={mostrarSedes} onChange={onMostrarSedes} />
        </div>
        <button
          onClick={onBuscar}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-upl-crema/10 hover:bg-upl-crema/15 border border-upl-crema/15 px-3 py-2 text-sm font-display font-600 text-upl-crema"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 text-upl-amarillo" fill="currentColor" aria-hidden>
            <path d="M8.5 2a6.5 6.5 0 0 1 5.2 10.4l3.9 3.9a.9.9 0 1 1-1.3 1.3l-3.9-3.9A6.5 6.5 0 1 1 8.5 2Zm0 1.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Z" />
          </svg>
          Buscar universidad
        </button>
        <p className="mt-2 text-[11px] text-upl-crema/50">
          Fuente: <LinkAnuarios>Anuarios SPU</LinkAnuarios>
        </p>
      </div>

      <PinTooltip hover={hover} />
    </>
  )
}

export function Home() {
  // La provincia abierta vive en la URL (?p=slug): así el botón "atrás" del celular/navegador vuelve
  // de la provincia al país, y al volver de una ficha se reabre la provincia en la que estabas.
  const { provincia: slugActiva } = useParams()
  const activa = useMemo(() => (slugActiva ? provincias.find((p) => slugProvincia(p.nombre) === slugActiva) ?? null : null), [slugActiva])
  const entroDesdeNacional = useRef(false)
  const [mostrarSedes, setMostrarSedes] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const cerrarBuscador = useCallback(() => setBuscando(false), [])
  const navigate = useNavigate()

  function abrirProvincia(p: Provincia) {
    // Desde el país se apila una entrada nueva; saltar entre provincias vecinas la reemplaza, para que
    // "atrás" siempre lleve al mapa nacional.
    const desdeNacional = !activa
    if (desdeNacional) entroDesdeNacional.current = true
    navigate(rutaProvincia(p.nombre), { replace: !desdeNacional })
  }

  function volverAlPais() {
    if (entroDesdeNacional.current) {
      entroDesdeNacional.current = false
      navigate(-1)
    } else {
      navigate(RUTAS.inicio, { replace: true })
    }
  }

  function handleSelectPin(id: string, sede?: Sede) {
    if (sede) return navigate(rutaSede(sede.universidad, sede.nombre))
    const destino = pines.find((u) => u.id === id)
    if (destino ? destino.tieneFicha : true) navigate(rutaUniversidad(id))
  }

  const cantidadEnProvincia = activa ? pines.filter((u) => normalizar(u.provincia) === normalizar(activa.nombre)).length : 0
  useMeta({
    titulo: activa ? `Universidades nacionales en ${activa.nombre === 'Capital Federal' ? 'la Ciudad de Buenos Aires' : activa.nombre}` : null,
    descripcion: activa
      ? `Mapa de las ${cantidadEnProvincia} universidades nacionales de ${activa.nombre === 'Capital Federal' ? 'CABA' : activa.nombre}, con sus sedes y facultades: tasa de egreso, estudiantes sin materias aprobadas y costo por graduado.`
      : 'Mapa de las universidades nacionales argentinas con datos oficiales de la SPU: cuántos se reciben a tiempo, cuántos no aprueban ninguna materia y cuánto cuesta cada graduado. Un proyecto de Universitarios por la Libertad.',
    ruta: activa ? rutaProvincia(activa.nombre) : RUTAS.inicio,
  })

  // Provincia inexistente en la URL (/mapa/cualquiera): al mapa del país.
  if (slugActiva && !activa) return <Navigate to={RUTAS.inicio} replace />

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
            onVolver={volverAlPais}
            onSelectPin={handleSelectPin}
            onCambiarProvincia={abrirProvincia}
            mostrarSedes={mostrarSedes}
            onMostrarSedes={setMostrarSedes}
          />
        ) : (
          <MapaNacional
            onSelectProvincia={abrirProvincia}
            onSelectPin={handleSelectPin}
            onBuscar={() => setBuscando(true)}
            mostrarSedes={mostrarSedes}
            onMostrarSedes={setMostrarSedes}
          />
        )}
      </div>

      {/* Header flotante. Escritorio ancho (lg+): una sola fila — marca, accesos y moneda. Más angosto: la
          marca y la moneda arriba, los accesos en una segunda fila a todo el ancho. El título nunca se
          recorta: el contenedor es lo bastante ancho y los accesos bajan de fila antes de apretarlo. */}
      <header className="fixed top-0 inset-x-0 z-20 flex justify-center pt-3 sm:pt-4 px-3">
        <div className="glass-strong rounded-2xl px-3 sm:px-5 py-2.5 sm:py-3 max-w-5xl w-full flex flex-wrap items-center gap-x-3 gap-y-2">
          {activa && (
            <button
              type="button"
              onClick={volverAlPais}
              aria-label="Volver al mapa del país"
              className="sm:hidden shrink-0 w-8 h-8 rounded-full glass-chip text-upl-crema text-lg leading-none flex items-center justify-center active:bg-upl-crema/15"
            >
              ‹
            </button>
          )}
          <Link to={RUTAS.inicio} className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-auto lg:mr-0">
            {/* En celulares angostos, con el botón de volver a la vista, el logo no entra en la fila sin
                recortar el título: se oculta (el título ya identifica el sitio). */}
            <img
              src={`${import.meta.env.BASE_URL}logo.jpg`}
              alt="UPL"
              className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover shrink-0 ${activa ? 'max-[429px]:hidden' : ''}`}
            />
            <div className="min-w-0">
              <h1 className="font-display font-800 text-base max-[379px]:text-sm sm:text-xl text-upl-crema leading-tight whitespace-nowrap">Auditorías Universitarias</h1>
              <p className="text-[11px] sm:text-xs text-upl-resaltador whitespace-nowrap">Universitarios por la Libertad</p>
            </div>
          </Link>
          <MonedaToggle className="lg:order-last" />
          <nav className="w-full lg:w-auto lg:ml-auto flex gap-1.5 sm:gap-2">
            {[
              { to: RUTAS.rankings, label: 'Rankings', destacado: true },
              { to: RUTAS.kirchneristas, label: 'Universidades K' },
              { to: RUTAS.propuestas, label: 'Propuestas' },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`flex-1 sm:flex-none text-center rounded-full font-display font-600 text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 transition-colors whitespace-nowrap ${
                  l.destacado
                    ? 'bg-upl-amarillo text-upl-principal hover:bg-upl-resaltador'
                    : 'glass-chip text-upl-crema hover:bg-upl-crema/15'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={ENLACES.anuarios}
              target="_blank"
              rel="noreferrer"
              title="Anuarios de Estadísticas Universitarias (SPU) — la fuente de todos los datos"
              className="hidden sm:inline-block text-center rounded-full glass-chip text-upl-crema hover:bg-upl-crema/15 font-display font-600 text-sm px-4 py-2 transition-colors whitespace-nowrap"
            >
              Anuarios SPU <span aria-hidden>↗</span>
            </a>
          </nav>
        </div>
      </header>

      <BuscadorUniversidades abierto={buscando} onCerrar={cerrarBuscador} />
    </div>
  )
}
