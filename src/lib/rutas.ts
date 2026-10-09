/**
 * Único lugar donde se arman y se leen las URLs del sitio. Todas son legibles y estables (se
 * comparten, se imprimen en QR y las indexa Google), así que no dependen de ids internos:
 *
 *   /                                          mapa nacional
 *   /mapa/buenos-aires                         una provincia (CABA → /mapa/caba)
 *   /universidades/uba                         ficha de una universidad (por sigla)
 *   /universidades/uba/sedes/cbc-tigre         una sede dentro de la ficha (no se indexa aparte)
 *   /rankings/costo-por-graduado               ranking por métrica (?provincia=buenos-aires)
 *   /universidades-kirchneristas               (?provincia=...)
 *   /propuestas
 *   /presentacion                              modo presentación (?s=N, no se indexa)
 */
import { universidades, universidadesArray } from '../data/universidades'
import type { MetricaId } from './metricas'

export function slugificar(texto: string): string {
  return texto
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ── Universidades: por sigla (uba, unlp, uncuyo…) ────────────────────────────────────────────
const SIGLA_A_ID = new Map(universidadesArray.map((u) => [slugificar(u.sigla), u.id]))

export function slugUniversidad(id: string): string {
  const u = universidades[id]
  return u ? slugificar(u.sigla) : id
}

/** id interno a partir del slug de la URL (acepta también el id viejo, para links anteriores). */
export function idUniversidad(slug: string): string | null {
  return SIGLA_A_ID.get(slug) ?? (universidades[slug] ? slug : null)
}

export function rutaUniversidad(id: string): string {
  return `/universidades/${slugUniversidad(id)}`
}

// ── Sedes ────────────────────────────────────────────────────────────────────────────────────
/** "CBC — Sede Tigre" → "cbc-tigre"; "Facultad Regional Bahía Blanca" → "facultad-regional-bahia-blanca". */
export function slugSede(nombre: string): string {
  return slugificar(nombre)
    .split('-')
    .filter((p) => p !== 'sede')
    .join('-')
}

export function rutaSede(universidad: string, nombreSede: string): string {
  return `${rutaUniversidad(universidad)}/sedes/${slugSede(nombreSede)}`
}

// ── Provincias (nombres como vienen del mapa: "Capital Federal", "Buenos Aires"…) ────────────
const ALIAS_PROVINCIA: Record<string, string> = {
  'Capital Federal': 'caba',
  'Ciudad Autónoma de Buenos Aires': 'caba',
}

export function slugProvincia(nombre: string): string {
  return ALIAS_PROVINCIA[nombre] ?? slugificar(nombre)
}

export function rutaProvincia(nombre: string): string {
  return `/mapa/${slugProvincia(nombre)}`
}

// ── Rankings ─────────────────────────────────────────────────────────────────────────────────
export const SLUG_METRICA: Record<MetricaId, string> = {
  cohorte: 'tasa-de-egreso',
  docentes: 'estudiantes-por-docente',
  costo: 'costo-por-graduado',
  ceroMaterias: 'sin-materias-aprobadas',
  noDocentes: 'no-docentes',
  extranjeros: 'gasto-en-extranjeros',
}

export function metricaDesdeSlug(slug: string | undefined): MetricaId | null {
  if (!slug) return 'cohorte'
  const par = Object.entries(SLUG_METRICA).find(([, s]) => s === slug)
  return par ? (par[0] as MetricaId) : null
}

export function rutaRanking(metrica: MetricaId = 'cohorte', provincia?: string | null): string {
  const base = metrica === 'cohorte' ? '/rankings' : `/rankings/${SLUG_METRICA[metrica]}`
  return provincia ? `${base}?provincia=${slugProvincia(provincia)}` : base
}

export const RUTAS = {
  inicio: '/',
  rankings: '/rankings',
  kirchneristas: '/universidades-kirchneristas',
  propuestas: '/propuestas',
  presentacion: '/presentacion',
} as const

/**
 * Traduce los links viejos con hash (`/#/universidad/uba`, `/#/?p=caba`, `/#/ranking`…) a las URLs
 * nuevas. Hay QR impresos y links compartidos con el formato anterior: tienen que seguir andando.
 */
export function rutaDesdeHashViejo(hash: string): string | null {
  if (!hash.startsWith('#/')) return null
  const url = new URL(hash.slice(1), 'https://x')
  const [, seccion, param] = url.pathname.split('/')
  const q = url.searchParams
  const provincia = q.get('provincia')
  const sufijoProvincia = provincia ? `?provincia=${slugificar(provincia)}` : ''
  switch (seccion) {
    case '':
      return q.get('p') ? `/mapa/${q.get('p') === 'capital-federal' ? 'caba' : q.get('p')}` : '/'
    case 'universidad':
      return param ? rutaUniversidad(idUniversidad(param) ?? param) : '/'
    case 'ranking':
      return `/rankings${sufijoProvincia}`
    case 'kirchneristas':
      return `${RUTAS.kirchneristas}${sufijoProvincia}`
    case 'propuestas':
      return RUTAS.propuestas
    case 'presentacion':
      return q.get('s') ? `${RUTAS.presentacion}?s=${q.get('s')}` : RUTAS.presentacion
    default:
      return '/'
  }
}

/** Enlaces externos a las fuentes oficiales. */
export const ENLACES = {
  // Página oficial de la SPU con todos los Anuarios de Estadísticas Universitarias (1999–2024, PDF y CSV).
  anuarios: 'https://www.argentina.gob.ar/educacion/universidades/informacion/publicaciones/anuarios',
} as const
