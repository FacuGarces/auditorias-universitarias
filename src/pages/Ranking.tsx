import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { universidadesArray } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { ProvinciaCombobox } from '../components/ProvinciaCombobox'
import { SistemaEnNumeros } from '../components/SistemaEnNumeros'
import { ubicacion } from '../lib/format'
import { METRICAS, type MetricaId } from '../lib/metricas'
import { filtrarPorProvincia, nombreProvincia, useProvinciaFiltro } from '../lib/provincias'
import { resumenSistema } from '../lib/sistema'
import { metricaDesdeSlug, rutaRanking, rutaUniversidad } from '../lib/rutas'
import { useMeta } from '../lib/meta'
import { NoEncontrada } from './NoEncontrada'
import { LinkAnuarios } from '../components/LinkAnuarios'

// Fila del ranking como link real (<a href>): se puede abrir en otra pestaña y Google la sigue.
const MotionLink = motion.create(Link)

export function Ranking() {
  const { metrica: slug } = useParams()
  const metrica = metricaDesdeSlug(slug)
  if (!metrica) return <NoEncontrada />
  return <RankingMetrica metrica={metrica} />
}

function RankingMetrica({ metrica }: { metrica: MetricaId }) {
  const [invertido, setInvertido] = useState(false)
  const navigate = useNavigate()
  const cfg = METRICAS[metrica]
  const ascendente = invertido ? !cfg.ordenAsc : cfg.ordenAsc

  const [provincia, setProvincia] = useProvinciaFiltro()
  // La métrica vive en la URL (/rankings/costo-por-graduado): cada ranking se puede compartir.
  const setMetrica = (m: MetricaId) => navigate(rutaRanking(m, provincia), { replace: true })
  useMeta({
    titulo: `Ranking de universidades: ${cfg.label.toLowerCase()}`,
    descripcion: `Las universidades nacionales argentinas ordenadas por ${cfg.label.toLowerCase()}. ${cfg.subtitulo}`,
    ruta: rutaRanking(metrica),
  })
  const universidades = useMemo(() => filtrarPorProvincia(universidadesArray, provincia), [provincia])
  const resumen = useMemo(() => resumenSistema(universidades), [universidades])

  const filas = useMemo(() => {
    const conDatos = universidades.filter((u) => u.tieneDatos)
    return conDatos
      .slice()
      .sort((a, b) => {
        const va = cfg.valor(a)
        const vb = cfg.valor(b)
        if (va == null) return 1
        if (vb == null) return -1
        return ascendente ? va - vb : vb - va
      })
  }, [cfg, ascendente, universidades])

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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="relative z-30 flex flex-wrap items-center justify-between gap-3 mb-6"
        >
          <p className="text-upl-crema/60">
            Comparativa de las {universidadesArray.filter((u) => u.tieneDatos).length} universidades nacionales con
            datos en el Anuario de la SPU.
          </p>
          <ProvinciaCombobox value={provincia} onChange={setProvincia} />
        </motion.div>

        <motion.div
          key={provincia ?? 'pais'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8"
        >
          <SistemaEnNumeros
            titulo={provincia ? `${nombreProvincia(provincia)} en números` : 'El sistema en números'}
            resumen={resumen}
          />
        </motion.div>

        {/* En celular las métricas van en una fila con scroll horizontal en vez de apilarse. */}
        <div className="flex sm:flex-wrap gap-2 mb-4 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none]">
          {(Object.keys(METRICAS) as MetricaId[]).map((key) => (
            <button
              key={key}
              onClick={() => setMetrica(key)}
              className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-display font-600 text-sm transition-colors ${
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
          <p className="text-xs sm:text-sm text-upl-crema/50">{cfg.subtitulo}</p>
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
                <MotionLink
                  to={rutaUniversidad(u.id)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center gap-2.5 sm:gap-4 rounded-xl glass-flat hover:bg-upl-amarillo/10 px-3 sm:px-4 py-3 text-left transition-colors"
                >
                  <span className="font-display font-800 text-base sm:text-xl text-upl-crema/25 w-5 sm:w-7 shrink-0 text-center">{i + 1}</span>
                  <UniversidadBadge sigla={u.sigla} size="lista" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm sm:text-base text-upl-crema leading-snug line-clamp-2">{u.nombre}</div>
                    <div className="text-xs text-upl-crema/50 truncate">{ubicacion(u.ciudad, u.provincia)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display font-700 text-base sm:text-lg text-upl-amarillo">{cfg.formato(cfg.valor(u))}</div>
                    {cfg.detalle?.(u) && <div className="text-[11px] text-upl-crema/50">{cfg.detalle(u)}</div>}
                  </div>
                </MotionLink>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>

        <p className="mt-6 mb-8 text-xs text-upl-crema/40">
          Fuente: <LinkAnuarios /> — Secretaría de Políticas Universitarias.
        </p>
      </div>
    </div>
  )
}
