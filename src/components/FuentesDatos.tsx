import { ENLACES } from '../lib/rutas'
import { LinkAnuarios } from './LinkAnuarios'

/**
 * Pie de fuentes y metodología de las páginas con datos: los Anuarios de la SPU y la planilla con el
 * cálculo de estudiantes sin materias y estudiantes activos por cargo docente (se descarga tal cual).
 */
export function FuentesDatos({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={`text-xs text-upl-crema/40 flex flex-col gap-1.5 ${className}`}>
      <p>
        Fuente: <LinkAnuarios /> — Secretaría de Políticas Universitarias (SPU). Año de referencia 2024, salvo
        indicación contraria. {children}
      </p>
      <p>
        Estudiantes sin materias y estudiantes activos por docente:{' '}
        <a
          href={ENLACES.planillaActivosDocente}
          download
          className="underline decoration-dotted underline-offset-2 hover:text-upl-amarillo"
        >
          planilla de cálculo (.xlsx)
        </a>{' '}
        sobre el Anuario 2024 — reinscriptos (cuadro 2.1.10) y nuevos inscriptos (cuadro 2.1.28a) por cantidad de
        materias aprobadas, y cargos docentes universitarios a septiembre de 2024 (RHUN, cuadro 4.4). Activos = los
        que aprobaron una o más materias en el año; se cuentan cargos, no personas, y no se incluyen los cargos
        preuniversitarios.
      </p>
    </div>
  )
}
