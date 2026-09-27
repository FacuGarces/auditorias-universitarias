import raw from './universidades-raw.json'
import type { UniversidadesDetalle } from '../types'

export const universidades = raw as unknown as UniversidadesDetalle

export const universidadesArray = Object.entries(universidades).map(([id, u]) => ({
  id,
  ...u,
}))

export function getUniversidad(id: string) {
  return universidades[id]
}
