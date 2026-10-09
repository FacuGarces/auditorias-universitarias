import { universidadesArray } from '../data/universidades'
import type { UniversidadDetalle } from '../types'

type Uni = UniversidadDetalle

/**
 * Pesos corrientes de 2024 → pesos constantes de agosto 2026. Es el mismo deflactor (IPC) para todas
 * las universidades, así que se toma de cualquier serie de costo por graduado que tenga ambos valores.
 */
const DEFLACTOR_2024 = (() => {
  for (const u of universidadesArray) {
    const real = u.serieCostoPorGraduadoReal?.['2024']
    const nominal = u.serieCostoPorGraduadoNominal?.['2024']
    if (real && nominal) return real / nominal
  }
  return 1
})()

/** Presupuesto ejecutado 2024 por estudiante, en pesos constantes de agosto 2026. */
export function gastoPorEstudiante(u: Uni): number | null {
  if (!u.presupuesto2024 || !u.estudiantes2024) return null
  return (u.presupuesto2024 * DEFLACTOR_2024) / u.estudiantes2024
}

/**
 * Lo que el Estado gasta en estudiantes extranjeros de grado: gasto por estudiante × extranjeros del
 * padrón. Es la estimación del ahorro (o de la recaudación) si a esos estudiantes se les cobrara un
 * arancel que cubra su costo.
 */
export function gastoExtranjeros(u: Uni): number | null {
  const porEstudiante = gastoPorEstudiante(u)
  if (porEstudiante == null || u.extranjeros2024 == null) return null
  return Math.round(porEstudiante * u.extranjeros2024)
}

/** Porcentaje del padrón de grado que es extranjero. */
export function pctExtranjeros(u: Uni): number | null {
  if (u.extranjeros2024 == null || !u.estudiantes2024) return null
  return Math.round((u.extranjeros2024 / u.estudiantes2024) * 1000) / 10
}

/** Totales de un grupo: extranjeros, % del padrón y gasto (solo universidades con presupuesto). */
export function resumenExtranjeros(us: Uni[]) {
  const conDato = us.filter((u) => u.tieneDatos && u.extranjeros2024 != null && u.estudiantes2024)
  const conGasto = conDato.filter((u) => gastoExtranjeros(u) != null)
  const extranjeros = conDato.reduce((a, u) => a + u.extranjeros2024!, 0)
  const padron = conDato.reduce((a, u) => a + u.estudiantes2024!, 0)
  return {
    extranjeros,
    pct: padron ? Math.round((extranjeros / padron) * 1000) / 10 : null,
    gasto: conGasto.length ? conGasto.reduce((a, u) => a + gastoExtranjeros(u)!, 0) : null,
    universidades: conDato.length,
  }
}
