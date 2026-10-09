import { getMoneda } from './moneda'

export function formatNumero(n: number | undefined | null): string {
  if (n === undefined || n === null) return 'S/D'
  return new Intl.NumberFormat('es-AR').format(n)
}

function abreviar(n: number, simbolo: string): string {
  if (n >= 1_000_000_000) return `${simbolo}${(n / 1_000_000_000).toFixed(1).replace('.', ',')} mil M`
  if (n >= 1_000_000) return `${simbolo}${(n / 1_000_000).toFixed(1).replace('.', ',')} M`
  return `${simbolo}${formatNumero(Math.round(n))}`
}

/**
 * Monto en pesos constantes de agosto 2026, mostrado en la moneda elegida (pesos o dólares al oficial
 * del día — tiene sentido porque los montos ya están a precios actuales). `nominal` es para pesos
 * corrientes de años anteriores: esos no se pueden pasar al dólar de hoy, así que quedan siempre en pesos.
 */
export function formatMoneda(n: number | undefined | null, opciones: { nominal?: boolean } = {}): string {
  if (n === undefined || n === null) return 'S/D'
  const { moneda, tc } = getMoneda()
  if (moneda === 'USD' && !opciones.nominal) return abreviar(n / tc.venta, 'US$')
  return abreviar(n, '$')
}

/** "pesos constantes de agosto 2026" o "dólares al oficial", según la moneda elegida. */
export function unidadMonetaria(): string {
  const { moneda, tc } = getMoneda()
  return moneda === 'USD' ? `dólares al tipo de cambio oficial ($${formatNumero(tc.venta)})` : 'pesos constantes de agosto 2026'
}

export function formatPorcentaje(n: number | undefined | null): string {
  if (n === undefined || n === null) return 'S/D'
  return `${n.toString().replace('.', ',')}%`
}

export function ubicacion(ciudad: string, provincia: string): string {
  if (provincia === 'Ciudad Autónoma de Buenos Aires') return 'CABA'
  return ciudad.trim().toLowerCase() === provincia.trim().toLowerCase() ? ciudad : `${ciudad}, ${provincia}`
}

/** Decimal con coma (formato argentino): decimal(5.83) → "5,8". */
export function decimal(n: number, digitos = 1): string {
  return n.toFixed(digitos).replace('.', ',')
}
