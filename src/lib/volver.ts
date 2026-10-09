import { useNavigate } from 'react-router-dom'

/**
 * Vuelve a la pantalla anterior dentro del sitio; si se entró directo por link (sin historial propio),
 * va al destino de respaldo en vez de sacar al usuario de la página.
 */
export function useVolver(respaldo = '/') {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(respaldo)
  }
}
