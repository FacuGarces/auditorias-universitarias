import { universidadesArray } from '../data/universidades'
import { formatMoneda, formatPorcentaje } from './format'

export type MetricaId = 'cohorte' | 'docentes' | 'costo'

export const METRICAS: Record<
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
    label: 'Estudiantes activos por docente',
    subtitulo:
      'Estudiantes regulares (2+ materias aprobadas) por cada docente universitario — se excluyen del padrón quienes no son regulares. Menor = mejor.',
    valor: (u) => u.estudiantesActivosPorDocente,
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

/** true si `valor` es peor que `otro` para esta métrica (según si menor o mayor es mejor). */
export function esPeor(valor: number | null, otro: number | null, ordenAsc: boolean): boolean {
  if (valor == null || otro == null) return false
  return ordenAsc ? valor > otro : valor < otro
}

export function promedio(
  universidades: (typeof universidadesArray)[number][],
  valor: (u: (typeof universidadesArray)[number]) => number | null | undefined,
): number | null {
  const valores = universidades.map(valor).filter((v): v is number => v != null)
  if (!valores.length) return null
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  // Los campos de origen (tasaCohorte, estudiantesActivosPorDocente) siempre vienen con 1 decimal;
  // formatPorcentaje/formato de docentes solo hacen toString(), así que sin este redondeo el promedio
  // arrastra el ruido de punto flotante de la división (ej. 20.422222222228%).
  return Math.round(media * 10) / 10
}
