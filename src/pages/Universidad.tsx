import { Link, useParams } from 'react-router-dom'
import { getUniversidad } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { EvolutionChart } from '../components/EvolutionChart'
import { notasCriticas } from '../lib/critica'
import { formatMoneda, formatNumero, formatPorcentaje, ubicacion } from '../lib/format'

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
    <div className={`glass rounded-2xl px-5 py-4 ${alerta ? 'border-[#e2574c]/50 bg-[#e2574c]/10' : ''}`}>
      <div className={`text-xs uppercase tracking-wide font-semibold mb-1 ${alerta ? 'text-[#ff8a7a]' : 'text-upl-resaltador'}`}>
        {label}
      </div>
      <div className={`font-display font-800 text-2xl sm:text-3xl ${alerta ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}>{value}</div>
      {hint && <div className="text-xs text-upl-crema/55 mt-1">{hint}</div>}
    </div>
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

      <div className="mt-3 flex items-center gap-4">
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
              className="mt-1 inline-block rounded-full bg-[#e2574c]/15 border border-[#e2574c]/40 text-[#ff8a7a] text-xs font-semibold px-3 py-1"
            >
              Universidad creada durante un gobierno kirchnerista →
            </Link>
          )}
        </div>
      </div>

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
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="No llega a graduarse"
              value={u.tasaCohorte != null ? `${Math.round(100 - u.tasaCohorte)}%` : 'S/D'}
              hint={
                u.nuevosInscriptos2018
                  ? `Sobre ${formatNumero(u.nuevosInscriptos2018)} inscriptos en 2018, solo ${formatNumero(u.egresados2024)} se graduaron en 2024 (${formatPorcentaje(u.tasaCohorte)})`
                  : 'Universidad muy joven: sin ventana de 6 años aún'
              }
              alerta
            />
            <StatCard
              label="No aprobó ninguna materia"
              value={
                u.reinscriptos0Materias != null && u.reinscriptosTotal
                  ? `${Math.round((u.reinscriptos0Materias / u.reinscriptosTotal) * 100)}%`
                  : 'S/D'
              }
              hint={`${formatNumero(u.reinscriptos0Materias)} de ${formatNumero(u.reinscriptosTotal)} reinscriptos, en el último año informado`}
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
          </div>

          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Planta no docente"
              value={formatNumero(u.personalNoDocente)}
              hint={
                u.docentesUniversitario && u.personalNoDocente
                  ? `1 no docente cada ${(u.docentesUniversitario / u.personalNoDocente).toFixed(1)} docentes universitarios`
                  : 'Sin dato de personal no docente'
              }
            />
          </div>

          {u.reinscriptosTotal != null && u.reinscriptosRegulares2mas != null && u.reinscriptos0Materias != null && (
            <div className="mt-3 glass rounded-2xl px-5 py-4">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1">
                Quiénes son "activos" sobre el total de la matrícula
              </div>
              <p className="text-xs text-upl-crema/50 mb-3">
                De {formatNumero(u.estudiantes2024)} estudiantes totales en 2024, {formatNumero(u.reinscriptosTotal)}{' '}
                ya venían cursando (reinscriptos) — el resto son ingresantes nuevos de ese año, todavía sin
                materias que evaluar.
              </p>
              {(() => {
                const total = u.reinscriptosTotal!
                const regulares = u.reinscriptosRegulares2mas!
                const cero = u.reinscriptos0Materias!
                const unaMateria = Math.max(total - regulares - cero, 0)
                const pct = (n: number) => Math.round((n / total) * 100)
                return (
                  <>
                    <div className="flex h-3 rounded-full overflow-hidden bg-upl-principal/40">
                      <div style={{ width: `${pct(regulares)}%` }} className="bg-[#8fd19e]" title="Regulares (2+ materias)" />
                      <div style={{ width: `${pct(unaMateria)}%` }} className="bg-upl-resaltador" title="1 materia aprobada" />
                      <div style={{ width: `${pct(cero)}%` }} className="bg-[#e2574c]" title="0 materias aprobadas" />
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
            </div>
          )}

          {u.dedicacionDocente && (
            <div className="mt-3 glass rounded-2xl px-5 py-4">
              <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1">
                Cargos docentes por dedicación — 2017 vs. 2023
              </div>
              {(() => {
                const d = u.dedicacionDocente!
                const total2017 = d.excl2017 + d.semi2017 + d.simple2017
                const total2023 = d.excl2023 + d.semi2023 + d.simple2023
                const varCargos = ((total2023 - total2017) / total2017) * 100
                const varFte = ((d.fte2023 - d.fte2017) / d.fte2017) * 100
                const bar = (excl: number, semi: number, simple: number, total: number) => (
                  <div className="flex h-3 rounded-full overflow-hidden bg-upl-principal/40">
                    <div style={{ width: `${(excl / total) * 100}%` }} className="bg-[#8fd19e]" title="Exclusiva" />
                    <div style={{ width: `${(semi / total) * 100}%` }} className="bg-upl-resaltador" title="Semiexclusiva" />
                    <div style={{ width: `${(simple / total) * 100}%` }} className="bg-[#e2574c]" title="Simple" />
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
                      {bar(d.excl2017, d.semi2017, d.simple2017, total2017)}
                      <span className="text-xs text-upl-crema/50">2023</span>
                      {bar(d.excl2023, d.semi2023, d.simple2023, total2023)}
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

          <div className="mt-8">
            <h2 className="font-display font-700 text-lg text-upl-crema mb-3">Evolución histórica</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {serieCohorte.length >= 2 && (
                <div className="glass rounded-2xl px-5 py-4 sm:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                    Tasa de cohorte por año de egreso
                  </div>
                  <EvolutionChart data={serieCohorte} color="#facf3b" formatValue={(v) => `${v}%`} height={140} />
                </div>
              )}
              <div className="glass rounded-2xl px-5 py-4">
                <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                  Estudiantes totales
                </div>
                <EvolutionChart data={serieEstudiantes} color="#8fb7ff" formatValue={(v) => formatNumero(v)} />
              </div>
              <div className="glass rounded-2xl px-5 py-4">
                <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">
                  Egresados por año
                </div>
                <EvolutionChart data={serieEgresados} color="#e4b862" formatValue={(v) => formatNumero(v)} />
              </div>
              {serieCostoReal.length >= 2 && (
                <div className="glass rounded-2xl px-5 py-4 sm:col-span-2">
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
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {u.tieneDatos && notasCriticas(u).length > 0 && (
        <div className="mt-8">
          <h2 className="font-display font-700 text-lg text-[#ff8a7a] mb-3">Lo que exponen los números</h2>
          <ul className="flex flex-col gap-2">
            {notasCriticas(u).map((nota, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-[#e2574c]/40 bg-[#e2574c]/10 px-4 py-3">
                <span className="text-[#ff8a7a] font-display font-800">⚠</span>
                <span className="text-sm text-upl-crema/90">{nota}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display font-700 text-lg text-upl-crema mb-3">Antecedentes</h2>
        <ul className="flex flex-col gap-2">
          {u.notas.map((nota, i) => (
            <li key={i} className="flex gap-3 rounded-xl glass px-4 py-3">
              <span className="text-upl-resaltador font-display font-800">·</span>
              <span className="text-sm text-upl-crema/85">{nota}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 mb-8 text-xs text-upl-crema/40">
        Fuente: Anuarios de Estadísticas Universitarias — Secretaría de Políticas Universitarias (SPU). Año de
        referencia 2024, salvo indicación contraria.
      </p>
    </div>
  )
}
