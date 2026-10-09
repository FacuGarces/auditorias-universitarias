import { universidadesArray } from '../data/universidades'
import { formatMoneda, formatNumero, formatPorcentaje } from './format'
import { resumenSistema } from './sistema'
import { rutaRanking } from './rutas'

export interface Propuesta {
  titulo: string
  detalle: string
  /** El dato de la página que justifica la propuesta, calculado en vivo. */
  dato: string
  link: { label: string; to?: string; href?: string }
}

export interface PropuestaPrincipal {
  nombre: string
  bajada: string
  detalle: string
  ejes: { titulo: string; texto: string }[]
  carreras: string[]
  dato: string
}

// Anuario SPU 2024, cuadro 2.1.13 — universidades nacionales, por rama de estudio.
const RAMAS_2024 = {
  egresadosTotal: 93_320,
  egresadosAplicadas: 21_752,
  egresadosBasicas: 2_307,
  egresadosSociales: 32_799,
  ingresantesAplicadas: 161_611,
  ingresantesSociales: 148_391,
}

export function propuestas(): Propuesta[] {
  const r = resumenSistema(universidadesArray)

  return [
    {
      titulo: 'Fin del ingreso irrestricto: examen de ingreso',
      detalle:
        'El ingreso irrestricto no democratiza: llena las aulas de primer año y vacía las del último. Un examen de ingreso — como el que tienen Brasil, Chile o Colombia — ordena la oferta según la capacidad real de cada universidad y garantiza que quien entra tenga las herramientas para terminar. Con nivelación previa gratuita para que nadie quede afuera por la escuela de la que viene.',
      dato: `${r.noSeReciben} de cada 100 ingresantes no se recibe en la ventana de 6 años (${formatPorcentaje(r.cohorte)} de egreso).`,
      link: { label: 'Ver el ranking de egreso', to: rutaRanking('cohorte') },
    },
    {
      titulo: 'Regularidad que exija rendir materias',
      detalle:
        'Revisar los criterios de regularidad para que ser alumno signifique estudiar: un mínimo de materias aprobadas por año para conservar la regularidad y los beneficios, que se cumpla de verdad y con excepciones para quien trabaja o tiene hijos a cargo. La Ley de Educación Superior ya pide aprobar al menos dos materias por año (art. 50); hoy casi nadie lo controla.',
      dato: `${formatNumero(r.ceroMateriasN)} reinscriptos no aprobaron ninguna materia en el último año informado (${formatPorcentaje(r.ceroMateriasPct)}) y siguen figurando como estudiantes.`,
      link: { label: 'Ver el ranking', to: rutaRanking('ceroMaterias') },
    },
    {
      titulo: 'Financiamiento mixto, con aportes privados',
      detalle:
        'Abrir la universidad a fuentes de financiamiento complementarias al Tesoro, como en otros países de la región: convenios con empresas e industrias, investigación aplicada por contrato, aportes de graduados y un arancel para estudiantes extranjeros no residentes. En Chile, las universidades estatales cobran aranceles y la gratuidad se concentra en los hogares que la necesitan.',
      dato:
        r.extranjeros.gasto != null
          ? `Solo los ${formatNumero(r.extranjeros.extranjeros)} estudiantes extranjeros de grado le cuestan al Estado ${formatMoneda(r.extranjeros.gasto)} por año.`
          : `Hay ${formatNumero(r.extranjeros.extranjeros)} estudiantes extranjeros de grado que no pagan arancel.`,
      link: { label: 'Ver gasto por universidad', to: rutaRanking('extranjeros') },
    },
    {
      titulo: 'Auditorías externas, arbitradas por el Estado nacional',
      detalle:
        'Todas las universidades nacionales auditadas todos los años por un agente externo e independiente, arbitrado por el gobierno nacional, con los informes publicados completos. La autonomía es para gobernarse, no para esconder las cuentas: quien recibe fondos públicos rinde cuentas.',
      dato: 'La AGN auditó una sola facultad de la UBA en 10 años (Psicología, ejercicio 2017).',
      link: {
        label: 'La Nación',
        href: 'https://www.lanacion.com.ar/politica/el-presidente-de-la-agn-explico-por-que-solo-se-audito-una-facultad-de-la-uba-en-10-anos-y-senalo-al-nid24042024/',
      },
    },
  ]
}

/** Posición en la lista de propuestas después de la cual va la propuesta principal (entre la 3 y la 4). */
export const POSICION_PRINCIPAL = 3

export function propuestaPrincipal(): PropuestaPrincipal {
  const pctBasicasAplicadas = Math.round(
    ((RAMAS_2024.egresadosAplicadas + RAMAS_2024.egresadosBasicas) / RAMAS_2024.egresadosTotal) * 100,
  )
  return {
    nombre: 'Becas AvanzAR',
    bajada: 'Becas focalizadas para los pibes que estudien las carreras que la Argentina va a necesitar.',
    detalle:
      'La Argentina que viene — energía, minería, agro, conocimiento — necesita ingenieros, programadores, técnicos y científicos que hoy el sistema no está formando. AvanzAR pone la plata en el estudiante y no en la estructura: una beca que acompaña a quien elige una carrera estratégica, siempre que avance en ella.',
    ejes: [
      {
        titulo: 'Focalizada',
        texto: 'Para estudiantes de hogares de ingresos bajos y medios, en carreras definidas como estratégicas para el desarrollo de los próximos años.',
      },
      {
        titulo: 'Atada al avance',
        texto: 'Se renueva cada año aprobando materias, y el monto crece a medida que el estudiante se acerca al título. El que avanza, cobra más.',
      },
      {
        titulo: 'Cofinanciada',
        texto: 'Con lo que se recupere por aranceles a extranjeros y aportes de empresas de los sectores que van a contratar a esos graduados.',
      },
      {
        titulo: 'Medible',
        texto: 'Cada beca con su seguimiento público: cuántos becarios hay, cuántos avanzan, cuántos se reciben y dónde trabajan.',
      },
    ],
    carreras: ['Ingenierías', 'Sistemas y programación', 'Energía, petróleo y minería', 'Agronomía y biotecnología', 'Matemática, física y química', 'Enfermería', 'Profesorados en ciencias'],
    dato: `Solo ${pctBasicasAplicadas} de cada 100 egresados de las universidades nacionales sale de ciencias básicas y aplicadas. A ciencias aplicadas entran más estudiantes que a ciencias sociales (${formatNumero(RAMAS_2024.ingresantesAplicadas)} vs. ${formatNumero(RAMAS_2024.ingresantesSociales)}), pero se reciben ${formatNumero(RAMAS_2024.egresadosAplicadas)} contra ${formatNumero(RAMAS_2024.egresadosSociales)}.`,
  }
}
