import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Ranking } from './pages/Ranking'
import { Universidad } from './pages/Universidad'
import { Kirchneristas } from './pages/Kirchneristas'
import { Propuestas } from './pages/Propuestas'
import { Presentacion } from './pages/Presentacion'

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
  // Home (mapa a pantalla completa) y la presentación tienen su propio chrome: sin navbar.
  const pantallaPropia = location.pathname === '/' || location.pathname === '/presentacion'
  return (
    <div className="min-h-screen">
      {!pantallaPropia && <Navbar />}
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route
            path="/ranking"
            element={
              <PageFade>
                <Ranking />
              </PageFade>
            }
          />
          <Route
            path="/kirchneristas"
            element={
              <PageFade>
                <Kirchneristas />
              </PageFade>
            }
          />
          <Route
            path="/propuestas"
            element={
              <PageFade>
                <Propuestas />
              </PageFade>
            }
          />
          <Route path="/presentacion" element={<Presentacion />} />
          <Route
            path="/universidad/:id"
            element={
              <PageFade>
                <Universidad />
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
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
