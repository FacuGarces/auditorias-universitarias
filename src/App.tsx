import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Ranking } from './pages/Ranking'
import { Universidad } from './pages/Universidad'
import { Kirchneristas } from './pages/Kirchneristas'

function Shell() {
  const { pathname } = useLocation()
  const esHome = pathname === '/'
  return (
    <div className="min-h-screen">
      {!esHome && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/kirchneristas" element={<Kirchneristas />} />
        <Route path="/universidad/:id" element={<Universidad />} />
      </Routes>
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
