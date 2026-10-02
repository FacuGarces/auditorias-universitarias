export interface UniversidadDetalle {
  nombre: string
  sigla: string
  ciudad: string
  provincia: string
  lat: number
  lng: number
  fundacion: number
  sitio: string
  notas: string[]
  // Fuentes periodísticas u oficiales que respaldan las notas de antecedentes.
  fuentes?: { titulo: string; url: string }[]
  tieneDatos: boolean
  // true cuando la SPU no informa la planta docente real (ej. UNDEF, cuyo plantel depende de las
  // Fuerzas Armadas): sus ratios por docente y su costo por graduado (el presupuesto tampoco incluye
  // esos salarios) quedan fuera de rankings y promedios.
  docentesNoComparable?: boolean
  // Universidades creadas por ley durante gobiernos de Néstor Kirchner, Cristina Fernández de
  // Kirchner o Alberto Fernández — ver la sección "Universidades kirchneristas".
  esKirchnerista?: boolean
  fundacionLey?: string
  // Métricas — solo presentes cuando tieneDatos = true. Año de referencia: 2024.
  estudiantes2023?: number
  estudiantes2024?: number
  docentesUniversitario?: number
  personalTotal?: number
  personalNoDocente?: number
  nuevosInscriptos2017?: number | null
  nuevosInscriptos2018?: number | null
  egresados2023?: number
  egresados2024?: number
  presupuesto2017?: number
  presupuesto2019?: number
  presupuesto2023?: number
  presupuesto2024?: number
  reinscriptosTotal?: number
  reinscriptosRegulares2mas?: number
  reinscriptos0Materias?: number
  tasaCohorte?: number | null
  estudiantesPorDocente?: number
  // Regulares (2+ materias aprobadas) por docente universitario — versión "solo activos" de
  // estudiantesPorDocente, que en cambio divide por la matrícula total (incluye inactivos).
  estudiantesActivosPorDocente?: number
  // Cargos docentes por dedicación horaria (2017 vs 2023) y su equivalente a tiempo completo (FTE) —
  // solo disponible para universidades cruzadas manualmente contra RHUN por dedicación.
  dedicacionDocente?: {
    excl2017: number
    excl2023: number
    semi2017: number
    semi2023: number
    simple2017: number
    simple2023: number
    fte2017: number
    fte2023: number
  }
  // Costo por graduado en pesos constantes de agosto 2026 (deflactado por IPC) — la métrica que se
  // muestra en rankings y fichas. costoPorGraduado === serieCostoPorGraduadoReal['2024'].
  costoPorGraduado?: number
  serieEstudiantes?: Record<string, number | string>
  serieEgresados?: Record<string, number | string>
  serieNuevosInscriptos?: Record<string, number | string>
  serieTasaCohorte?: Record<string, number>
  serieDocentesUniversitario?: Record<string, number>
  serieNoDocentes?: Record<string, number>
  // Costo por graduado por año, en pesos constantes de agosto 2026 vs. pesos corrientes de cada año.
  serieCostoPorGraduadoReal?: Record<string, number>
  serieCostoPorGraduadoNominal?: Record<string, number>
}

export type UniversidadesDetalle = Record<string, UniversidadDetalle>

export interface UniversidadMapa {
  id: string
  nombre: string
  sigla: string
  ciudad: string
  provincia: string
  lat: number
  lng: number
  tieneFicha: boolean
}
