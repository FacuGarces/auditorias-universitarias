import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { universidadesArray } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { formatMoneda, formatNumero, ubicacion } from '../lib/format'
import { METRICAS, esPeor, promedio, type MetricaId } from '../lib/metricas'

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
} as const

const PERIODOS: Record<string, string> = {
  '2007': 'Néstor Kirchner / transición a CFK',
  '2009': 'Cristina Fernández de Kirchner (1er mandato)',
  '2014': 'Cristina Fernández de Kirchner (2do mandato)',
  '2015': 'Cristina Fernández de Kirchner (2do mandato)',
  '2023': 'Alberto Fernández',
}

function periodoDe(fundacion: number): string {
  if (fundacion <= 2008) return PERIODOS['2007']
  if (fundacion <= 2013) return PERIODOS['2009']
  if (fundacion <= 2015) return PERIODOS['2014']
  return PERIODOS['2023']
}

export function Kirchneristas() {
  const [metrica, setMetrica] = useState<MetricaId>('cohorte')
  const [invertido, setInvertido] = useState(false)
  const cfg = METRICAS[metrica]
  const ascendente = invertido ? !cfg.ordenAsc : cfg.ordenAsc

  const universidades = useMemo(() => {
    const kirchneristas = universidadesArray.filter((u) => u.esKirchnerista)
    return kirchneristas.slice().sort((a, b) => {
      const va = cfg.valor(a)
      const vb = cfg.valor(b)
      if (va == null && vb == null) return a.fundacion - b.fundacion
      if (va == null) return 1
      if (vb == null) return -1
      return ascendente ? va - vb : vb - va
    })
  }, [cfg, ascendente])

  const comparativa = useMemo(() => {
    const kUnis = universidadesArray.filter((u) => u.esKirchnerista && u.tieneDatos)
    const restoUnis = universidadesArray.filter((u) => !u.esKirchnerista && u.tieneDatos)
    return (Object.keys(METRICAS) as MetricaId[]).map((key) => {
      const m = METRICAS[key]
      return {
        key,
        label: m.label,
        formato: m.formato,
        ordenAsc: m.ordenAsc,
        k: promedio(kUnis, m.valor),
        resto: promedio(restoUnis, m.valor),
      }
    })
  }, [])

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="blob w-[34rem] h-[34rem] bg-[#e2574c]/25 -top-32 -right-32" />
        <div className="blob w-[26rem] h-[26rem] bg-upl-secundario/40 bottom-0 -left-20" style={{ animationDelay: '5s' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display font-800 text-3xl text-upl-crema mb-1"
        >
          Universidades kirchneristas
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-upl-crema/60 mb-4"
        >
          {universidades.length} universidades nacionales creadas por ley durante los gobiernos de Néstor Kirchner,
          Cristina Fernández de Kirchner o Alberto Fernández — la mayoría, sancionadas para responder a pedidos de
          intendentes del conurbano bonaerense o de legisladores propios, más que a un plan de oferta académica.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-[#e2574c]/40 bg-[#e2574c]/10 px-5 py-4 mb-6"
        >
          <p className="text-sm text-upl-crema/90">
            Varias de estas universidades tardaron años en abrir sus puertas después de sancionada la ley, varias
            fueron señaladas públicamente por vínculos entre sus autoridades y el poder político local que las
            impulsó, y el paquete final de cinco universidades de 2023 (Delta, Pilar, Ezeiza, Río Tercero y Madres
            de Plaza de Mayo) fue sancionado a dos meses y medio de terminar el mandato de Alberto Fernández —
            luego frenado administrativamente por el gobierno de Javier Milei y judicializado.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-6"
        >
          <h2 className="font-display font-700 text-sm text-upl-crema/70 mb-2">
            Promedio universidades K vs. resto del sistema
          </h2>
          <div className="rounded-2xl overflow-hidden flex flex-wrap gap-px border border-upl-crema/12 bg-upl-crema/15 [backdrop-filter:blur(18px)] shadow-[0_8px_30px_rgba(10,8,30,0.35)]">
            {comparativa.map((c) => {
              const kPeor = esPeor(c.k, c.resto, c.ordenAsc)
              const restoPeor = esPeor(c.resto, c.k, c.ordenAsc)
              return (
                <div key={c.key} className="flex-1 min-w-[220px] px-5 py-4 bg-upl-principal-light/40">
                  <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">{c.label}</div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-upl-crema/50">Universidades K</div>
                      <div
                        className={`font-display font-800 text-xl ${kPeor ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}
                      >
                        {c.formato(c.k)}
                      </div>
                    </div>
                    <div className="text-upl-crema/20 text-sm shrink-0">vs</div>
                    <div className="text-right">
                      <div className="text-[11px] text-upl-crema/50">Resto del sistema</div>
                      <div
                        className={`font-display font-800 text-xl ${restoPeor ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}
                      >
                        {c.formato(c.resto)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

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
                  layoutId="kirch-metrica-pill"
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

        <motion.ol className="flex flex-col gap-3" variants={listVariants} initial="hidden" animate="visible">
          {universidades.map((u) => (
            <motion.li key={u.id} variants={itemVariants}>
              <Link
                to={`/universidad/${u.id}`}
                className="group block rounded-xl glass-flat hover:bg-[#e2574c]/10 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 px-4 py-3 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <UniversidadBadge sigla={u.sigla} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-upl-crema truncate">{u.nombre}</div>
                    <div className="text-xs text-upl-crema/50 truncate">
                      {ubicacion(u.ciudad, u.provincia)} · {u.fundacionLey ?? `Fundada en ${u.fundacion}`}
                    </div>
                    <div className="text-[11px] text-[#ff8a7a] mt-0.5">{periodoDe(u.fundacion)}</div>
                  </div>
                  {u.tieneDatos ? (
                    <div className="text-right shrink-0">
                      <div className="font-display font-700 text-upl-amarillo">{cfg.formato(cfg.valor(u))}</div>
                      <div className="text-[11px] text-upl-crema/40">{cfg.label}</div>
                    </div>
                  ) : (
                    <div className="text-right shrink-0 text-xs text-upl-crema/40 italic">Sin datos</div>
                  )}
                </div>
                {u.tieneDatos && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-upl-crema/60 pl-[calc(3.5rem+1rem)]">
                    <span>{formatNumero(u.estudiantes2024)} estudiantes</span>
                    {u.costoPorGraduado != null && <span>{formatMoneda(u.costoPorGraduado)} por graduado</span>}
                    {u.personalNoDocente != null && <span>{formatNumero(u.personalNoDocente)} no docentes</span>}
                  </div>
                )}
              </Link>
            </motion.li>
          ))}
        </motion.ol>

        <p className="mt-6 mb-8 text-xs text-upl-crema/40">
          Fuente: Anuarios de Estadísticas Universitarias (SPU) y leyes de creación publicadas en el Boletín
          Oficial. Costo por graduado en pesos constantes de agosto 2026.
        </p>
      </div>
    </div>
  )
}
