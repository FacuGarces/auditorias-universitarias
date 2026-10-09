import { universidadesArray } from '../data/universidades'
import { METRICAS } from './metricas'
import { resumenExtranjeros } from './extranjeros'

type Uni = (typeof universidadesArray)[number]

export const SITIO_URL = 'https://facugarces.github.io/auditorias-universitarias/'
export const SITIO_URL_CORTA = 'facugarces.github.io/auditorias-universitarias'

export interface Punto {
  label: string
  value: number
}

export interface Variacion {
  desde: string
  hasta: string
  inicial: number
  final: number
  pct: number
}

/** Suma, año por año, una serie de todas las universidades del grupo. */
function sumarSerie(us: Uni[], serie: (u: Uni) => Record<string, number | string> | undefined): Punto[] {
  const porAnio: Record<string, number> = {}
  for (const u of us) {
    for (const [anio, v] of Object.entries(serie(u) ?? {})) {
      if (typeof v === 'number') porAnio[anio] = (porAnio[anio] ?? 0) + v
    }
  }
  return Object.entries(porAnio)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Number(a.label) - Number(b.label))
}

function variacion(puntos: Punto[]): Variacion | null {
  if (puntos.length < 2) return null
  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]
  if (!primero.value) return null
  return {
    desde: primero.label,
    hasta: ultimo.label,
    inicial: primero.value,
    final: ultimo.value,
    pct: Math.round(((ultimo.value - primero.value) / primero.value) * 100),
  }
}

/**
 * Totales agregados de un grupo de universidades (todo el sistema, una provincia, las K…).
 * Todas las tasas son ponderadas por tamaño — ver METRICAS[*].agregado.
 */
export function resumenSistema(us: Uni[]) {
  const conDatos = us.filter((u) => u.tieneDatos)
  const cohorte = METRICAS.cohorte.agregado(conDatos)
  const conCeroMaterias = conDatos.filter((u) => METRICAS.ceroMaterias.valor(u) != null)
  const ingresantes = sumarSerie(conDatos, (u) => u.serieNuevosInscriptos)
  const egresados = sumarSerie(conDatos, (u) => u.serieEgresados)

  const conDedicacion = conDatos.filter((u) => u.dedicacionDocente)
  const ded = conDedicacion.reduce(
    (acc, u) => {
      const d = u.dedicacionDocente!
      acc.cargos2017 += d.excl2017 + d.semi2017 + d.simple2017
      acc.cargos2023 += d.excl2023 + d.semi2023 + d.simple2023
      acc.fte2017 += d.fte2017
      acc.fte2023 += d.fte2023
      acc.simple2017 += d.simple2017
      acc.simple2023 += d.simple2023
      acc.excl2017 += d.excl2017
      acc.excl2023 += d.excl2023
      return acc
    },
    { cargos2017: 0, cargos2023: 0, fte2017: 0, fte2023: 0, simple2017: 0, simple2023: 0, excl2017: 0, excl2023: 0 },
  )

  return {
    universidades: conDatos.length,
    estudiantes: conDatos.reduce((acc, u) => acc + (u.estudiantes2024 ?? 0), 0),
    egresados2024: conDatos.reduce((acc, u) => acc + (u.egresados2024 ?? 0), 0),
    cohorte,
    noSeReciben: cohorte == null ? null : Math.round(100 - cohorte),
    ceroMateriasPct: METRICAS.ceroMaterias.agregado(conDatos),
    ceroMateriasN: conCeroMaterias.reduce((acc, u) => acc + (u.reinscriptos0Materias ?? 0), 0),
    costoPorGraduado: METRICAS.costo.agregado(conDatos),
    extranjeros: resumenExtranjeros(conDatos),
    ingresantes,
    egresados,
    variacionIngresantes: variacion(ingresantes),
    variacionEgresados: variacion(egresados),
    dedicacion: conDedicacion.length
      ? {
          universidades: conDedicacion.length,
          ...ded,
          varCargosPct: Math.round(((ded.cargos2023 - ded.cargos2017) / ded.cargos2017) * 100),
          varFtePct: Math.round(((ded.fte2023 - ded.fte2017) / ded.fte2017) * 100),
        }
      : null,
  }
}

export type ResumenSistema = ReturnType<typeof resumenSistema>
