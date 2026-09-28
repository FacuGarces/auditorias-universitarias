import type { UniversidadDetalle } from '../types'
import { formatMoneda, formatNumero } from './format'
import { desgloseMatricula } from './matricula'

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

  if (u.costoPorGraduado != null && u.costoPorGraduado > 15_000_000) {
    notas.push(
      `El Estado ejecuta ${formatMoneda(u.costoPorGraduado)} en promedio por cada graduado en el año informado — muy por encima de universidades más eficientes de la misma muestra.`,
    )
  }

  const desglose = desgloseMatricula(u)
  if (desglose) {
    const pct = Math.round((desglose.cero / desglose.total) * 100)
    if (pct >= 20) {
      notas.push(
        `${pct}% de la matrícula total (${formatNumero(desglose.cero)} personas) no aprobó ni una sola materia en el último año informado — entre reinscriptos que cursaron sin aprobar nada e ingresantes nuevos que recién empiezan.`,
      )
    }
  }

  if (u.estudiantesPorDocente != null && u.estudiantesPorDocente > 18 && u.tasaCohorte != null && u.tasaCohorte < 20) {
    notas.push(
      `Con ${u.estudiantesPorDocente.toString().replace('.', ',')} estudiantes por cada docente y una tasa de egreso de apenas ${u.tasaCohorte}%, la planta docente no se traduce en graduados.`,
    )
  }

  if (u.personalNoDocente != null && u.docentesUniversitario) {
    const ratio = u.personalNoDocente / u.docentesUniversitario
    if (ratio > 0.4) {
      notas.push(
        `Tiene ${formatNumero(u.personalNoDocente)} no docentes cada ${formatNumero(u.docentesUniversitario)} docentes universitarios (1 cada ${(1 / ratio).toFixed(1)}) — una planta administrativa proporcionalmente grande frente a la planta académica.`,
      )
    }
  }

  return notas
}
