import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Ranking } from './pages/Ranking'
import { Universidad } from './pages/Universidad'
import { Kirchneristas } from './pages/Kirchneristas'
import { Propuestas } from './pages/Propuestas'
import { Presentacion } from './pages/Presentacion'
import { NoEncontrada } from './pages/NoEncontrada'
import { useMoneda } from './lib/moneda'
import { RUTAS, rutaDesdeHashViejo } from './lib/rutas'

// Sin barra final: "/auditorias-universitarias" en github.io, "" con dominio propio.
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '')

// Links viejos con hash (/#/universidad/uba, QR impresos): se reescriben a la URL nueva antes de que
// arranque el router, con replaceState para que "atrás" no vuelva a la versión con hash.
const redireccion = rutaDesdeHashViejo(window.location.hash)
if (redireccion) window.history.replaceState(null, '', BASENAME + redireccion)

/**
 * Clave de transición entre páginas: las rutas que son "la misma pantalla" comparten clave para no
 * re-montarse (y perder el estado o el scroll) al cambiar solo un parámetro — el mapa al abrir una
 * provincia, el ranking al cambiar de métrica, la ficha al saltar a una de sus sedes.
 */
function claveDePantalla(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/mapa')) return 'mapa'
  if (pathname.startsWith('/rankings')) return 'rankings'
  const ficha = pathname.match(/^\/universidades\/[^/]+/)
  return ficha ? ficha[0] : pathname
}

// Solo opacity: Home usa `position: fixed` para el mapa de fondo, y cualquier transform (x/y/scale)
// en un ancestro le crearía un containing block nuevo, corriendo el mapa fijo durante la transición.
// El scroll-reset va en el mount de esta página (no en un efecto atado a location en Shell), para que
// dispare recién cuando la página NUEVA aparece — no cuando la vieja todavía se está desvaneciendo.
function PageFade({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
      {children}
    </motion.div>
  )
}

function Shell() {
  const location = useLocation()
  // Suscripción a la moneda elegida: al cambiar, re-renderiza todo el árbol para que cada
  // formatMoneda() vuelva a formatear en la moneda nueva.
  useMoneda()
  // Home (mapa a pantalla completa) y la presentación tienen su propio chrome: sin navbar.
  const clave = claveDePantalla(location.pathname)
  const pantallaPropia = clave === 'mapa' || location.pathname === RUTAS.presentacion
  return (
    <div className="min-h-screen">
      {!pantallaPropia && <Navbar />}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={clave}>
          <Route path="/" element={<Home />} />
          {/* Misma posición y mismo tipo que "/": React conserva el Home montado al abrir una provincia. */}
          <Route path="/mapa/:provincia" element={<Home />} />
          <Route
            path="/rankings/:metrica?"
            element={
              <PageFade>
                <Ranking />
              </PageFade>
            }
          />
          <Route
            path={RUTAS.kirchneristas}
            element={
              <PageFade>
                <Kirchneristas />
              </PageFade>
            }
          />
          <Route
            path={RUTAS.propuestas}
            element={
              <PageFade>
                <Propuestas />
              </PageFade>
            }
          />
          <Route path={RUTAS.presentacion} element={<Presentacion />} />
          {['/universidades/:slug', '/universidades/:slug/sedes/:sede'].map((path) => (
            <Route
              key={path}
              path={path}
              element={
                <PageFade>
                  <Universidad />
                </PageFade>
              }
            />
          ))}
          <Route path="/universidades" element={<Navigate to={RUTAS.rankings} replace />} />
          <Route
            path="*"
            element={
              <PageFade>
                <NoEncontrada />
              </PageFade>
            }
          />
        </Routes>
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Shell />
    </BrowserRouter>
  )
}
