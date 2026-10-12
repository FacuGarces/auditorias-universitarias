import type { UniversidadDetalle } from '../types'
import { decimal, formatMoneda, formatNumero } from './format'

/**
 * Notas generadas automáticamente a partir de los datos crudos, con foco en las
 * falencias — no en el estado general. Se suman a las notas curadas a mano.
 */
export function notasCriticas(u: UniversidadDetalle): string[] {
  const notas: string[] = []

  if (u.tasaCohorte != null) {
    const fracaso = Math.round(100 - u.tasaCohorte)
    if (u.tasaCohorte < 10) {
      notas.push(
        `De cada 100 personas que se inscribieron, ${fracaso} no llegaron a graduarse dentro del plazo de referencia (6 años). Una de las tasas de fracaso más altas del relevamiento.`,
      )
    } else if (u.tasaCohorte < 25) {
      notas.push(`${fracaso}% de quienes se inscribieron no se graduó dentro del plazo de referencia de 6 años.`)
    }
  }

  if (!u.docentesNoComparable && u.costoPorGraduado != null && u.costoPorGraduado > 15_000_000) {
    notas.push(
      `El Estado ejecuta ${formatMoneda(u.costoPorGraduado)} en promedio por cada graduado en el año informado — muy por encima de universidades más eficientes de la misma muestra.`,
    )
  }

  // Si una nota curada ya da este dato (con más contexto), no se repite como alerta.
  const notaConMaterias = u.notas.some((n) => /aprobó (ni una|ninguna) (sola )?materia/.test(n))
  if (u.sinMaterias2024 != null && u.inscriptos2024 && !notaConMaterias) {
    const pct = Math.round((u.sinMaterias2024 / u.inscriptos2024) * 100)
    if (pct >= 40) {
      notas.push(
        `${pct}% de sus inscriptos 2024 (${formatNumero(u.sinMaterias2024)} personas) no aprobó ni una sola materia en todo el año.`,
      )
    }
  }

  const activosPorDocente = u.docentesNoComparable ? null : u.estudiantesActivosPorDocente
  if (activosPorDocente != null && activosPorDocente < 4) {
    notas.push(
      `Tiene ${formatNumero(u.cargosDocentes2024)} cargos docentes para ${formatNumero(u.estudiantesActivos2024)} estudiantes que aprobaron al menos una materia: ${decimal(activosPorDocente)} estudiantes activos por cargo, muy por debajo del promedio del sistema.`,
    )
  }

  if (!u.docentesNoComparable && u.personalNoDocente != null && u.docentesUniversitario) {
    const ratio = u.personalNoDocente / u.docentesUniversitario
    if (ratio > 0.4) {
      notas.push(
        `Tiene ${formatNumero(u.personalNoDocente)} no docentes cada ${formatNumero(u.docentesUniversitario)} docentes universitarios (1 cada ${decimal(1 / ratio)}) — una planta administrativa proporcionalmente grande frente a la planta académica.`,
      )
    }
  }

  return notas
}
