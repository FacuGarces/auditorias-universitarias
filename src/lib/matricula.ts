import type { UniversidadDetalle } from '../types'

export interface DesgloseMatricula {
  /** Matrícula total del año informado (reinscriptos + ingresantes nuevos). */
  total: number
  regulares: number
  unaMateria: number
  /**
   * Reinscriptos que no aprobaron ninguna materia MÁS los ingresantes nuevos de ese año — estos
   * últimos también tienen, por definición, 0 materias aprobadas todavía (recién empezaron), así
   * que cuentan para este total aunque no hayan "fallado" en el mismo sentido que un reinscripto.
   */
  cero: number
  ingresantesNuevos: number
}

/**
 * Desglosa la matrícula total de un año en regulares (2+ materias), 1 materia y 0 materias,
 * sumando los ingresantes nuevos al bucket de "0 materias" — así el porcentaje se calcula sobre
 * TODA la matrícula, no solo sobre los reinscriptos.
 */
export function desgloseMatricula(u: UniversidadDetalle): DesgloseMatricula | null {
  if (
    u.estudiantes2024 == null ||
    u.reinscriptosTotal == null ||
    u.reinscriptosRegulares2mas == null ||
    u.reinscriptos0Materias == null
  ) {
    return null
  }
  const total = u.estudiantes2024
  const ingresantesNuevos = Math.max(total - u.reinscriptosTotal, 0)
  const regulares = u.reinscriptosRegulares2mas
  const cero = u.reinscriptos0Materias + ingresantesNuevos
  const unaMateria = Math.max(total - regulares - cero, 0)
  return { total, regulares, unaMateria, cero, ingresantesNuevos }
}
