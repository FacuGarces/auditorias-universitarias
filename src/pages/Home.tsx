import { useNavigate } from 'react-router-dom'
import { MapaArgentina } from '../components/MapaArgentina'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { mapaUniversidades } from '../data/mapaUniversidades'
import type { UniversidadMapa } from '../types'
import { ubicacion } from '../lib/format'

export function Home() {
  const navigate = useNavigate()

  function handleSelect(u: UniversidadMapa) {
    if (u.tieneFicha) navigate(`/universidad/${u.id}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8">
        <h1 className="font-display font-800 text-3xl sm:text-4xl text-upl-principal mb-2">
          El estado real de las universidades nacionales
        </h1>
        <p className="text-upl-principal/80 max-w-3xl">
          Un relevamiento independiente de matrícula, egreso, planta docente y presupuesto de las universidades
          nacionales argentinas, a partir de los Anuarios de Estadísticas Universitarias de la Secretaría de
          Políticas Universitarias (SPU). Explorá el mapa por provincia o entrá directo al{' '}
          <a href="#/ranking" className="underline decoration-upl-resaltador decoration-2 underline-offset-2">
            ranking
          </a>.
        </p>
      </section>

      <MapaArgentina onSelectUniversidad={handleSelect} />

      <section className="mt-10">
        <h2 className="font-display font-700 text-xl text-upl-principal mb-3">
          Todas las sedes relevadas ({mapaUniversidades.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {mapaUniversidades
            .slice()
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                disabled={!u.tieneFicha}
                className={`flex items-center gap-3 rounded-xl border border-upl-principal/10 bg-white/60 px-3 py-2 text-left transition-colors ${
                  u.tieneFicha ? 'hover:bg-upl-amarillo/20 cursor-pointer' : 'opacity-60 cursor-default'
                }`}
              >
                <UniversidadBadge sigla={u.sigla} size="sm" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-upl-principal truncate">{u.nombre}</div>
                  <div className="text-xs text-upl-principal/60 truncate">
                    {ubicacion(u.ciudad, u.provincia)}
                    {!u.tieneFicha && ' · sin ficha aún'}
                  </div>
                </div>
              </button>
            ))}
        </div>
      </section>
    </div>
  )
}
