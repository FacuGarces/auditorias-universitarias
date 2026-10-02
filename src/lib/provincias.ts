import { useSearchParams } from 'react-router-dom'
import { universidadesArray } from '../data/universidades'

type Uni = (typeof universidadesArray)[number]

// Se lista primero porque es el foco habitual de las presentaciones de UPL (conurbano bonaerense).
export const PROVINCIA_DESTACADA = 'Buenos Aires'

export function nombreProvincia(provincia: string): string {
  return provincia === 'Buenos Aires' ? 'Provincia de Buenos Aires' : provincia
}

/** Provincias con al menos una universidad con datos, con la destacada primero y el resto alfabético. */
export function provinciasConDatos(): { provincia: string; cantidad: number }[] {
  const conteo: Record<string, number> = {}
  for (const u of universidadesArray) {
    if (u.tieneDatos) conteo[u.provincia] = (conteo[u.provincia] ?? 0) + 1
  }
  return Object.entries(conteo)
    .map(([provincia, cantidad]) => ({ provincia, cantidad }))
    .sort((a, b) => {
      if (a.provincia === PROVINCIA_DESTACADA) return -1
      if (b.provincia === PROVINCIA_DESTACADA) return 1
      return a.provincia.localeCompare(b.provincia, 'es')
    })
}

export function filtrarPorProvincia<T extends Pick<Uni, 'provincia'>>(us: T[], provincia: string | null): T[] {
  return provincia ? us.filter((u) => u.provincia === provincia) : us
}

/**
 * Provincia elegida, guardada en la URL (`?provincia=...`) para que un link compartido — o el que
 * se abre durante una presentación — llegue ya filtrado.
 */
export function useProvinciaFiltro(): [string | null, (provincia: string | null) => void] {
  const [params, setParams] = useSearchParams()
  const provincia = params.get('provincia')
  const setProvincia = (p: string | null) => {
    const next = new URLSearchParams(params)
    if (p) next.set('provincia', p)
    else next.delete('provincia')
    setParams(next, { replace: true })
  }
  return [provincia, setProvincia]
}
