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
  tieneDatos: boolean
  // Métricas — solo presentes cuando tieneDatos = true. Año de referencia: 2024.
  estudiantes2023?: number
  estudiantes2024?: number
  docentesUniversitario?: number
  personalTotal?: number
  nuevosInscriptos2017?: number | null
  nuevosInscriptos2018?: number | null
  egresados2023?: number
  egresados2024?: number
  presupuesto2023?: number
  presupuesto2024?: number
  reinscriptosTotal?: number
  reinscriptosRegulares2mas?: number
  reinscriptos0Materias?: number
  tasaCohorte?: number | null
  estudiantesPorDocente?: number
  costoPorGraduado?: number
  serieEstudiantes?: Record<string, number | string>
  serieEgresados?: Record<string, number | string>
  serieNuevosInscriptos?: Record<string, number | string>
  serieTasaCohorte?: Record<string, number>
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
