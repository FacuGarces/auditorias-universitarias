import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { universidadesArray } from '../data/universidades'
import { UniversidadBadge } from '../components/UniversidadBadge'
import { formatMoneda, formatNumero, formatPorcentaje, ubicacion } from '../lib/format'

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
  const universidades = useMemo(
    () =>
      universidadesArray
        .filter((u) => u.esKirchnerista)
        .sort((a, b) => a.fundacion - b.fundacion),
    [],
  )

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="blob w-[34rem] h-[34rem] bg-[#e2574c]/25 -top-32 -right-32" />
        <div className="blob w-[26rem] h-[26rem] bg-upl-secundario/40 bottom-0 -left-20" style={{ animationDelay: '5s' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="font-display font-800 text-3xl text-upl-crema mb-1">Universidades kirchneristas</h1>
        <p className="text-upl-crema/60 mb-4">
          {universidades.length} universidades nacionales creadas por ley durante los gobiernos de Néstor Kirchner,
          Cristina Fernández de Kirchner o Alberto Fernández — la mayoría, sancionadas para responder a pedidos de
          intendentes del conurbano bonaerense o de legisladores propios, más que a un plan de oferta académica.
        </p>
        <div className="rounded-2xl border border-[#e2574c]/40 bg-[#e2574c]/10 px-5 py-4 mb-6">
          <p className="text-sm text-upl-crema/90">
            Varias de estas universidades tardaron años en abrir sus puertas después de sancionada la ley, varias
            fueron señaladas públicamente por vínculos entre sus autoridades y el poder político local que las
            impulsó, y el paquete final de cinco universidades de 2023 (Delta, Pilar, Ezeiza, Río Tercero y Madres
            de Plaza de Mayo) fue sancionado a dos meses y medio de terminar el mandato de Alberto Fernández —
            luego frenado administrativamente por el gobierno de Javier Milei y judicializado.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {universidades.map((u) => (
            <li key={u.id}>
              <Link
                to={`/universidad/${u.id}`}
                className="block rounded-xl glass hover:bg-[#e2574c]/10 px-4 py-3 transition-colors"
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
                      <div className="font-display font-700 text-upl-amarillo">
                        {u.tasaCohorte != null ? formatPorcentaje(u.tasaCohorte) : 'S/D'}
                      </div>
                      <div className="text-[11px] text-upl-crema/40">tasa de egreso</div>
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
            </li>
          ))}
        </ol>

        <p className="mt-6 mb-8 text-xs text-upl-crema/40">
          Fuente: Anuarios de Estadísticas Universitarias (SPU) y leyes de creación publicadas en el Boletín
          Oficial. Costo por graduado en pesos constantes de 2024.
        </p>
      </div>
    </div>
  )
}
