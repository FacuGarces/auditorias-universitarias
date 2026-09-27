import { Link, useParams } from 'react-router-dom'
import { getUniversidad } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { EvolutionChart } from '../components/EvolutionChart'
import { formatMoneda, formatNumero, formatPorcentaje, ubicacion } from '../lib/format'

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1">{label}</div>
      <div className="font-display font-800 text-2xl sm:text-3xl text-upl-crema">{value}</div>
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
              label="Tasa de cohorte"
              value={formatPorcentaje(u.tasaCohorte)}
              hint={
                u.nuevosInscriptos2018
                  ? `${formatNumero(u.egresados2024)} egresados 2024 / ${formatNumero(u.nuevosInscriptos2018)} inscriptos 2018`
                  : 'Universidad muy joven: sin ventana de 6 años aún'
              }
            />
            <StatCard
              label="Estudiantes 2024"
              value={formatNumero(u.estudiantes2024)}
              hint={`${formatNumero(u.docentesUniversitario)} docentes`}
            />
            <StatCard
              label="Estudiantes regulares"
              value={formatNumero(u.reinscriptosRegulares2mas)}
              hint="Reinscriptos con 2+ materias aprobadas en el año"
            />
            <StatCard
              label="Costo por graduado"
              value={formatMoneda(u.costoPorGraduado)}
              hint="Presupuesto ejecutado 2024 / egresados 2024"
            />
          </div>

          <div className="mt-4 glass rounded-2xl px-5 py-4">
            <div className="text-sm text-upl-crema/80">
              <span className="font-semibold text-upl-crema">{formatNumero(u.reinscriptos0Materias)}</span>{' '}
              reinscriptos no aprobaron ninguna materia en el año informado, sobre un total de{' '}
              {formatNumero(u.reinscriptosTotal)} reinscriptos (
              {u.reinscriptosTotal ? Math.round((u.reinscriptos0Materias! / u.reinscriptosTotal) * 100) : 0}%).
            </div>
          </div>

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
            </div>
            <p className="text-xs text-upl-crema/40 mt-2">
              Los montos de presupuesto están expresados en pesos corrientes del año informado (sin ajuste por
              inflación).
            </p>
          </div>
        </>
      )}

      <div className="mt-8">
        <h2 className="font-display font-700 text-lg text-upl-crema mb-3">Notas relevantes</h2>
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
