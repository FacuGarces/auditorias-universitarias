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
  }
> = {
  cohorte: {
    label: 'Tasa de cohorte (egreso)',
    subtitulo: 'Egresados 2024 sobre nuevos inscriptos 2018 (ventana de 6 años). Mayor = mejor.',
    valor: (u) => u.tasaCohorte,
    formato: (v) => formatPorcentaje(v),
    ordenAsc: false,
  },
  docentes: {
    label: 'Estudiantes por docente',
    subtitulo: 'Cantidad de estudiantes 2024 por cada docente universitario. Menor = mejor.',
    valor: (u) => u.estudiantesPorDocente,
    formato: (v) => (v == null ? 'S/D' : `${v.toString().replace('.', ',')} x 1`),
    ordenAsc: true,
  },
  costo: {
    label: 'Costo por graduado',
    subtitulo: 'Presupuesto ejecutado 2024 dividido egresados 2024, en pesos constantes de agosto 2026. Menor = mejor.',
    valor: (u) => u.costoPorGraduado,
    formato: (v) => formatMoneda(v),
    ordenAsc: true,
  },
}

export function Ranking() {
  const [metrica, setMetrica] = useState<MetricaId>('cohorte')
  const [invertido, setInvertido] = useState(false)
  const navigate = useNavigate()
  const cfg = METRICAS[metrica]
  const ascendente = invertido ? !cfg.ordenAsc : cfg.ordenAsc

  const filas = useMemo(() => {
    const conDatos = universidadesArray.filter((u) => u.tieneDatos)
    return conDatos
      .slice()
      .sort((a, b) => {
        const va = cfg.valor(a)
        const vb = cfg.valor(b)
        if (va == null) return 1
        if (vb == null) return -1
        return ascendente ? va - vb : vb - va
      })
  }, [cfg, ascendente])

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="blob w-[34rem] h-[34rem] bg-upl-secundario/40 -top-32 -right-32" />
        <div className="blob w-[26rem] h-[26rem] bg-upl-resaltador/15 bottom-0 -left-20" style={{ animationDelay: '5s' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display font-800 text-3xl text-upl-crema mb-1">Rankings</h1>
        <p className="text-upl-crema/60 mb-6">
          Comparativa de las universidades nacionales relevadas hasta el momento (
          {universidadesArray.filter((u) => u.tieneDatos).length}). El resto del mapa se irá completando.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(METRICAS) as MetricaId[]).map((key) => (
            <button
              key={key}
              onClick={() => setMetrica(key)}
              className={`rounded-full px-4 py-2 font-display font-600 text-sm transition-colors ${
                metrica === key ? 'bg-upl-amarillo text-upl-principal' : 'glass-chip text-upl-crema hover:bg-upl-crema/15'
              }`}
            >
              {METRICAS[key].label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm text-upl-crema/50">{cfg.subtitulo}</p>
          <button
            onClick={() => setInvertido((v) => !v)}
            className="shrink-0 rounded-full glass-chip text-upl-crema text-xs font-semibold px-3 py-1.5 hover:bg-upl-crema/15 transition-colors whitespace-nowrap"
          >
            {ascendente ? '↑ Menor a mayor' : '↓ Mayor a menor'}
          </button>
        </div>

        <ol className="flex flex-col gap-2">
          {filas.map((u, i) => (
            <li key={u.id}>
              <button
                onClick={() => navigate(`/universidad/${u.id}`)}
                className="w-full flex items-center gap-4 rounded-xl glass hover:bg-upl-amarillo/10 px-4 py-3 text-left transition-colors"
              >
                <span className="font-display font-800 text-xl text-upl-crema/25 w-7 shrink-0">{i + 1}</span>
                <UniversidadBadge sigla={u.sigla} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-upl-crema truncate">{u.nombre}</div>
                  <div className="text-xs text-upl-crema/50 truncate">{ubicacion(u.ciudad, u.provincia)}</div>
                </div>
                <div className="font-display font-700 text-lg text-upl-amarillo shrink-0">
                  {cfg.formato(cfg.valor(u))}
                </div>
              </button>
            </li>
          ))}
        </ol>

        <p className="mt-6 mb-8 text-xs text-upl-crema/40">
          Fuente: Anuarios de Estadísticas Universitarias — Secretaría de Políticas Universitarias.
        </p>
      </div>
    </div>
  )
}
