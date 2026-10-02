import { universidadesArray } from '../data/universidades'
import { formatNumero, formatPorcentaje } from './format'
import { resumenSistema } from './sistema'

export interface Propuesta {
  titulo: string
  detalle: string
  /** El dato de la página que justifica la propuesta, calculado en vivo. */
  dato: string
  link: { label: string; to?: string; href?: string }
}

export function propuestas(): Propuesta[] {
  const r = resumenSistema(universidadesArray)
  const creadas2023 = universidadesArray.filter((u) => u.esKirchnerista && u.fundacion === 2023).length
  const sinDatos = universidadesArray.filter((u) => !u.tieneDatos).length

  return [
    {
      titulo: 'Auditoría externa obligatoria, anual y pública',
      detalle:
        'Todas las universidades nacionales auditadas todos los años por la AGN, sin excepciones, con los informes publicados completos. Quien recibe fondos públicos rinde cuentas.',
      dato: 'La AGN auditó una sola facultad de la UBA en 10 años (Psicología, ejercicio 2017).',
      link: {
        label: 'La Nación',
        href: 'https://www.lanacion.com.ar/politica/el-presidente-de-la-agn-explico-por-que-solo-se-audito-una-facultad-de-la-uba-en-10-anos-y-senalo-al-nid24042024/',
      },
    },
    {
      titulo: 'Financiamiento atado a resultados',
      detalle:
        'Que una parte del presupuesto se asigne por graduados y por estudiantes que avanzan en la carrera, no solo por cantidad de inscriptos.',
      dato: `${r.noSeReciben} de cada 100 ingresantes no se recibe en la ventana de 6 años (${formatPorcentaje(r.cohorte)} de egreso).`,
      link: { label: 'Ver el ranking', to: '/ranking' },
    },
    {
      titulo: 'Ninguna universidad nueva sin estudio de demanda',
      detalle:
        'Antes de crear una universidad por ley: estudio de demanda y de oferta existente en la zona, y que las universidades que ya existen informen todos sus datos.',
      dato: `${creadas2023} universidades se crearon por ley el mismo día de 2023; ${sinDatos} todavía no informan datos al Anuario de la SPU.`,
      link: { label: 'Ver universidades K', to: '/kirchneristas' },
    },
    {
      titulo: 'Datos abiertos por universidad',
      detalle:
        'Las universidades se autogobiernan: que usen esa autonomía para publicar, en formato abierto y comparable, cuánto gastan, cuántos estudiantes activos tienen, cuántos se reciben y cómo es su planta docente y no docente — y que dejen de resistirse a que el Estado las audite. La autonomía es para gobernarse, no para esconder las cuentas.',
      dato: `Esta página ya lo hace con los datos oficiales de ${r.universidades} universidades: si lo puede hacer un grupo de estudiantes, lo pueden hacer las propias universidades.`,
      link: { label: 'Ver el mapa', to: '/' },
    },
    {
      titulo: 'Ingreso con nivelación real',
      detalle:
        'Un ingreso que nivele de verdad, para que la gratuidad no sea una puerta giratoria que deja afuera en el primer año a quien llega con menos herramientas.',
      dato: `${formatNumero(r.ceroMateriasN)} reinscriptos no aprobaron ninguna materia en el último año (${formatPorcentaje(r.ceroMateriasPct)}).`,
      link: { label: 'Ver el ranking', to: '/ranking' },
    },
  ]
}
