import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { universidadesArray } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { ubicacion } from '../lib/format'
import { METRICAS, type MetricaId } from '../lib/metricas'

export function Ranking() {
  const [metrica, setMetrica] = useState<MetricaId>('cohorte')
  const [invertido, setInvertido] = useState(false)
  const navigate = useNavigate()
  const cfg = METRICAS[metrica]
  const ascendente = invertido ? !cfg.ordenAsc : cfg.ordenAsc

  const filas = useMemo(() => {
    const conDatos = universidadesArray.filter((u) => u.tieneDatos)
    return conDatos
      .slice()
      .sort((a, b) => {
        const va = cfg.valor(a)
        const vb = cfg.valor(b)
        if (va == null) return 1
        if (vb == null) return -1
        return ascendente ? va - vb : vb - va
      })
  }, [cfg, ascendente])

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="blob w-[34rem] h-[34rem] bg-upl-secundario/40 -top-32 -right-32" />
        <div className="blob w-[26rem] h-[26rem] bg-upl-resaltador/15 bottom-0 -left-20" style={{ animationDelay: '5s' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display font-800 text-3xl text-upl-crema mb-1"
        >
          Rankings
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-upl-crema/60 mb-6"
        >
          Comparativa de las universidades nacionales relevadas hasta el momento (
          {universidadesArray.filter((u) => u.tieneDatos).length}). El resto del mapa se irá completando.
        </motion.p>

        <div className="flex flex-wrap gap-2 mb-4">
          {(Object.keys(METRICAS) as MetricaId[]).map((key) => (
            <button
              key={key}
              onClick={() => setMetrica(key)}
              className={`relative rounded-full px-4 py-2 font-display font-600 text-sm transition-colors ${
                metrica === key ? 'text-upl-principal' : 'glass-chip text-upl-crema hover:bg-upl-crema/15'
              }`}
            >
              {metrica === key && (
                <motion.span
                  layoutId="ranking-metrica-pill"
                  className="absolute inset-0 rounded-full bg-upl-amarillo -z-10"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              {METRICAS[key].label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm text-upl-crema/50">{cfg.subtitulo}</p>
          <motion.button
            onClick={() => setInvertido((v) => !v)}
            whileTap={{ scale: 0.94 }}
            className="shrink-0 rounded-full glass-chip text-upl-crema text-xs font-semibold px-3 py-1.5 hover:bg-upl-crema/15 transition-colors whitespace-nowrap"
          >
            <motion.span
              key={ascendente ? 'asc' : 'desc'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="inline-block"
            >
              {ascendente ? '↑' : '↓'}
            </motion.span>{' '}
            {ascendente ? 'Menor a mayor' : 'Mayor a menor'}
          </motion.button>
        </div>

        <ol className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {filas.map((u, i) => (
              <motion.li
                key={u.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ layout: { type: 'spring', stiffness: 350, damping: 32 }, opacity: { duration: 0.15 } }}
              >
                <motion.button
                  onClick={() => navigate(`/universidad/${u.id}`)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center gap-4 rounded-xl glass-flat hover:bg-upl-amarillo/10 px-4 py-3 text-left transition-colors"
                >
                  <span className="font-display font-800 text-xl text-upl-crema/25 w-7 shrink-0">{i + 1}</span>
                  <UniversidadBadge sigla={u.sigla} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-upl-crema truncate">{u.nombre}</div>
                    <div className="text-xs text-upl-crema/50 truncate">{ubicacion(u.ciudad, u.provincia)}</div>
                  </div>
                  <div className="font-display font-700 text-lg text-upl-amarillo shrink-0">
                    {cfg.formato(cfg.valor(u))}
                  </div>
                </motion.button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>

        <p className="mt-6 mb-8 text-xs text-upl-crema/40">
          Fuente: Anuarios de Estadísticas Universitarias — Secretaría de Políticas Universitarias.
        </p>
      </div>
    </div>
  )
}
