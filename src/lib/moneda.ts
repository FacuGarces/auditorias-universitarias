import { useSyncExternalStore } from 'react'

/**
 * Moneda en la que se muestran los montos (pesos o dólares al tipo de cambio oficial). Es un store
 * global y no un contexto porque formatMoneda() se llama desde funciones puras (métricas, notas
 * críticas, propuestas) que no tienen acceso a hooks; Shell se suscribe con useMoneda() y re-renderiza
 * todo el árbol cuando cambia.
 */
export type Moneda = 'ARS' | 'USD'

export interface TipoDeCambio {
  /** Pesos por dólar, cotización oficial vendedora. */
  venta: number
  fecha: string
  /** false mientras no respondió la API (se usa el valor de respaldo). */
  enVivo: boolean
}

// Respaldo si dolarapi.com no responde: oficial vendedor al 08/10/2026.
const TC_RESPALDO: TipoDeCambio = { venta: 1540, fecha: '2026-10-08', enVivo: false }
const CLAVE = 'au-moneda'

function leerPreferencia(): Moneda {
  try {
    return localStorage.getItem(CLAVE) === 'USD' ? 'USD' : 'ARS'
  } catch {
    return 'ARS'
  }
}

let estado: { moneda: Moneda; tc: TipoDeCambio } = { moneda: leerPreferencia(), tc: TC_RESPALDO }
const oyentes = new Set<() => void>()

function emitir(parcial: Partial<typeof estado>) {
  estado = { ...estado, ...parcial }
  oyentes.forEach((f) => f())
}

export function setMoneda(moneda: Moneda) {
  try {
    localStorage.setItem(CLAVE, moneda)
  } catch {
    // sin storage (modo privado): la elección dura lo que la pestaña
  }
  emitir({ moneda })
}

export function getMoneda() {
  return estado
}

let pedido: Promise<void> | null = null
function cargarTipoDeCambio() {
  pedido ??= fetch('https://dolarapi.com/v1/dolares/oficial')
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d: { venta?: number; fechaActualizacion?: string }) => {
      if (typeof d.venta === 'number' && d.venta > 0) {
        emitir({ tc: { venta: d.venta, fecha: d.fechaActualizacion ?? new Date().toISOString(), enVivo: true } })
      }
    })
    .catch(() => {
      // queda el respaldo
    })
}

function suscribir(f: () => void) {
  oyentes.add(f)
  cargarTipoDeCambio()
  return () => oyentes.delete(f)
}

export function useMoneda() {
  return useSyncExternalStore(suscribir, getMoneda)
}
