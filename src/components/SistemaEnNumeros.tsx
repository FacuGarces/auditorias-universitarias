import { useState } from 'react'
import { motion } from 'motion/react'
import { EvolutionChart } from './EvolutionChart'
import { decimal, formatMoneda, formatNumero, formatPorcentaje, unidadMonetaria } from '../lib/format'
import type { ResumenSistema } from '../lib/sistema'

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}
const cellVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
} as const

function signo(n: number): string {
  return `${n >= 0 ? '▲ +' : '▼ '}${formatNumero(n)}`
}

function Kpi({ label, value, hint, alerta }: { label: string; value: React.ReactNode; hint: string; alerta?: boolean }) {
  return (
    <motion.div
      variants={cellVariants}
      className={`flex-1 min-w-[200px] px-5 py-4 ${alerta ? 'bg-[#e2574c]/[0.12]' : 'bg-upl-principal-light/40'}`}
    >
      <div className={`text-xs uppercase tracking-wide font-semibold mb-1 ${alerta ? 'text-[#ff8a7a]' : 'text-upl-resaltador'}`}>
        {label}
      </div>
      <div className={`font-display font-800 text-2xl sm:text-3xl leading-tight ${alerta ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-upl-crema/55">{hint}</div>
    </motion.div>
  )
}

/**
 * Panel de totales agregados de un grupo de universidades (todo el país o una provincia). Como la ficha
 * de cada universidad: arriba un resumen de cuatro números y, al hacer click, el resto de los KPIs y la
 * evolución de ingresantes y egresados (transición de altura grid 0fr → 1fr; el contenido queda en el
 * DOM para el prerender, con `inert` mientras está cerrado).
 */
export function SistemaEnNumeros({ titulo, resumen: r }: { titulo: string; resumen: ResumenSistema }) {
  const vi = r.variacionIngresantes
  const ve = r.variacionEgresados
  const d = r.dedicacion
  const [abierto, setAbierto] = useState(false)

  return (
    <section className="rounded-2xl overflow-hidden border border-upl-crema/12 bg-upl-crema/15 [backdrop-filter:blur(18px)] shadow-[0_8px_30px_rgba(10,8,30,0.35)]">
      <div className="px-5 py-3 bg-upl-principal/70 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display font-700 text-lg text-upl-crema">{titulo}</h2>
        <span className="text-xs text-upl-crema/50">
          {r.universidades} universidades · {formatNumero(r.estudiantes)} estudiantes · {formatNumero(r.egresados2024)} egresados en 2024
        </span>
      </div>

      <motion.div
        variants={gridVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap gap-px mt-px"
      >
        <Kpi
          alerta
          label="No se recibe a tiempo"
          value={
            r.noSeReciben != null ? (
              <>
                {r.noSeReciben} <span className="text-base sm:text-lg font-700 opacity-80">de cada 100</span>
              </>
            ) : (
              'S/D'
            )
          }
          hint={`Egresados 2024 sobre ingresantes 2018: ${formatPorcentaje(r.cohorte)} de egreso, ponderado por tamaño.`}
        />
        <Kpi
          alerta
          label="Estudiantes sin materias"
          value={formatNumero(r.ceroMateriasN)}
          hint={`${formatPorcentaje(r.ceroMateriasPct)} de los inscriptos 2024 (reinscriptos + ingresantes) no aprobó ninguna materia en todo el año.`}
        />
        <Kpi
          label="Costo por graduado"
          value={formatMoneda(r.costoPorGraduado)}
          hint={`Promedio ponderado por egresados, en ${unidadMonetaria()}.`}
        />
        <Kpi
          alerta={r.activosPorDocente != null && r.activosPorDocente < 4}
          label="Estudiantes activos por docente"
          value={r.activosPorDocente != null ? `${decimal(r.activosPorDocente)} x 1` : 'S/D'}
          hint="Estudiantes que aprobaron al menos una materia en 2024, por cada cargo docente universitario."
        />
      </motion.div>

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full mt-px flex items-center justify-center gap-2 bg-upl-principal/70 hover:bg-upl-principal/50 px-5 py-2.5 text-sm font-semibold text-upl-resaltador transition-colors"
      >
        {abierto ? 'Ver menos' : 'Ver más datos y gráficos'}
        <motion.svg
          viewBox="0 0 20 20"
          className="w-4 h-4"
          fill="currentColor"
          animate={{ rotate: abierto ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden
        >
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </motion.svg>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        inert={!abierto}
      >
        <div className="overflow-hidden">
          <div className={`transition-opacity duration-300 ${abierto ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-wrap gap-px mt-px">
        {r.extranjeros.gasto != null && (
          <Kpi
            alerta
            label="Gasto en estudiantes extranjeros"
            value={formatMoneda(r.extranjeros.gasto)}
            hint={`${formatNumero(r.extranjeros.extranjeros)} extranjeros, ${formatPorcentaje(r.extranjeros.pct)} del padrón de grado. Es lo que se ahorraría por año si pagaran un arancel que cubra su costo (presupuesto 2024 por estudiante).`}
          />
        )}
        {vi && ve && (
          <Kpi
            label={`Ingresantes vs. egresados (${vi.desde}→${vi.hasta})`}
            value={`+${vi.pct}% vs. +${ve.pct}%`}
            hint={`Ingresantes: ${formatNumero(vi.inicial)} → ${formatNumero(vi.final)}. Egresados: ${formatNumero(ve.inicial)} → ${formatNumero(ve.final)}.`}
          />
        )}
        {d && (
          <Kpi
            label="Cargos docentes vs. horas reales"
            value={`+${d.varCargosPct}% vs. +${d.varFtePct}%`}
            hint={`2017→2023, ${d.universidades} universidades. Cargos simples: ${signo(d.simple2023 - d.simple2017)}; exclusivos: ${signo(d.excl2023 - d.excl2017)}. FTE = equivalente a tiempo completo.`}
          />
        )}
            </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px mt-px">
        <div className="bg-upl-principal-light/40 px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">Ingresantes nuevos por año</div>
          <EvolutionChart data={r.ingresantes} color="#8fb7ff" formatValue={(v) => formatNumero(v)} />
        </div>
        <div className="bg-upl-principal-light/40 px-5 py-4">
          <div className="text-xs uppercase tracking-wide text-upl-resaltador font-semibold mb-2">Egresados por año</div>
          <EvolutionChart data={r.egresados} color="#e4b862" formatValue={(v) => formatNumero(v)} />
        </div>
      </div>
      <p className="bg-upl-principal-light/40 mt-px px-5 py-2.5 text-[11px] text-upl-crema/45">
        Suma de las universidades relevadas. Cada gráfico usa su propia escala: los egresados son un volumen mucho menor
        al de ingresantes. Parte del crecimiento de ingresantes se explica por universidades nuevas que se suman a la serie.
      </p>
          </div>
        </div>
      </div>
    </section>
  )
}
