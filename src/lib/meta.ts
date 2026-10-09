import { useEffect } from 'react'
import { SITIO_URL } from './sistema'

const NOMBRE_SITIO = 'Auditorías Universitarias'

/**
 * URL absoluta canónica de una ruta interna: "/universidades/uba" → "https://dominio/universidades/uba/".
 * Termina en "/" porque cada página se publica como carpeta con su index.html (ver scripts/prerender.mjs),
 * y así el canónico coincide con la URL final que sirve el hosting sin redirección.
 */
export function urlCanonica(ruta: string): string {
  const limpia = ruta.replace(/^\/+|\/+$/g, '')
  return limpia ? `${SITIO_URL}${limpia}/` : SITIO_URL
}

function setMeta(atributo: 'name' | 'property', clave: string, valor: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${clave}"]`)
  if (valor == null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(atributo, clave)
    document.head.appendChild(el)
  }
  el.content = valor
}

function setCanonica(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Título, descripción, URL canónica y robots de la página. Se aplica en el navegador y el prerender
 * lo deja escrito en el HTML de cada ruta, que es lo que lee Google al indexar.
 *
 * `canonica` permite que una ruta apunte a otra (ej. una sede → la ficha de su universidad) para que
 * se pueda entrar por el link pero Google indexe una sola página. `indexar: false` la excluye del todo.
 */
export function useMeta({
  titulo,
  descripcion,
  ruta,
  canonica,
  indexar = true,
}: {
  titulo: string | null
  descripcion: string
  ruta: string
  canonica?: string
  indexar?: boolean
}) {
  useEffect(() => {
    const tituloCompleto = titulo ? `${titulo} — ${NOMBRE_SITIO}` : `${NOMBRE_SITIO} — Universitarios por la Libertad`
    const url = urlCanonica(canonica ?? ruta)
    document.title = tituloCompleto
    setMeta('name', 'description', descripcion)
    setMeta('property', 'og:title', tituloCompleto)
    setMeta('property', 'og:description', descripcion)
    setMeta('property', 'og:url', url)
    setMeta('name', 'robots', indexar ? null : 'noindex, follow')
    setCanonica(url)
  }, [titulo, descripcion, ruta, canonica, indexar])
}
