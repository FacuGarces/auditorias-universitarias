import { universidadesArray } from '../data/universidades'
import { decimal, formatMoneda, formatNumero, formatPorcentaje, unidadMonetaria } from './format'
import { gastoExtranjeros, pctExtranjeros } from './extranjeros'

export type MetricaId = 'cohorte' | 'docentes' | 'costo' | 'ceroMaterias' | 'noDocentes' | 'extranjeros'

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
  if (u.sinMaterias2024 == null || !u.inscriptos2024) return null
  return cociente(u.sinMaterias2024, u.inscriptos2024, 100)
}

function activosPorDocente(u: Uni): number | null {
  if (u.docentesNoComparable || u.estudiantesActivos2024 == null || !u.cargosDocentes2024) return null
  return cociente(u.estudiantesActivos2024, u.cargosDocentes2024)
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
    /** true si un valor menor es mejor (costo, sin materias…); false si mayor es mejor (egreso). */
    menorEsMejor: boolean
    /** Dato secundario que acompaña al valor en las filas del ranking. */
    detalle?: (u: Uni) => string | null
    /**
     * true si agregado() es un total absoluto (suma de pesos), no una tasa: no tiene sentido
     * comparar grupos de distinto tamaño con él (ej. universidades K vs. resto).
     */
    agregadoEsTotal?: boolean
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
    menorEsMejor: false,
    agregado: (us) => {
      const conCohorte = us.filter((u) => u.tasaCohorte != null && u.nuevosInscriptos2018)
      return cociente(sumar(conCohorte, (u) => u.egresados2024), sumar(conCohorte, (u) => u.nuevosInscriptos2018), 100)
    },
  },
  docentes: {
    label: 'Estudiantes activos por docente',
    subtitulo:
      'Estudiantes que aprobaron al menos una materia en 2024 (reinscriptos + nuevos inscriptos) por cada cargo docente universitario. Menos estudiantes activos por cargo = planta sobredimensionada para los que realmente cursan.',
    valor: activosPorDocente,
    formato: (v) => (v == null ? 'S/D' : `${decimal(v)} x 1`),
    // Desde UPL, el problema es la planta docente cara para pocos estudiantes que cursan: el peor es el ratio más bajo.
    menorEsMejor: false,
    agregado: (us) => {
      const validas = us.filter((u) => activosPorDocente(u) != null)
      return cociente(sumar(validas, (u) => u.estudiantesActivos2024), sumar(validas, (u) => u.cargosDocentes2024))
    },
  },
  costo: {
    label: 'Costo por graduado',
    get subtitulo() {
      return `Presupuesto ejecutado 2024 dividido egresados 2024, en ${unidadMonetaria()}. Menor = mejor.`
    },
    valor: (u) => (u.docentesNoComparable ? null : u.costoPorGraduado),
    formato: (v) => formatMoneda(v),
    menorEsMejor: true,
    agregado: (us) => {
      const validas = us.filter((u) => !u.docentesNoComparable && u.costoPorGraduado != null && u.egresados2024)
      const egresados = sumar(validas, (u) => u.egresados2024)
      if (!egresados) return null
      return Math.round(sumar(validas, (u) => u.costoPorGraduado! * u.egresados2024!) / egresados)
    },
  },
  ceroMaterias: {
    label: 'Estudiantes sin materias',
    subtitulo:
      'Porcentaje de los inscriptos 2024 (reinscriptos + nuevos inscriptos) que no aprobó ninguna materia en todo el año. Menor = mejor.',
    valor: ceroMaterias,
    formato: (v) => formatPorcentaje(v),
    detalle: (u) => (u.sinMaterias2024 == null ? null : `${formatNumero(u.sinMaterias2024)} de ${formatNumero(u.inscriptos2024)}`),
    menorEsMejor: true,
    agregado: (us) => {
      const validas = us.filter((u) => ceroMaterias(u) != null)
      return cociente(sumar(validas, (u) => u.sinMaterias2024), sumar(validas, (u) => u.inscriptos2024), 100)
    },
  },
  noDocentes: {
    label: 'No docentes por docente',
    subtitulo: 'Personal no docente (administrativo, técnico, de servicios) cada 100 docentes universitarios. Menor = mejor.',
    valor: noDocentesCada100,
    formato: (v) => (v == null ? 'S/D' : `${v} c/100`),
    menorEsMejor: true,
    agregado: (us) => {
      const validas = us.filter((u) => noDocentesCada100(u) != null)
      const den = sumar(validas, (u) => u.docentesUniversitario)
      return den ? Math.round((sumar(validas, (u) => u.personalNoDocente) / den) * 100) : null
    },
  },
  extranjeros: {
    label: 'Gasto en extranjeros',
    get subtitulo() {
      return `Presupuesto 2024 por estudiante × estudiantes extranjeros de grado, en ${unidadMonetaria()}: lo que se ahorraría si se les cobrara un arancel que cubra su costo.`
    },
    valor: gastoExtranjeros,
    formato: (v) => formatMoneda(v),
    detalle: (u) => {
      const pct = pctExtranjeros(u)
      return pct == null ? null : `${formatNumero(u.extranjeros2024)} extranjeros · ${formatPorcentaje(pct)} del padrón`
    },
    menorEsMejor: true,
    agregadoEsTotal: true,
    agregado: (us) => {
      const validas = us.filter((u) => gastoExtranjeros(u) != null)
      return validas.length ? sumar(validas, gastoExtranjeros) : null
    },
  },
}

/** true si `valor` es peor que `otro` para esta métrica (según si menor o mayor es mejor). */
export function esPeor(valor: number | null, otro: number | null, menorEsMejor: boolean): boolean {
  if (valor == null || otro == null) return false
  return menorEsMejor ? valor > otro : valor < otro
}

/**
 * Ordena de peor a mejor (o al revés con `mejorPrimero`); las universidades sin dato van al final.
 * Los rankings siempre arrancan por la peor: la primera fila es la que hay que mirar.
 */
export function ordenarPorMetrica<T extends Uni>(us: T[], id: MetricaId, mejorPrimero = false, desempate?: (a: T, b: T) => number): T[] {
  const { valor, menorEsMejor } = METRICAS[id]
  const ascendente = menorEsMejor === mejorPrimero
  return us.slice().sort((a, b) => {
    const va = valor(a)
    const vb = valor(b)
    if (va == null && vb == null) return desempate ? desempate(a, b) : 0
    if (va == null) return 1
    if (vb == null) return -1
    return ascendente ? va - vb : vb - va
  })
}
