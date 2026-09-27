import { Link, useParams } from 'react-router-dom'
import { getUniversidad } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { formatMoneda, formatNumero, formatPorcentaje, ubicacion } from '../lib/format'

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-upl-principal text-upl-crema px-5 py-4 shadow-md">
      <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-1">{label}</div>
      <div className="font-display font-800 text-2xl sm:text-3xl">{value}</div>
      {hint && <div className="text-xs text-upl-crema/60 mt-1">{hint}</div>}
    </div>
  )
}

export function Universidad() {
  const { id = '' } = useParams()
  const u = getUniversidad(id)

  if (!u) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-upl-principal">No encontramos esa universidad.</p>
        <Link to="/" className="underline text-upl-secundario">
          Volver al mapa
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/ranking" className="text-sm text-upl-principal/60 hover:text-upl-principal">
        ← Volver al ranking
      </Link>

      <div className="mt-3 flex items-center gap-4">
        <UniversidadBadge sigla={u.sigla} size="lg" />
        <div>
          <h1 className="font-display font-800 text-2xl sm:text-3xl text-upl-principal leading-tight">{u.nombre}</h1>
          <p className="text-upl-principal/60">
            {ubicacion(u.ciudad, u.provincia)} · Fundada en {u.fundacion} ·{' '}
            <a href={u.sitio} target="_blank" rel="noreferrer" className="underline">
              sitio oficial
            </a>
          </p>
        </div>
      </div>

      {!u.tieneDatos ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-upl-amarillo bg-upl-amarillo/10 px-5 py-6">
          <p className="font-display font-700 text-upl-principal mb-2">
            Sin datos reportados en el Anuario de la SPU
          </p>
          <p className="text-sm text-upl-principal/70">
            Esta universidad todavía no informa estudiantes, egresados, docentes ni presupuesto ejecutado a la
            Secretaría de Políticas Universitarias.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Tasa de cohorte"
            value={formatPorcentaje(u.tasaCohorte)}
            hint={
              u.nuevosInscriptos2017
                ? `${formatNumero(u.egresados2023)} egresados 2023 / ${formatNumero(u.nuevosInscriptos2017)} inscriptos 2017`
                : 'Universidad muy joven: sin ventana de 6 años aún'
            }
          />
          <StatCard label="Estudiantes 2023" value={formatNumero(u.estudiantes2023)} hint={`${formatNumero(u.docentesUniversitario)} docentes`} />
          <StatCard
            label="Estudiantes regulares"
            value={formatNumero(u.reinscriptosRegulares2mas)}
            hint="Reinscriptos con 2+ materias aprobadas en el año"
          />
          <StatCard label="Costo por graduado" value={formatMoneda(u.costoPorGraduado)} hint="Presupuesto ejecutado 2023 / egresados 2023" />
        </div>
      )}

      {u.tieneDatos && (
        <div className="mt-4 rounded-2xl bg-white/60 border border-upl-principal/10 px-5 py-4">
          <div className="text-sm text-upl-principal/80">
            <span className="font-semibold">{formatNumero(u.reinscriptos0Materias)}</span> reinscriptos no aprobaron
            ninguna materia en el año informado, sobre un total de {formatNumero(u.reinscriptosTotal)} reinscriptos
            ({u.reinscriptosTotal ? Math.round((u.reinscriptos0Materias! / u.reinscriptosTotal) * 100) : 0}%).
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-display font-700 text-lg text-upl-principal mb-3">Notas relevantes</h2>
        <ul className="flex flex-col gap-2">
          {u.notas.map((nota, i) => (
            <li key={i} className="flex gap-3 rounded-xl bg-upl-secundario/5 border border-upl-secundario/15 px-4 py-3">
              <span className="text-upl-resaltador font-display font-800">·</span>
              <span className="text-sm text-upl-principal/85">{nota}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-xs text-upl-principal/45">
        Fuente: Anuarios de Estadísticas Universitarias — Secretaría de Políticas Universitarias (SPU). Año de
        referencia 2023, salvo indicación contraria.
      </p>
    </div>
  )
}
