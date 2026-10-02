import { motion } from 'motion/react'
import { EvolutionChart } from './EvolutionChart'
import { formatMoneda, formatNumero, formatPorcentaje } from '../lib/format'
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
 * Panel de totales agregados de un grupo de universidades (todo el país o una provincia): KPIs +
 * evolución de ingresantes y egresados, todo en un solo marco con zonas internas.
 */
export function SistemaEnNumeros({ titulo, resumen: r }: { titulo: string; resumen: ResumenSistema }) {
  const vi = r.variacionIngresantes
  const ve = r.variacionEgresados
  const d = r.dedicacion

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
          label="Reinscriptos sin materias"
          value={formatNumero(r.ceroMateriasN)}
          hint={`${formatPorcentaje(r.ceroMateriasPct)} de quienes siguen inscriptos no aprobó ninguna materia en el último año informado.`}
        />
        <Kpi
          label="Costo por graduado"
          value={formatMoneda(r.costoPorGraduado)}
          hint="Promedio ponderado por egresados, en pesos constantes de agosto 2026."
        />
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
      </motion.div>

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
    </section>
  )
}
