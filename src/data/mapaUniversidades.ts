import raw from './mapa-raw.json'
import type { UniversidadMapa } from '../types'

export const mapaUniversidades = raw as unknown as UniversidadMapa[]

export function provinciasConSedes(): string[] {
  return Array.from(new Set(mapaUniversidades.map((u) => u.provincia))).sort()
}
