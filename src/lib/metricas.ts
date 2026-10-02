import { universidadesArray } from '../data/universidades'
import { formatMoneda, formatPorcentaje } from './format'

export type MetricaId = 'cohorte' | 'docentes' | 'costo' | 'ceroMaterias' | 'noDocentes'

type Uni = (typeof universidadesArray)[number]

/** Cociente redondeado a 1 decimal, o null si el denominador es 0. */
function cociente(num: number, den: number, escala = 1): number | null {
  if (!den) return null
  return Math.round((num / den) * escala * 10) / 10
}

function sumar(us: Uni[], campo: (u: Uni) => number | null | undefined): number {
  return us.reduce((acc, u) => acc + (campo(u) ?? 0), 0)
}

function ceroMaterias(u: Uni): number | null {
  if (u.reinscriptos0Materias == null || !u.reinscriptosTotal) return null
  return cociente(u.reinscriptos0Materias, u.reinscriptosTotal, 100)
}

function noDocentesCada100(u: Uni): number | null {
  if (u.docentesNoComparable || u.personalNoDocente == null || !u.docentesUniversitario) return null
  return Math.round((u.personalNoDocente / u.docentesUniversitario) * 100)
}

export const METRICAS: Record<
  MetricaId,
  {
    label: string
    subtitulo: string
    valor: (u: Uni) => number | null | undefined
    formato: (v: number | null | undefined) => string
    ordenAsc: boolean
    /**
     * Valor agregado de un grupo de universidades, ponderado por tamaño (suma de numeradores sobre
     * suma de denominadores). Un promedio simple de las tasas le daría el mismo peso a una
     * universidad de 80 egresados que a la UBA, y distorsiona cualquier comparación entre grupos.
     */
    agregado: (us: Uni[]) => number | null
  }
> = {
  cohorte: {
    label: 'Tasa de cohorte (egreso)',
    subtitulo: 'Egresados 2024 sobre nuevos inscriptos 2018 (ventana de 6 años). Mayor = mejor.',
    valor: (u) => u.tasaCohorte,
    formato: (v) => formatPorcentaje(v),
    ordenAsc: false,
    agregado: (us) => {
      const conCohorte = us.filter((u) => u.tasaCohorte != null && u.nuevosInscriptos2018)
      return cociente(sumar(conCohorte, (u) => u.egresados2024), sumar(conCohorte, (u) => u.nuevosInscriptos2018), 100)
    },
  },
  docentes: {
    label: 'Estudiantes activos por docente',
    subtitulo:
      'Estudiantes regulares (2+ materias aprobadas) por cada docente universitario — se excluyen del padrón quienes no son regulares. Menor = mejor.',
    valor: (u) => (u.docentesNoComparable ? null : u.estudiantesActivosPorDocente),
    formato: (v) => (v == null ? 'S/D' : `${v.toString().replace('.', ',')} x 1`),
    ordenAsc: true,
    agregado: (us) => {
      const validas = us.filter((u) => !u.docentesNoComparable && u.estudiantesActivosPorDocente != null)
      return cociente(sumar(validas, (u) => u.reinscriptosRegulares2mas), sumar(validas, (u) => u.docentesUniversitario))
    },
  },
  costo: {
    label: 'Costo por graduado',
    subtitulo: 'Presupuesto ejecutado 2024 dividido egresados 2024, en pesos constantes de agosto 2026. Menor = mejor.',
    valor: (u) => (u.docentesNoComparable ? null : u.costoPorGraduado),
    formato: (v) => formatMoneda(v),
    ordenAsc: true,
    agregado: (us) => {
      const validas = us.filter((u) => !u.docentesNoComparable && u.costoPorGraduado != null && u.egresados2024)
      const egresados = sumar(validas, (u) => u.egresados2024)
      if (!egresados) return null
      return Math.round(sumar(validas, (u) => u.costoPorGraduado! * u.egresados2024!) / egresados)
    },
  },
  ceroMaterias: {
    label: 'Reinscriptos sin materias',
    subtitulo:
      'Porcentaje de quienes se reinscribieron para seguir cursando que no aprobó ninguna materia en el último año informado. Menor = mejor.',
    valor: ceroMaterias,
    formato: (v) => formatPorcentaje(v),
    ordenAsc: true,
    agregado: (us) => {
      const validas = us.filter((u) => ceroMaterias(u) != null)
      return cociente(sumar(validas, (u) => u.reinscriptos0Materias), sumar(validas, (u) => u.reinscriptosTotal), 100)
    },
  },
  noDocentes: {
    label: 'No docentes por docente',
    subtitulo: 'Personal no docente (administrativo, técnico, de servicios) cada 100 docentes universitarios. Menor = mejor.',
    valor: noDocentesCada100,
    formato: (v) => (v == null ? 'S/D' : `${v} c/100`),
    ordenAsc: true,
    agregado: (us) => {
      const validas = us.filter((u) => noDocentesCada100(u) != null)
      const den = sumar(validas, (u) => u.docentesUniversitario)
      return den ? Math.round((sumar(validas, (u) => u.personalNoDocente) / den) * 100) : null
    },
  },
}

/** true si `valor` es peor que `otro` para esta métrica (según si menor o mayor es mejor). */
export function esPeor(valor: number | null, otro: number | null, ordenAsc: boolean): boolean {
  if (valor == null || otro == null) return false
  return ordenAsc ? valor > otro : valor < otro
}
