import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { universidadesArray } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { formatMoneda, formatPorcentaje, ubicacion } from '../lib/format'

type MetricaId = 'cohorte' | 'docentes' | 'costo'

const METRICAS: Record<
  MetricaId,
  {
    label: string
    subtitulo: string
    valor: (u: (typeof universidadesArray)[number]) => number | null | undefined
    formato: (v: number | null | undefined) => string
    ordenAsc: boolean
    mejorEsMenor: boolean
  }
> = {
  cohorte: {
    label: 'Tasa de cohorte (egreso)',
    subtitulo: 'Egresados 2023 sobre nuevos inscriptos del año de referencia (ventana de 6 años). Mayor = mejor.',
    valor: (u) => u.tasaCohorte,
    formato: (v) => formatPorcentaje(v),
    ordenAsc: false,
    mejorEsMenor: false,
  },
  docentes: {
    label: 'Estudiantes por docente',
    subtitulo: 'Cantidad de estudiantes 2023 por cada docente universitario. Menor = mejor.',
    valor: (u) => u.estudiantesPorDocente,
    formato: (v) => (v == null ? 'S/D' : `${v.toString().replace('.', ',')} x 1`),
    ordenAsc: true,
    mejorEsMenor: true,
  },
  costo: {
    label: 'Costo por graduado',
    subtitulo: 'Presupuesto ejecutado 2023 dividido egresados 2023. Menor = mejor.',
    valor: (u) => u.costoPorGraduado,
    formato: (v) => formatMoneda(v),
    ordenAsc: true,
    mejorEsMenor: true,
  },
}

export function Ranking() {
  const [metrica, setMetrica] = useState<MetricaId>('cohorte')
  const navigate = useNavigate()
  const cfg = METRICAS[metrica]

  const filas = useMemo(() => {
    const conDatos = universidadesArray.filter((u) => u.tieneDatos)
    return conDatos
      .slice()
      .sort((a, b) => {
        const va = cfg.valor(a)
        const vb = cfg.valor(b)
        if (va == null) return 1
        if (vb == null) return -1
        return cfg.ordenAsc ? va - vb : vb - va
      })
  }, [cfg])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display font-800 text-3xl text-upl-principal mb-1">Rankings</h1>
      <p className="text-upl-principal/70 mb-6">
        Comparativa de las universidades nacionales relevadas hasta el momento ({universidadesArray.filter((u) => u.tieneDatos).length}).
        El resto del mapa se irá completando.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.keys(METRICAS) as MetricaId[]).map((key) => (
          <button
            key={key}
            onClick={() => setMetrica(key)}
            className={`rounded-full px-4 py-2 font-display font-600 text-sm transition-colors ${
              metrica === key
                ? 'bg-upl-principal text-upl-amarillo'
                : 'bg-upl-principal/10 text-upl-principal hover:bg-upl-principal/20'
            }`}
          >
            {METRICAS[key].label}
          </button>
        ))}
      </div>

      <p className="text-sm text-upl-principal/60 mb-4">{cfg.subtitulo}</p>

      <ol className="flex flex-col gap-2">
        {filas.map((u, i) => (
          <li key={u.id}>
            <button
              onClick={() => navigate(`/universidad/${u.id}`)}
              className="w-full flex items-center gap-4 rounded-xl bg-white/70 hover:bg-upl-amarillo/25 border border-upl-principal/10 px-4 py-3 text-left transition-colors"
            >
              <span className="font-display font-800 text-xl text-upl-principal/30 w-7 shrink-0">{i + 1}</span>
              <UniversidadBadge sigla={u.sigla} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-upl-principal truncate">{u.nombre}</div>
                <div className="text-xs text-upl-principal/60 truncate">
                  {ubicacion(u.ciudad, u.provincia)}
                </div>
              </div>
              <div className="font-display font-700 text-lg text-upl-secundario shrink-0">
                {cfg.formato(cfg.valor(u))}
              </div>
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-upl-principal/50">
        Fuente: Anuarios de Estadísticas Universitarias 2023 — Secretaría de Políticas Universitarias.
      </p>
    </div>
  )
}
