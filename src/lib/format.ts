export function formatNumero(n: number | undefined | null): string {
  if (n === undefined || n === null) return 'S/D'
  return new Intl.NumberFormat('es-AR').format(n)
}

export function formatMoneda(n: number | undefined | null): string {
  if (n === undefined || n === null) return 'S/D'
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)} mil M`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)} M`
  return `$${formatNumero(n)}`
}

export function formatPorcentaje(n: number | undefined | null): string {
  if (n === undefined || n === null) return 'S/D'
  return `${n.toString().replace('.', ',')}%`
}

export function ubicacion(ciudad: string, provincia: string): string {
  return ciudad.trim().toLowerCase() === provincia.trim().toLowerCase() ? ciudad : `${ciudad}, ${provincia}`
}
