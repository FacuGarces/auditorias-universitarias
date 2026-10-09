/**
 * Prerender de todas las URLs del sitio después de `vite build`.
 *
 * El sitio es una SPA, pero un hosting estático (GitHub Pages, Hostinger) solo sabe servir archivos:
 * sin esto, /universidades/uba devolvería 404 y Google no vería el contenido ni el título de cada
 * página. Para cada ruta se abre la app en Chrome, se espera a que renderice y se guarda el HTML
 * resultante en dist/<ruta>/index.html (con su <title>, descripción y canónico). Al cargar en el
 * navegador, React vuelve a renderizar encima y la página queda interactiva como siempre.
 *
 * Además genera: 404.html (la app sin prerenderizar, para rutas desconocidas), sitemap.xml,
 * robots.txt, CNAME (si hay dominio propio en sitio.json), .nojekyll y .htaccess (por si se sube a
 * un hosting Apache como Hostinger).
 *
 * Uso: node scripts/prerender.mjs   (lo corre `npm run build`). Chrome: CHROME_PATH o el de macOS.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(RAIZ, 'dist')
const sitio = JSON.parse(readFileSync(join(RAIZ, 'sitio.json'), 'utf8'))
const URL_SITIO = new URL(sitio.url)
const BASE = URL_SITIO.pathname // "/" o "/auditorias-universitarias/"
const PUERTO = 4179
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PARALELO = 6

// ── Rutas a generar (misma lógica de slugs que src/lib/rutas.ts) ─────────────────────────────
const slug = (t) =>
  t
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
const slugProvincia = (n) => (n === 'Capital Federal' || n === 'Ciudad Autónoma de Buenos Aires' ? 'caba' : slug(n))
const slugSede = (n) => slug(n).split('-').filter((p) => p !== 'sede').join('-')

const universidades = JSON.parse(readFileSync(join(RAIZ, 'src/data/universidades-raw.json'), 'utf8'))
const mapa = JSON.parse(readFileSync(join(RAIZ, 'src/data/mapa-estatico.json'), 'utf8'))
const fuenteSedes = readFileSync(join(RAIZ, 'src/data/sedes.ts'), 'utf8')
const fuenteRutas = readFileSync(join(RAIZ, 'src/lib/rutas.ts'), 'utf8')

const metricas = [...fuenteRutas.slice(fuenteRutas.indexOf('SLUG_METRICA'), fuenteRutas.indexOf('metricaDesdeSlug')).matchAll(/: '([a-z-]+)'/g)].map((m) => m[1])
const siglaDe = (id) => slug(universidades[id].sigla)

/** { ruta, indexar } — las que no se indexan igual se generan, para que el link directo funcione. */
const rutas = [
  { ruta: '/', indexar: true },
  { ruta: '/rankings', indexar: true },
  ...metricas.filter((m) => m !== 'tasa-de-egreso').map((m) => ({ ruta: `/rankings/${m}`, indexar: true })),
  { ruta: '/universidades-kirchneristas', indexar: true },
  { ruta: '/propuestas', indexar: true },
  { ruta: '/presentacion', indexar: false },
  ...mapa.provincias.map((p) => ({ ruta: `/mapa/${slugProvincia(p.nombre)}`, indexar: true })),
  ...Object.keys(universidades).map((id) => ({ ruta: `/universidades/${siglaDe(id)}`, indexar: true })),
  ...[...fuenteSedes.matchAll(/\['(\w+)', '([^']+)', '[^']+', /g)]
    .filter(([, uni]) => universidades[uni])
    .map(([, uni, nombre]) => ({ ruta: `/universidades/${siglaDe(uni)}/sedes/${slugSede(nombre)}`, indexar: false })),
]

// ── Servidor de la build (vite preview, con fallback de SPA) ─────────────────────────────────
const preview = spawn('npx', ['vite', 'preview', '--port', String(PUERTO), '--strictPort'], { cwd: RAIZ, stdio: 'pipe' })
const listo = new Promise((ok, mal) => {
  preview.stdout.on('data', (d) => d.toString().includes(String(PUERTO)) && ok())
  preview.on('exit', (c) => mal(new Error(`vite preview terminó (código ${c})`)))
})
await listo

const shellSpa = readFileSync(join(DIST, 'index.html'), 'utf8')
writeFileSync(join(DIST, '404.html'), shellSpa)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
const errores = []
let hechas = 0

async function renderizar(page, { ruta }) {
  const url = `http://localhost:${PUERTO}${BASE.replace(/\/$/, '')}${ruta}`
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })
  // Que terminen las animaciones de entrada (el HTML guardado es el estado final, no el inicial).
  await new Promise((r) => setTimeout(r, 700))
  const titulo = await page.title()
  if (titulo.startsWith('Página no encontrada')) throw new Error('renderizó la página 404')
  // El hover/tooltips y estados de interacción no van al HTML: solo el contenido.
  return '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML))
}

async function trabajador(cola) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 820 })
  page.on('pageerror', (e) => errores.push(`error de JS: ${e.message}`))
  while (cola.length) {
    const r = cola.shift()
    try {
      const html = await renderizar(page, r)
      const destino = r.ruta === '/' ? join(DIST, 'index.html') : join(DIST, r.ruta, 'index.html')
      mkdirSync(dirname(destino), { recursive: true })
      writeFileSync(destino, html)
      hechas++
    } catch (e) {
      errores.push(`${r.ruta}: ${e.message}`)
    }
  }
  await page.close()
}

const cola = [...rutas]
await Promise.all(Array.from({ length: PARALELO }, () => trabajador(cola)))
await browser.close()
preview.kill()

// ── Archivos para buscadores y hosting ───────────────────────────────────────────────────────
const absoluta = (ruta) => (ruta === '/' ? sitio.url : `${sitio.url}${ruta.replace(/^\//, '')}/`)
const hoy = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rutas
    .filter((r) => r.indexar)
    .map((r) => `  <url><loc>${absoluta(r.ruta)}</loc><lastmod>${hoy}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
)
// Sin Disallow: las páginas que no se indexan (presentación) lo dicen con <meta name="robots" noindex>,
// y Google solo puede leer esa etiqueta si tiene permitido entrar.
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${sitio.url}sitemap.xml\n`)
writeFileSync(join(DIST, '.nojekyll'), '')
writeFileSync(join(DIST, '.htaccess'), `DirectorySlash On\nDirectoryIndex index.html\nErrorDocument 404 ${BASE}404.html\n`)
if (!URL_SITIO.hostname.endsWith('github.io')) writeFileSync(join(DIST, 'CNAME'), `${URL_SITIO.hostname}\n`)

console.log(`prerender: ${hechas}/${rutas.length} páginas · sitemap con ${rutas.filter((r) => r.indexar).length} URLs`)
if (errores.length) {
  console.error(errores.join('\n'))
  process.exit(1)
}
