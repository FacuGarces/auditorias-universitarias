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
  // Métricas — solo presentes cuando tieneDatos = true
  estudiantes2023?: number
  docentesUniversitario?: number
  personalTotal?: number
  nuevosInscriptos2017?: number | null
  egresados2023?: number
  presupuesto2023?: number
  reinscriptosTotal?: number
  reinscriptosRegulares2mas?: number
  reinscriptos0Materias?: number
  tasaCohorte?: number | null
  estudiantesPorDocente?: number
  costoPorGraduado?: number
  serieEstudiantes?: Record<string, number | string>
  serieEgresados?: Record<string, number | string>
  serieNuevosInscriptos?: Record<string, number | string>
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
