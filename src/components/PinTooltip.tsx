import { getUniversidad } from '../data/universidades'
import { formatMoneda, formatPorcentaje, ubicacion } from '../lib/format'
import { pctExtranjeros } from '../lib/extranjeros'
import { METRICAS } from '../lib/metricas'

export type HoverMapa = {
  /** id de la universidad (de la sede central o de la que depende la sede). */
  universidad: string
  /** Presente si el punto es una sede/unidad académica y no la sede central. */
  sede?: { nombre: string; ciudad: string; provincia: string }
  x: number
  y: number
}

const ANCHO = 268
const ALTO_ESTIMADO = 190

function Fila({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-upl-crema/60">{label}</span>
      <span className={`font-display font-700 tabular-nums ${alerta ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}>{valor}</span>
    </div>
  )
}

/** Panelcito que sigue al cursor sobre un punto del mapa, con los indicadores clave de la universidad. */
export function PinTooltip({ hover }: { hover: HoverMapa | null }) {
  if (!hover) return null
  const u = getUniversidad(hover.universidad)
  if (!u) return null

  // Se abre abajo a la derecha del cursor, y se da vuelta si no entra en la pantalla.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = hover.x + 16 + ANCHO > vw ? hover.x - 16 - ANCHO : hover.x + 16
  const top = hover.y + 16 + ALTO_ESTIMADO > vh ? Math.max(8, hover.y - 16 - ALTO_ESTIMADO) : hover.y + 16

  const ceroMaterias = METRICAS.ceroMaterias.valor({ id: hover.universidad, ...u })
  const extranjeros = pctExtranjeros(u)

  return (
    <div
      className="pointer-events-none fixed z-40 glass-strong rounded-xl px-3.5 py-3 text-xs shadow-[0_10px_30px_rgba(10,8,30,0.45)]"
      style={{ left: Math.max(8, left), top, width: ANCHO }}
    >
      {hover.sede ? (
        <>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-semibold text-[#8fb7ff]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#8fb7ff]" /> Sede / unidad académica
          </div>
          <div className="mt-0.5 font-semibold text-sm text-upl-crema leading-snug">{hover.sede.nombre}</div>
          <div className="text-upl-crema/60">
            {ubicacion(hover.sede.ciudad, hover.sede.provincia)} · {u.sigla}
          </div>
        </>
      ) : (
        <>
          <div className="font-display font-800 text-base text-upl-amarillo leading-tight">{u.sigla}</div>
          <div className="font-semibold text-upl-crema leading-snug">{u.nombre}</div>
          <div className="text-upl-crema/60">{ubicacion(u.ciudad, u.provincia)}</div>
        </>
      )}

      {u.tieneDatos ? (
        <div className="mt-2.5 pt-2.5 border-t border-upl-crema/10 flex flex-col gap-1">
          {hover.sede && <div className="text-[10px] uppercase tracking-wide text-upl-crema/40 mb-0.5">Datos de toda la {u.sigla}</div>}
          <Fila label="Se recibe en tiempo y forma" valor={formatPorcentaje(u.tasaCohorte)} alerta={(u.tasaCohorte ?? 100) < 30} />
          <Fila label="Reinscriptos sin aprobar materias" valor={formatPorcentaje(ceroMaterias)} alerta={(ceroMaterias ?? 0) >= 25} />
          <Fila label="Costo por graduado" valor={u.docentesNoComparable ? 'No comparable' : formatMoneda(u.costoPorGraduado)} />
          {extranjeros != null && <Fila label="Extranjeros en el padrón" valor={formatPorcentaje(extranjeros)} />}
          <div className="mt-1 text-[10px] text-upl-resaltador">Click para ver la ficha completa →</div>
        </div>
      ) : (
        <div className="mt-2 text-upl-amarillo">Sin datos reportados al Anuario de la SPU todavía</div>
      )}
    </div>
  )
}
