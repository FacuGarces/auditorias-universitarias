import { Link } from 'react-router-dom'
import { useMeta } from '../lib/meta'
import { RUTAS } from '../lib/rutas'

export function NoEncontrada() {
  useMeta({ titulo: 'Página no encontrada', descripcion: 'La página que buscás no existe.', ruta: '/404', indexar: false })
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <div className="font-display font-800 text-6xl text-upl-amarillo">404</div>
      <h1 className="mt-2 font-display font-700 text-2xl text-upl-crema">No encontramos esta página</h1>
      <p className="mt-2 text-upl-crema/60">Puede que el link esté mal escrito o que la página haya cambiado de lugar.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={RUTAS.inicio} className="rounded-full bg-upl-amarillo text-upl-principal font-display font-600 px-4 py-2">
          Ir al mapa
        </Link>
        <Link to={RUTAS.rankings} className="rounded-full glass-chip text-upl-crema font-display font-600 px-4 py-2">
          Ver los rankings
        </Link>
      </div>
    </div>
  )
}
