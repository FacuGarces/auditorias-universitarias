import { HashRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Ranking } from './pages/Ranking'
import { Universidad } from './pages/Universidad'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-upl-crema">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/universidad/:id" element={<Universidad />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
