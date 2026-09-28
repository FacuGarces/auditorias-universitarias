import { Link, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { getUniversidad } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { EvolutionChart } from '../components/EvolutionChart'
import { notasCriticas } from '../lib/critica'
import { formatMoneda, formatNumero, formatPorcentaje, ubicacion } from '../lib/format'
import { desgloseMatricula } from '../lib/matricula'

const statGridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}
const statCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
} as const
const revealProps = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.45, ease: 'easeOut' },
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
      {hint && <div className="text-xs text-upl-crema/55 mt-1">{hint}</div>}
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
          {hint && <div className="text-xs text-upl-crema/55 mt-1">{hint}</div>}
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

export function Universidad() {
  const { id = '' } = useParams()
  const u = getUniversidad(id)

  if (!u) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-upl-crema">No encontramos esa universidad.</p>
        <Link to="/" className="underline text-upl-resaltador">
          Volver al mapa
        </Link>
      </div>
    )
  }

  const serieEstudiantes = toSerie(u.serieEstudiantes)
  const serieEgresados = toSerie(u.serieEgresados)
  const serieIngresantes = toSerie(u.serieNuevosInscriptos)
  const desglose = desgloseMatricula(u)
  const serieCohorte = u.serieTasaCohorte
    ? Object.entries(u.serieTasaCohorte)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => Number(a.label) - Number(b.label))
    : []
  const serieCostoReal = toSerie(u.serieCostoPorGraduadoReal)
  const serieCostoNominal = toSerie(u.serieCostoPorGraduadoNominal)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/ranking" className="text-sm text-upl-crema/50 hover:text-upl-crema">
        ← Volver al ranking
      </Link>

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
              to="/kirchneristas"
              className="mt-1 inline-block rounded-full bg-[#e2574c]/15 border border-[#e2574c]/40 text-[#ff8a7a] text-xs font-semibold px-3 py-1 transition-colors hover:bg-[#e2574c]/25"
            >
              Universidad creada durante un gobierno kirchnerista →
            </Link>
          )}
        </div>
      </motion.div>

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
          <motion.div
            variants={statGridVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 rounded-2xl overflow-hidden flex flex-wrap gap-px border border-upl-crema/12 bg-upl-crema/15 [backdrop-filter:blur(18px)] shadow-[0_8px_30px_rgba(10,8,30,0.35)]"
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
              pct={desglose ? Math.round((desglose.cero / desglose.total) * 100) : null}
              hint={
                desglose
                  ? `${formatNumero(desglose.cero)} de ${formatNumero(desglose.total)} estudiantes matriculados — incluye ${formatNumero(u.reinscriptos0Materias)} reinscriptos que cursaron y no aprobaron nada, más ${formatNumero(desglose.ingresantesNuevos)} ingresantes nuevos que recién empiezan`
                  : undefined
              }
              alerta
            />
            <StatCard
              label="Costo por graduado"
              value={formatMoneda(u.costoPorGraduado)}
              hint="Presupuesto ejecutado 2024 / egresados 2024 — pesos constantes de agosto 2026"
              alerta={!!u.costoPorGraduado && u.costoPorGraduado > 15_000_000}
            />
            <StatCard
              label="Matrícula 2024"
              value={formatNumero(u.estudiantes2024)}
              hint={
                u.estudiantesActivosPorDocente != null
                  ? `${formatNumero(u.docentesUniversitario)} docentes · ${u.estudiantesActivosPorDocente} activos por docente (vs. ${u.estudiantesPorDocente} sobre el total)`
                  : `${formatNumero(u.docentesUniversitario)} docentes · ${formatNumero(u.reinscriptosRegulares2mas)} regulares (2+ materias aprobadas)`
              }
            />
            <StatCard
              label="Planta no docente"
              value={formatNumero(u.personalNoDocente)}
              hint={
                u.docentesUniversitario && u.personalNoDocente
                  ? `1 no docente cada ${(u.docentesUniversitario / u.personalNoDocente).toFixed(1)} docentes universitarios`
                  : 'Sin dato de personal no docente'
              }
            />
          </motion.div>

          {desglose && (
            <motion.div {...revealProps} className="mt-3 glass rounded-2xl px-5 py-4">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1">
                Quiénes aprobaron materias sobre el total de la matrícula
              </div>
              <p className="text-xs text-upl-crema/50 mb-3">
                De {formatNumero(desglose.total)} estudiantes totales en 2024, {formatNumero(desglose.ingresantesNuevos)}{' '}
                son ingresantes nuevos de ese año — por recién haber empezado, cuentan igual que quien cursó todo el
                año y no aprobó nada: ambos suman al bucket de "0 materias".
              </p>
              {(() => {
                const { total, regulares, unaMateria, cero } = desglose
                const pct = (n: number) => Math.round((n / total) * 100)
                return (
                  <>
                    <div className="flex h-3 rounded-full overflow-hidden bg-upl-principal/40">
                      <BarraProgreso pct={pct(regulares)} color="bg-[#8fd19e]" />
                      <BarraProgreso pct={pct(unaMateria)} color="bg-upl-resaltador" delay={0.1} />
                      <BarraProgreso pct={pct(cero)} color="bg-[#e2574c]" delay={0.2} />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2.5 text-xs text-upl-crema/70">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8fd19e] shrink-0" />
                        Regulares (2+ materias): {pct(regulares)}% ({formatNumero(regulares)})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-upl-resaltador shrink-0" />
                        1 materia: {pct(unaMateria)}% ({formatNumero(unaMateria)})
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#e2574c] shrink-0" />
                        0 materias: {pct(cero)}% ({formatNumero(cero)})
                      </span>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          )}

          {u.dedicacionDocente && (
            <motion.div {...revealProps} className="mt-3 glass rounded-2xl px-5 py-4">
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
                      {varCargos.toFixed(1)}%, pero el equivalente a tiempo completo (FTE, pondera por dedicación)
                      solo {varFte >= 0 ? '+' : ''}
                      {varFte.toFixed(1)}%.
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
            </motion.div>
          )}

          <div className="mt-8">
            <h2 className="font-display font-700 text-lg text-upl-crema mb-3">Evolución histórica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {serieCohorte.length >= 2 && (
                <motion.div {...revealProps} className="glass rounded-2xl px-5 py-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                    Tasa de cohorte por año de egreso
                  </div>
                  <EvolutionChart data={serieCohorte} color="#facf3b" formatValue={(v) => `${v}%`} height={140} />
                </motion.div>
              )}
              <motion.div {...revealProps} className="glass rounded-2xl px-5 py-4">
                <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                  Estudiantes totales
                </div>
                <EvolutionChart data={serieEstudiantes} color="#8fb7ff" formatValue={(v) => formatNumero(v)} />
              </motion.div>
              <motion.div {...revealProps} className="glass rounded-2xl px-5 py-4">
                <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                  Ingresantes nuevos
                </div>
                <EvolutionChart data={serieIngresantes} color="#8fb7ff" formatValue={(v) => formatNumero(v)} />
              </motion.div>
              <motion.div {...revealProps} className="glass rounded-2xl px-5 py-4">
                <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                  Egresados por año
                </div>
                <EvolutionChart data={serieEgresados} color="#e4b862" formatValue={(v) => formatNumero(v)} />
              </motion.div>
              {serieCostoReal.length >= 2 && (
                <motion.div {...revealProps} className="glass rounded-2xl px-5 py-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                    Costo por graduado — pesos constantes de agosto 2026
                  </div>
                  <EvolutionChart data={serieCostoReal} color="#ff8a7a" formatValue={(v) => formatMoneda(v)} />
                  <p className="text-xs text-upl-crema/40 mt-2">
                    En pesos corrientes de cada año (sin ajustar por inflación) hubiera mostrado{' '}
                    {serieCostoNominal.length >= 2 &&
                      `${formatMoneda(serieCostoNominal[0].value)} → ${formatMoneda(serieCostoNominal[serieCostoNominal.length - 1].value)}`}
                    , una comparación sin sentido dada la inflación acumulada del período — por eso esta ficha usa
                    siempre pesos constantes de agosto 2026 (deflactados por IPC).
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </>
      )}

      {u.tieneDatos && notasCriticas(u).length > 0 && (
        <div className="mt-8">
          <h2 className="font-display font-700 text-lg text-[#ff8a7a] mb-3">Lo que exponen los números</h2>
          <motion.ul
            className="flex flex-col gap-2"
            variants={statGridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {notasCriticas(u).map((nota, i) => (
              <motion.li
                key={i}
                variants={statCardVariants}
                className="flex gap-3 rounded-xl border border-[#e2574c]/40 bg-[#e2574c]/10 px-4 py-3"
              >
                <span className="text-[#ff8a7a] font-display font-800">⚠</span>
                <span className="text-sm text-upl-crema/90">{nota}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display font-700 text-lg text-upl-crema mb-3">Antecedentes</h2>
        <motion.ul
          className="flex flex-col gap-2"
          variants={statGridVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {u.notas.map((nota, i) => (
            <motion.li key={i} variants={statCardVariants} className="flex gap-3 rounded-xl glass px-4 py-3">
              <span className="text-upl-resaltador font-display font-800">·</span>
              <span className="text-sm text-upl-crema/85">{nota}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      <p className="mt-8 mb-8 text-xs text-upl-crema/40">
        Fuente: Anuarios de Estadísticas Universitarias — Secretaría de Políticas Universitarias (SPU). Año de
        referencia 2024, salvo indicación contraria.
      </p>
    </div>
  )
}
