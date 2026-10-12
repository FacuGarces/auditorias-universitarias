import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { getUniversidad, universidadesArray } from '../data/universidades'
import { sedes as todasLasSedes } from '../data/sedes'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { EvolutionChart } from '../components/EvolutionChart'
import { notasCriticas } from '../lib/critica'
import { useVolver } from '../lib/volver'
import { useMeta } from '../lib/meta'
import { RUTAS, idUniversidad, rutaSede, rutaUniversidad, slugSede } from '../lib/rutas'
import { NoEncontrada } from './NoEncontrada'
import { FuentesDatos } from '../components/FuentesDatos'
import { METRICAS } from '../lib/metricas'
import { decimal, formatMoneda, formatNumero, formatPorcentaje, ubicacion, unidadMonetaria } from '../lib/format'
import { gastoExtranjeros, gastoPorEstudiante, pctExtranjeros } from '../lib/extranjeros'

// Prefijo de las notas generadas desde el Portal de Información Universitaria de la AGN
// (scripts/enriquecer_piu_extranjeros.py).
const NOTA_PIU = 'Ejecución presupuestaria (PIU-AGN)'

const statGridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const statCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
} as const
/**
 * Celda de una sola pieza dentro del panel de estadísticas: usa flexbox (no grid) para que cada
 * fila reparta el ancho sobrante entre sus propias celdas. Así, si el número de items es impar y
 * la última fila queda con menos celdas, esas celdas crecen para ocupar toda la línea en vez de
 * dejar un hueco vacío — el grid clásico con columnas fijas no puede hacer esto porque las columnas
 * se comparten entre todas las filas.
 */
function StatCell({
  alerta,
  children,
}: {
  alerta?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      variants={statCardVariants}
      transition={{ duration: 0.2 }}
      className={`flex-1 min-w-[210px] px-5 py-4 transition-colors duration-200 ease-out ${
        alerta ? 'bg-[#e2574c]/[0.12] hover:bg-[#e2574c]/20' : 'bg-upl-principal-light/40 hover:bg-upl-principal-light/55'
      }`}
    >
      {children}
    </motion.div>
  )
}

/**
 * Texto de ayuda recortado a 3 líneas por defecto, con un toggle "Ver más/menos" que solo aparece
 * si el texto realmente se corta (scrollHeight > clientHeight una vez montado) — así una celda con
 * un dato corto no muestra un toggle inútil, pero ninguna pierde información al recortarse.
 */
function ClampedHint({ text, alerta }: { text: string; alerta?: boolean }) {
  const [expandido, setExpandido] = useState(false)
  const [truncado, setTruncado] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function medir() {
      const el = ref.current
      if (el) setTruncado(el.scrollHeight - el.clientHeight > 1)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [text])

  return (
    <div className="mt-1">
      <div ref={ref} className={`text-xs text-upl-crema/55 ${expandido ? '' : 'line-clamp-3'}`}>
        {text}
      </div>
      {(truncado || expandido) && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className={`mt-0.5 text-[11px] font-semibold underline decoration-dotted ${alerta ? 'text-[#ff8a7a]' : 'text-upl-resaltador'}`}
        >
          {expandido ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  alerta,
}: {
  label: string
  value: string
  hint?: string
  alerta?: boolean
}) {
  return (
    <StatCell alerta={alerta}>
      <div className={`text-xs uppercase tracking-wide font-semibold mb-1 ${alerta ? 'text-[#ff8a7a]' : 'text-upl-resaltador'}`}>
        {label}
      </div>
      <div className={`font-display font-800 text-2xl sm:text-3xl ${alerta ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}>{value}</div>
      {hint && <ClampedHint text={hint} alerta={alerta} />}
    </StatCell>
  )
}

function BarraProgreso({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ width: 0 }}
      whileInView={{ width: `${pct}%` }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
      className={color}
    />
  )
}

function StatCardRadial({
  label,
  pct,
  hint,
  alerta,
}: {
  label: string
  pct: number | null
  hint?: string
  alerta?: boolean
}) {
  const r = 26
  const circ = 2 * Math.PI * r
  const color = alerta ? '#ff8a7a' : '#facf3b'
  return (
    <StatCell alerta={alerta}>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 64 64" className="w-16 h-16 shrink-0 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={7} />
          {pct != null && (
            <motion.circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              whileInView={{ strokeDashoffset: circ * (1 - pct / 100) }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </svg>
        <div className="min-w-0">
          <div className={`text-xs uppercase tracking-wide font-semibold mb-1 ${alerta ? 'text-[#ff8a7a]' : 'text-upl-resaltador'}`}>
            {label}
          </div>
          <div className={`font-display font-800 text-2xl sm:text-3xl ${alerta ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}>
            {pct != null ? `${pct}%` : 'S/D'}
          </div>
          {hint && <ClampedHint text={hint} alerta={alerta} />}
        </div>
      </div>
    </StatCell>
  )
}

function toSerie(obj: Record<string, number | string> | undefined) {
  if (!obj) return []
  return Object.entries(obj)
    .map(([label, value]) => ({ label, value: typeof value === 'number' ? value : NaN }))
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => Number(a.label) - Number(b.label))
}

/**
 * Bloque desplegable de la ficha: cerrado muestra solo el título y una línea de resumen, y al hacer click
 * se abre con una transición de altura (grid 0fr → 1fr). El contenido queda en el DOM aunque esté
 * cerrado — lo lee el prerender para Google — pero `inert` lo saca del foco y de los lectores de pantalla.
 */
function Seccion({
  titulo,
  resumen,
  alerta,
  abierta,
  onToggle,
  seccionRef,
  children,
}: {
  titulo: string
  resumen: string
  alerta?: boolean
  abierta: boolean
  onToggle: () => void
  seccionRef?: React.Ref<HTMLDivElement>
  children: React.ReactNode
}) {
  return (
    <div
      ref={seccionRef}
      className={`scroll-mt-28 rounded-2xl border transition-colors duration-200 ${
        alerta ? 'border-[#e2574c]/35 bg-[#e2574c]/[0.07]' : 'border-upl-crema/12 bg-upl-principal-light/25'
      } ${abierta ? 'shadow-[0_8px_30px_rgba(10,8,30,0.3)]' : 'hover:bg-upl-crema/[0.06]'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierta}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-3.5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className={`font-display font-700 text-base ${alerta ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}>{titulo}</div>
          <div className="text-xs text-upl-crema/55 truncate">{resumen}</div>
        </div>
        <motion.svg
          viewBox="0 0 20 20"
          className={`w-5 h-5 shrink-0 ${alerta ? 'text-[#ff8a7a]' : 'text-upl-resaltador'}`}
          fill="currentColor"
          animate={{ rotate: abierta ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </motion.svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${abierta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        inert={!abierta}
      >
        <div className="overflow-hidden">
          <div className={`px-4 sm:px-5 pb-4 transition-opacity duration-300 ${abierta ? 'opacity-100' : 'opacity-0'}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}

export function Universidad() {
  const { slug = '', sede: slugDeSede } = useParams()
  const id = idUniversidad(slug)
  const sedesDeLaUni = id ? todasLasSedes.filter((s) => s.universidad === id) : []
  const sede = slugDeSede ? sedesDeLaUni.find((s) => slugSede(s.nombre) === slugDeSede) : undefined
  if (!id || (slugDeSede && !sede)) return <NoEncontrada />
  return <FichaUniversidad key={id} id={id} sedes={sedesDeLaUni} sede={sede} />
}

function descripcionFicha(u: NonNullable<ReturnType<typeof getUniversidad>>): string {
  if (!u.tieneDatos) return `${u.nombre} (${u.sigla}): todavía no informa datos al Anuario de Estadísticas Universitarias de la SPU.`
  const partes = [
    u.tasaCohorte != null && `${Math.round(100 - u.tasaCohorte)}% de los ingresantes no se recibe a tiempo`,
    u.sinMaterias2024 != null && u.inscriptos2024 && `${Math.round((u.sinMaterias2024 / u.inscriptos2024) * 100)}% de los inscriptos no aprobó ninguna materia en el año`,
    u.costoPorGraduado != null && !u.docentesNoComparable && `cada graduado cuesta ${formatMoneda(u.costoPorGraduado, { nominal: true })}`,
  ].filter(Boolean)
  return `${u.nombre} (${u.sigla}) en números: ${partes.join(', ')}. Datos oficiales de la SPU, 2024.`
}

function FichaUniversidad({ id, sedes, sede }: { id: string; sedes: typeof todasLasSedes; sede?: (typeof todasLasSedes)[number] }) {
  const u = getUniversidad(id)!
  const volver = useVolver(RUTAS.rankings)
  const sedesRef = useRef<HTMLDivElement>(null)
  // Todo cerrado al entrar (se ve solo el resumen); con una sede en la URL, se abre la lista de sedes.
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(sede ? ['sedes'] : []))

  // Una sede tiene su propio link (para compartirla o llegar desde el mapa), pero Google indexa una sola
  // página por universidad: el canónico de la sede apunta a la ficha.
  useMeta({
    titulo: sede
      ? `${sede.nombre}${sede.nombre.includes(sede.ciudad) ? '' : ` (${sede.ciudad})`} — ${u.sigla}`
      : `${u.nombre} (${u.sigla})`,
    descripcion: descripcionFicha(u),
    ruta: sede ? rutaSede(id, sede.nombre) : rutaUniversidad(id),
    canonica: rutaUniversidad(id),
  })

  // Con una sede en la URL, baja hasta la lista de sedes. Con delay: la transición de página (PageFade)
  // hace scrollTo(0, 0) al montarse, y su efecto corre después que este.
  useEffect(() => {
    if (!sede) return
    setAbiertas((prev) => (prev.has('sedes') ? prev : new Set(prev).add('sedes')))
    const t = setTimeout(() => sedesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
    return () => clearTimeout(t)
  }, [sede])

  const serieEstudiantes = toSerie(u.serieEstudiantes)
  const serieEgresados = toSerie(u.serieEgresados)
  const serieIngresantes = toSerie(u.serieNuevosInscriptos)
  const serieCohorte = u.serieTasaCohorte
    ? Object.entries(u.serieTasaCohorte)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => Number(a.label) - Number(b.label))
    : []
  const serieCostoReal = toSerie(u.serieCostoPorGraduadoReal)
  const serieCostoNominal = toSerie(u.serieCostoPorGraduadoNominal)

  const sinMaterias = METRICAS.ceroMaterias.valor({ id, ...u })
  const activosPorDocente = METRICAS.docentes.valor({ id, ...u })
  const promedioSinMaterias = METRICAS.ceroMaterias.agregado(universidadesArray)
  const promedioActivos = METRICAS.docentes.agregado(universidadesArray)
  const criticas = u.tieneDatos ? notasCriticas(u) : []
  const graficos = [serieCohorte.length >= 2, true, true, true, serieCostoReal.length >= 2].filter(Boolean).length

  const secciones: { id: string; titulo: string; resumen: string; alerta?: boolean; contenido: React.ReactNode }[] = []
  if (u.tieneDatos) {
    secciones.push({
      id: 'indicadores',
      titulo: 'Matrícula, docentes y quiénes cursan',
      resumen: `${formatNumero(u.estudiantes2024)} estudiantes · ${formatNumero(u.cargosDocentes2024 ?? u.docentesUniversitario)} cargos docentes · ${formatNumero(u.personalNoDocente)} no docentes`,
      contenido: (
        <>
          <div className="rounded-xl overflow-hidden flex flex-wrap gap-px border border-upl-crema/12 bg-upl-crema/15">
            <StatCard
              label="Matrícula 2024"
              value={formatNumero(u.estudiantes2024)}
              hint={
                u.estudiantesActivos2024 != null
                  ? `${formatNumero(u.estudiantesActivos2024)} aprobaron al menos una materia en el año (activos)`
                  : 'Estudiantes de pregrado y grado'
              }
            />
            <StatCard
              label="Cargos docentes"
              value={formatNumero(u.cargosDocentes2024)}
              hint={
                u.docentesNoComparable
                  ? 'Dato incompleto, no comparable: la mayor parte del plantel depende de las Fuerzas Armadas (ver Antecedentes)'
                  : `Cargos universitarios a septiembre 2024 (RHUN) — una persona puede tener más de uno. ${formatNumero(u.docentesUniversitario)} docentes informados como personas`
              }
            />
            {u.extranjeros2024 != null && (
              <StatCard
                label="Estudiantes extranjeros"
                value={`${formatNumero(u.extranjeros2024)} · ${formatPorcentaje(pctExtranjeros(u))}`}
                hint={
                  gastoExtranjeros(u) != null
                    ? `Costo para el Estado: ${formatMoneda(gastoExtranjeros(u))} por año (${formatMoneda(gastoPorEstudiante(u))} por estudiante) — lo que se ahorraría con un arancel para extranjeros`
                    : 'Porcentaje del padrón de grado 2024. Sin presupuesto 2024 informado para estimar su costo'
                }
                alerta={(pctExtranjeros(u) ?? 0) >= 5}
              />
            )}
            <StatCard
              label="Planta no docente"
              value={formatNumero(u.personalNoDocente)}
              hint={
                u.docentesNoComparable
                  ? 'Relación con docentes no comparable: la planta docente informada está incompleta'
                  : u.docentesUniversitario && u.personalNoDocente
                  ? `1 no docente cada ${decimal(u.docentesUniversitario / u.personalNoDocente)} docentes universitarios`
                  : 'Sin dato de personal no docente'
              }
            />
          </div>

          {u.inscriptos2024 && u.sinMaterias2024 != null && u.unaMateria2024 != null && (
            <div className="mt-3 rounded-xl bg-upl-principal/30 px-4 py-3.5">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1">
                Cuántos cursan de verdad
              </div>
              <p className="text-xs text-upl-crema/50 mb-3">
                Materias aprobadas en 2024 por los {formatNumero(u.inscriptos2024)} inscriptos (reinscriptos + nuevos
                inscriptos).
              </p>
              {(() => {
                const total = u.inscriptos2024!
                const cero = u.sinMaterias2024!
                const unaMateria = u.unaMateria2024!
                const dosOMas = Math.max(total - cero - unaMateria, 0)
                const pct = (n: number) => Math.round((n / total) * 100)
                return (
                  <>
                    <div className="flex h-3 rounded-full overflow-hidden bg-upl-principal/40">
                      <BarraProgreso pct={pct(dosOMas)} color="bg-[#8fd19e]" />
                      <BarraProgreso pct={pct(unaMateria)} color="bg-upl-resaltador" delay={0.1} />
                      <BarraProgreso pct={pct(cero)} color="bg-[#e2574c]" delay={0.2} />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-upl-crema/70">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8fd19e] shrink-0" />
                        2 o más materias: {pct(dosOMas)}% ({formatNumero(dosOMas)})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-upl-resaltador shrink-0" />
                        1 materia: {pct(unaMateria)}% ({formatNumero(unaMateria)})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#e2574c] shrink-0" />
                        Ninguna: {pct(cero)}% ({formatNumero(cero)})
                      </span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {u.dedicacionDocente && (
            <div className="mt-3 rounded-xl bg-upl-principal/30 px-4 py-3.5">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1">
                Cargos docentes por dedicación — 2017 vs. 2023
              </div>
              {(() => {
                const d = u.dedicacionDocente!
                const total2017 = d.excl2017 + d.semi2017 + d.simple2017
                const total2023 = d.excl2023 + d.semi2023 + d.simple2023
                const varCargos = ((total2023 - total2017) / total2017) * 100
                const varFte = ((d.fte2023 - d.fte2017) / d.fte2017) * 100
                const bar = (excl: number, semi: number, simple: number, total: number, delayBase: number) => (
                  <div className="flex h-3 rounded-full overflow-hidden bg-upl-principal/40">
                    <BarraProgreso pct={(excl / total) * 100} color="bg-[#8fd19e]" delay={delayBase} />
                    <BarraProgreso pct={(semi / total) * 100} color="bg-upl-resaltador" delay={delayBase + 0.1} />
                    <BarraProgreso pct={(simple / total) * 100} color="bg-[#e2574c]" delay={delayBase + 0.2} />
                  </div>
                )
                return (
                  <>
                    <p className="text-xs text-upl-crema/50 mb-3">
                      Los cargos "Simple" (menor carga horaria) crecieron de {formatNumero(d.simple2017)} a{' '}
                      {formatNumero(d.simple2023)}; los "Exclusiva" (dedicación completa), de{' '}
                      {formatNumero(d.excl2017)} a {formatNumero(d.excl2023)}. Los cargos totales crecieron{' '}
                      {varCargos >= 0 ? '+' : ''}
                      {decimal(varCargos)}%, pero el equivalente a tiempo completo (FTE, pondera por dedicación)
                      solo {varFte >= 0 ? '+' : ''}
                      {decimal(varFte)}%.
                    </p>
                    <div className="grid grid-cols-[3rem_1fr] items-center gap-x-3 gap-y-2">
                      <span className="text-xs text-upl-crema/50">2017</span>
                      {bar(d.excl2017, d.semi2017, d.simple2017, total2017, 0)}
                      <span className="text-xs text-upl-crema/50">2023</span>
                      {bar(d.excl2023, d.semi2023, d.simple2023, total2023, 0.35)}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-upl-crema/70">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8fd19e] shrink-0" />
                        Exclusiva
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-upl-resaltador shrink-0" />
                        Semiexclusiva
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#e2574c] shrink-0" />
                        Simple
                      </span>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </>
      ),
    })

    secciones.push({
      id: 'evolucion',
      titulo: 'Evolución histórica',
      resumen: `${graficos} gráficos: ${serieCohorte.length >= 2 ? 'tasa de egreso, ' : ''}matrícula, ingresantes, egresados${serieCostoReal.length >= 2 ? ' y costo por graduado' : ''}`,
      contenido: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {serieCohorte.length >= 2 && (
            <div className="rounded-xl bg-upl-principal/30 px-4 py-3.5 sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                Tasa de cohorte por año de egreso
              </div>
              <EvolutionChart data={serieCohorte} color="#facf3b" formatValue={(v) => `${v}%`} height={140} />
            </div>
          )}
          <div className="rounded-xl bg-upl-principal/30 px-4 py-3.5">
            <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">Estudiantes totales</div>
            <EvolutionChart data={serieEstudiantes} color="#8fb7ff" formatValue={(v) => formatNumero(v)} />
          </div>
          <div className="rounded-xl bg-upl-principal/30 px-4 py-3.5">
            <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">Ingresantes nuevos</div>
            <EvolutionChart data={serieIngresantes} color="#8fb7ff" formatValue={(v) => formatNumero(v)} />
          </div>
          <div className="rounded-xl bg-upl-principal/30 px-4 py-3.5">
            <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">Egresados por año</div>
            <EvolutionChart data={serieEgresados} color="#e4b862" formatValue={(v) => formatNumero(v)} />
          </div>
          {serieCostoReal.length >= 2 && (
            <div className="rounded-xl bg-upl-principal/30 px-4 py-3.5 sm:col-span-2">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                Costo por graduado — {unidadMonetaria()}
              </div>
              <EvolutionChart data={serieCostoReal} color="#ff8a7a" formatValue={(v) => formatMoneda(v)} />
              <p className="text-xs text-upl-crema/40 mt-2">
                En pesos corrientes de cada año (sin ajustar por inflación) hubiera mostrado{' '}
                {serieCostoNominal.length >= 2 &&
                  `${formatMoneda(serieCostoNominal[0].value, { nominal: true })} → ${formatMoneda(serieCostoNominal[serieCostoNominal.length - 1].value, { nominal: true })}`}
                , una comparación sin sentido dada la inflación acumulada del período — por eso esta ficha usa
                siempre pesos constantes de agosto 2026 (deflactados por IPC).
              </p>
            </div>
          )}
        </div>
      ),
    })
  }

  if (criticas.length > 0) {
    secciones.push({
      id: 'criticas',
      titulo: 'Lo que exponen los números',
      resumen: `${criticas.length} ${criticas.length === 1 ? 'alerta' : 'alertas'} — ${criticas[0]}`,
      alerta: true,
      contenido: (
        <ul className="flex flex-col gap-2">
          {criticas.map((nota, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-[#e2574c]/40 bg-[#e2574c]/10 px-4 py-3">
              <span className="text-[#ff8a7a] font-display font-800">⚠</span>
              <span className="text-sm text-upl-crema/90">{nota}</span>
            </li>
          ))}
        </ul>
      ),
    })
  }

  if (sedes.length > 0) {
    secciones.push({
      id: 'sedes',
      titulo: 'Sedes y unidades académicas',
      resumen: `${sedes.length} ${sedes.length === 1 ? 'sede' : 'sedes'}: ${sedes.slice(0, 3).map((s) => s.nombre).join(', ')}${sedes.length > 3 ? '…' : ''}`,
      contenido: (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sedes.map((s) => {
            const activa = s.id === sede?.id
            return (
              <li key={s.id}>
                <Link
                  to={rutaSede(id, s.nombre)}
                  replace
                  aria-current={activa ? 'location' : undefined}
                  className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 transition-colors ${
                    activa ? 'bg-[#8fb7ff]/20 border border-[#8fb7ff]/60' : 'bg-upl-principal/30 hover:bg-upl-crema/10'
                  }`}
                >
                  <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-[#8fb7ff]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-upl-crema leading-snug">{s.nombre}</span>
                    <span className="block text-xs text-upl-crema/55">{ubicacion(s.ciudad, s.provincia)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      ),
    })
  }

  if (u.notas.length > 0 || (u.fuentes?.length ?? 0) > 0) {
    secciones.push({
      id: 'antecedentes',
      titulo: 'Antecedentes y fuentes',
      resumen: `${u.notas.length} ${u.notas.length === 1 ? 'nota' : 'notas'}${u.fuentes?.length ? ` · ${u.fuentes.length} ${u.fuentes.length === 1 ? 'fuente' : 'fuentes'}` : ''} — ${u.notas[0] ?? ''}`,
      contenido: (
        <>
          <ul className="flex flex-col gap-2">
            {u.notas.map((nota, i) => (
              <li key={i} className="flex gap-3 rounded-xl bg-upl-principal/30 px-4 py-3">
                <span className="text-upl-resaltador font-display font-800">·</span>
                <span className="text-sm text-upl-crema/85">
                  {nota.startsWith(NOTA_PIU) ? (
                    <>
                      <span className="font-semibold text-upl-resaltador">{NOTA_PIU}:</span>
                      {nota.slice(NOTA_PIU.length + 1)}
                    </>
                  ) : (
                    nota
                  )}
                </span>
              </li>
            ))}
          </ul>
          {u.fuentes && u.fuentes.length > 0 && (
            <div className="mt-3 rounded-xl bg-upl-principal/30 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1.5">Fuentes</div>
              <ul className="flex flex-col gap-1">
                {u.fuentes.map((f) => (
                  <li key={f.url} className="text-sm">
                    {/\.(webp|jpe?g|png)$/i.test(f.url) && (
                      <a href={f.url} target="_blank" rel="noreferrer" className="block my-2 max-w-sm">
                        <img src={f.url} alt={f.titulo} className="rounded-lg shadow-lg" loading="lazy" />
                      </a>
                    )}
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-upl-crema/80 underline decoration-upl-resaltador/60 hover:text-upl-amarillo"
                    >
                      {f.titulo} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ),
    })
  }

  const alternar = (s: string) =>
    setAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  const todasAbiertas = secciones.length > 0 && secciones.every((s) => abiertas.has(s.id))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button type="button" onClick={volver} className="text-sm text-upl-crema/50 hover:text-upl-crema">
        ← Volver
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-3 flex items-center gap-4"
      >
        <UniversidadBadge sigla={u.sigla} size="lg" />
        <div>
          <h1 className="font-display font-800 text-2xl sm:text-3xl text-upl-crema leading-tight">{u.nombre}</h1>
          <p className="text-upl-crema/60">
            {ubicacion(u.ciudad, u.provincia)} · Fundada en {u.fundacion} ·{' '}
            <a href={u.sitio} target="_blank" rel="noreferrer" className="underline decoration-upl-resaltador">
              sitio oficial
            </a>
          </p>
          {u.esKirchnerista && (
            <Link
              to={RUTAS.kirchneristas}
              className="mt-1 inline-block rounded-full bg-[#e2574c]/15 border border-[#e2574c]/40 text-[#ff8a7a] text-xs font-semibold px-3 py-1 transition-colors hover:bg-[#e2574c]/25"
            >
              Universidad creada durante un gobierno kirchnerista →
            </Link>
          )}
        </div>
      </motion.div>

      {sede && (
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[#8fb7ff]/40 bg-[#8fb7ff]/10 px-4 py-2.5 text-sm text-upl-crema/85">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#8fb7ff]" />
          <span>
            <span className="font-semibold text-upl-crema">{sede.nombre}</span> · {sede.ciudad} — sede de la {u.sigla}. Los
            datos de la ficha son de toda la universidad.
          </span>
        </div>
      )}

      {!u.tieneDatos ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-upl-amarillo/60 glass px-5 py-6">
          <p className="font-display font-700 text-upl-crema mb-2">Sin datos reportados en el Anuario de la SPU</p>
          <p className="text-sm text-upl-crema/70">
            Esta universidad todavía no informa estudiantes, egresados, docentes ni presupuesto ejecutado a la
            Secretaría de Políticas Universitarias.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-display font-700 text-lg text-upl-crema">Resumen</h2>
            <span className="text-xs text-upl-crema/45">Datos 2024</span>
          </div>
          <motion.div
            variants={statGridVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl overflow-hidden flex flex-wrap gap-px border border-upl-crema/12 bg-upl-crema/15 [backdrop-filter:blur(18px)] shadow-[0_8px_30px_rgba(10,8,30,0.35)]"
          >
            <StatCardRadial
              label="No llega a graduarse"
              pct={u.tasaCohorte != null ? Math.round(100 - u.tasaCohorte) : null}
              hint={
                u.nuevosInscriptos2018
                  ? `Sobre ${formatNumero(u.nuevosInscriptos2018)} inscriptos en 2018, solo ${formatNumero(u.egresados2024)} se graduaron en 2024 (${formatPorcentaje(u.tasaCohorte)})`
                  : 'Universidad muy joven: sin ventana de 6 años aún'
              }
              alerta
            />
            <StatCardRadial
              label="No aprobó ninguna materia"
              pct={sinMaterias != null ? Math.round(sinMaterias) : null}
              hint={
                sinMaterias != null
                  ? `${formatNumero(u.sinMaterias2024)} de ${formatNumero(u.inscriptos2024)} inscriptos 2024 (reinscriptos + ingresantes) — sistema: ${formatPorcentaje(promedioSinMaterias)}`
                  : 'La SPU no informa materias aprobadas para esta universidad'
              }
              alerta
            />
            <StatCard
              label="Estudiantes activos por docente"
              value={
                u.docentesNoComparable ? 'No comparable' : activosPorDocente != null ? `${decimal(activosPorDocente)} x 1` : 'S/D'
              }
              hint={
                u.docentesNoComparable
                  ? `La SPU informa solo ${formatNumero(u.cargosDocentes2024)} cargos docentes propios: su plantel depende de las Fuerzas Armadas`
                  : activosPorDocente != null
                  ? `${formatNumero(u.estudiantesActivos2024)} estudiantes que aprobaron al menos una materia, para ${formatNumero(u.cargosDocentes2024)} cargos docentes — sistema: ${decimal(promedioActivos ?? 0)} x 1`
                  : 'Sin cargos docentes informados en RHUN'
              }
              alerta={activosPorDocente != null && activosPorDocente < 4}
            />
            <StatCard
              label="Costo por graduado"
              value={formatMoneda(u.costoPorGraduado)}
              hint={
                u.docentesNoComparable
                  ? 'No comparable: el presupuesto informado no incluye al plantel docente de las Fuerzas Armadas'
                  : `Presupuesto ejecutado 2024 / egresados 2024 — ${unidadMonetaria()}`
              }
              alerta={!u.docentesNoComparable && !!u.costoPorGraduado && u.costoPorGraduado > 15_000_000}
            />
          </motion.div>
        </>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-display font-700 text-lg text-upl-crema">{u.tieneDatos ? 'Todos los datos' : 'Más información'}</h2>
        <button
          type="button"
          onClick={() => setAbiertas(todasAbiertas ? new Set() : new Set(secciones.map((s) => s.id)))}
          className="rounded-full glass-chip text-upl-crema text-xs font-semibold px-3 py-1.5 hover:bg-upl-crema/15 transition-colors"
        >
          {todasAbiertas ? 'Cerrar todo' : 'Abrir todo'}
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {secciones.map((s) => (
          <Seccion
            key={s.id}
            titulo={s.titulo}
            resumen={s.resumen}
            alerta={s.alerta}
            abierta={abiertas.has(s.id)}
            onToggle={() => alternar(s.id)}
            seccionRef={s.id === 'sedes' ? sedesRef : undefined}
          >
            {s.contenido}
          </Seccion>
        ))}
      </div>

      <FuentesDatos className="mt-8 mb-8" />
    </div>
  )
}
