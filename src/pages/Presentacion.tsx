import { Fragment, useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import mapaEstatico from '../data/mapa-estatico.json'
import { getUniversidad, universidadesArray } from '../data/universidades'
import { EvolutionChart } from '../components/EvolutionChart'
import { QrCode } from '../components/QrCode'
import { formatMoneda, formatNumero, formatPorcentaje, unidadMonetaria } from '../lib/format'
import { METRICAS } from '../lib/metricas'
import { POSICION_PRINCIPAL, propuestaPrincipal, propuestas } from '../lib/propuestas'
import { useMoneda } from '../lib/moneda'
import { SITIO_URL, SITIO_URL_CORTA, resumenSistema } from '../lib/sistema'

/*
 * Modo presentación: diapositivas a pantalla completa para exponer en paneles, con todos los
 * números calculados en vivo desde la misma base que el resto de la página. Navegación con
 * flechas / espacio / clic, F para pantalla completa. La diapositiva actual queda en la URL
 * (?s=N) para poder recargar o abrir directo en una.
 */

const mapa = mapaEstatico as {
  provincias: { nombre: string; d: string }[]
  pines: { id: string; x: number; y: number; tieneFicha: boolean }[]
}

// Comparación internacional: graduados cada 100 ingresantes (cohorte 2019→2023), CEA – Universidad de Belgrano.
const COMPARACION_INTERNACIONAL = [
  { pais: 'Chile', valor: 76 },
  { pais: 'Brasil', valor: 38 },
  { pais: 'Argentina', valor: 23 },
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display font-700 uppercase tracking-[0.18em] text-upl-resaltador text-[clamp(0.8rem,1.3vw,1.15rem)] mb-[1.5vh]">
      {children}
    </div>
  )
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display font-800 text-upl-crema leading-[1.05] text-[clamp(2rem,4.6vw,4.4rem)]">{children}</h2>
  )
}

function Fuente({ children }: { children: React.ReactNode }) {
  return <p className="mt-[3vh] text-[clamp(0.7rem,1vw,0.95rem)] text-upl-crema/40">{children}</p>
}

function Grande({ children, alerta }: { children: React.ReactNode; alerta?: boolean }) {
  return (
    <div
      className={`font-display font-800 leading-none text-[clamp(3.5rem,11vw,10rem)] ${alerta ? 'text-[#ff8a7a]' : 'text-upl-amarillo'}`}
    >
      {children}
    </div>
  )
}

function Barra({ label, valor, max, texto, destacada }: { label: string; valor: number; max: number; texto: string; destacada?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(6rem,16vw)_1fr] items-center gap-4">
      <div className={`text-right text-[clamp(0.9rem,1.6vw,1.5rem)] ${destacada ? 'text-upl-crema font-semibold' : 'text-upl-crema/70'}`}>
        {label}
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(valor / max) * (window.innerWidth < 640 ? 42 : 68)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className={`h-[clamp(1.4rem,3.6vh,2.6rem)] rounded-md shrink-0 ${destacada ? 'bg-[#e2574c]' : 'bg-upl-resaltador/70'}`}
        />
        <span className="font-display font-800 text-[clamp(0.85rem,2vw,1.9rem)] text-upl-crema leading-tight sm:whitespace-nowrap">{texto}</span>
      </div>
    </div>
  )
}

function MapaSedes() {
  return (
    <svg viewBox="0 0 620 900" className="h-[62vh] w-auto" aria-label="Mapa de sedes universitarias nacionales">
      {mapa.provincias.map((p) => (
        <path key={p.nombre} d={p.d} fill="#4a5580" stroke="#2a3360" strokeWidth={1} />
      ))}
      {mapa.pines.map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={5}
          fill={p.tieneFicha ? '#facf3b' : 'none'}
          stroke={p.tieneFicha ? '#242c50' : '#facf3b'}
          strokeWidth={1.2}
        />
      ))}
    </svg>
  )
}

function useDiapositivas() {
  // Los montos se formatean en la moneda elegida: hay que recalcular las diapositivas si cambia.
  const { moneda, tc } = useMoneda()
  return useMemo(() => {
    const r = resumenSistema(universidadesArray)
    const conDatos = universidadesArray.filter((u) => u.tieneDatos)
    const k = universidadesArray.filter((u) => u.esKirchnerista)
    const egresoK = METRICAS.cohorte.agregado(conDatos.filter((u) => u.esKirchnerista))
    const egresoResto = METRICAS.cohorte.agregado(conDatos.filter((u) => !u.esKirchnerista))
    const kPorAnio = Object.entries(
      k.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.fundacion]: (acc[u.fundacion] ?? 0) + 1 }), {}),
    ).sort(([a], [b]) => Number(a) - Number(b))
    const maxPorAnio = Math.max(...kPorAnio.map(([, n]) => n))
    const masCaras = conDatos
      .filter((u) => u.costoPorGraduado != null)
      .sort((a, b) => b.costoPorGraduado! - a.costoPorGraduado!)
      .slice(0, 5)
    const reinscriptos = conDatos.filter((u) => METRICAS.ceroMaterias.valor(u) != null && u.reinscriptosRegulares2mas != null)
    const totalReinscriptos = reinscriptos.reduce((a, u) => a + u.reinscriptosTotal!, 0)
    const regulares = reinscriptos.reduce((a, u) => a + u.reinscriptosRegulares2mas!, 0)
    const cero = reinscriptos.reduce((a, u) => a + u.reinscriptos0Materias!, 0)
    const pct = (n: number) => Math.round((n / totalReinscriptos) * 100)
    const uno = getUniversidad('oeste')
    const unoCero =
      uno?.reinscriptos0Materias != null && uno.reinscriptosTotal ? Math.round((uno.reinscriptos0Materias / uno.reinscriptosTotal) * 100) : null
    const d = r.dedicacion
    const lista = propuestas()
    const avanzar = propuestaPrincipal()

    const slides: { id: string; contenido: React.ReactNode }[] = [
      {
        id: 'portada',
        contenido: (
          <div className="text-center flex flex-col items-center">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="UPL" className="w-[clamp(7rem,16vw,14rem)] rounded-2xl shadow-2xl mb-[5vh]" />
            <h1 className="font-display font-800 text-upl-crema leading-[1.02] text-[clamp(2.4rem,6vw,5.6rem)] max-w-[18ch]">
              La universidad que pagamos todos y no rinde cuentas
            </h1>
            <div className="h-1.5 w-24 rounded-full bg-upl-amarillo my-[4vh]" />
            <p className="text-upl-crema/70 text-[clamp(1rem,1.8vw,1.6rem)]">
              Auditorías Universitarias · Universitarios por la Libertad
            </p>
          </div>
        ),
      },
      {
        id: 'gancho',
        contenido: (
          <div className="text-center">
            <Eyebrow>Cohorte 2018 → 2024</Eyebrow>
            <div className="flex items-end justify-center gap-[1vw]">
              <span className="font-display font-800 leading-none text-[#ff8a7a] text-[clamp(7rem,26vw,22rem)]">{r.noSeReciben}</span>
              <span className="font-display font-800 leading-none text-upl-crema/40 text-[clamp(3rem,9vw,8rem)] mb-[4vh]">/100</span>
            </div>
            <p className="text-upl-crema text-[clamp(1.2rem,2.6vw,2.4rem)] max-w-[32ch] mx-auto leading-snug">
              De cada 100 que entraron a una universidad nacional en 2018, {r.noSeReciben} no se habían recibido en 2024.
            </p>
            <Fuente>
              Anuarios de Estadísticas Universitarias (SPU) · {formatPorcentaje(r.cohorte)} de egreso ponderado, {r.universidades}{' '}
              universidades
            </Fuente>
          </div>
        ),
      },
      {
        id: 'quienes-somos',
        contenido: (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-[4vw]">
            <div>
              <Eyebrow>Auditorías Universitarias</Eyebrow>
              <Titulo>{r.universidades} universidades nacionales. Datos oficiales, uno al lado del otro.</Titulo>
              <ul className="mt-[4vh] space-y-[1.6vh] text-[clamp(1rem,1.9vw,1.7rem)] text-upl-crema/80">
                <li>
                  <span className="text-upl-amarillo font-display font-800">{formatNumero(r.estudiantes)}</span> estudiantes
                </li>
                <li>
                  <span className="text-upl-amarillo font-display font-800">{formatNumero(r.egresados2024)}</span> egresados en
                  2024
                </li>
                <li>
                  Fuente: lo que las propias universidades le informan a la{' '}
                  <span className="text-upl-crema font-semibold">Secretaría de Políticas Universitarias</span>
                </li>
              </ul>
            </div>
            <div className="hidden md:block">
              <MapaSedes />
            </div>
          </div>
        ),
      },
      {
        id: 'entra-no-sale',
        contenido: (
          <div>
            <Eyebrow>El sistema entra, pero no sale</Eyebrow>
            <Titulo>
              Ingresantes <span className="text-[#8fb7ff]">+{r.variacionIngresantes?.pct}%</span> · Egresados{' '}
              <span className="text-upl-resaltador">+{r.variacionEgresados?.pct}%</span>
            </Titulo>
            <div className="mt-[4vh] grid grid-cols-1 md:grid-cols-2 gap-[3vw]">
              <div className="glass rounded-2xl px-6 py-5">
                <div className="text-sm uppercase tracking-wide text-upl-resaltador font-semibold mb-2">Ingresantes nuevos</div>
                <EvolutionChart data={r.ingresantes} color="#8fb7ff" formatValue={(v) => formatNumero(v)} />
              </div>
              <div className="glass rounded-2xl px-6 py-5">
                <div className="text-sm uppercase tracking-wide text-upl-resaltador font-semibold mb-2">Egresados</div>
                <EvolutionChart data={r.egresados} color="#e4b862" formatValue={(v) => formatNumero(v)} />
              </div>
            </div>
            <Fuente>
              {r.variacionIngresantes?.desde}–{r.variacionIngresantes?.hasta}, suma de las universidades relevadas · SPU
            </Fuente>
          </div>
        ),
      },
      {
        id: 'cero-materias',
        contenido: (
          <div>
            <Eyebrow>Inscriptos, pero no cursando</Eyebrow>
            <Grande alerta>{formatNumero(r.ceroMateriasN)}</Grande>
            <p className="mt-[2vh] text-upl-crema text-[clamp(1.2rem,2.6vw,2.4rem)] max-w-[34ch] leading-snug">
              estudiantes que se reinscribieron no aprobaron <span className="text-[#ff8a7a] font-semibold">ninguna</span>{' '}
              materia en todo el año: {formatPorcentaje(r.ceroMateriasPct)} de los reinscriptos.
            </p>
            <div className="mt-[5vh] flex h-[4vh] rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct(regulares)}%` }} transition={{ duration: 0.7 }} className="bg-[#8fd19e]" />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - pct(regulares) - pct(cero)}%` }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="bg-upl-resaltador"
              />
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct(cero)}%` }} transition={{ duration: 0.7, delay: 0.2 }} className="bg-[#e2574c]" />
            </div>
            <div className="mt-[1.5vh] flex flex-wrap gap-x-8 gap-y-1 text-[clamp(0.9rem,1.5vw,1.3rem)] text-upl-crema/80">
              <span>● Regulares (2+ materias): {pct(regulares)}%</span>
              <span>● 1 materia: {100 - pct(regulares) - pct(cero)}%</span>
              <span className="text-[#ff8a7a]">● 0 materias: {pct(cero)}%</span>
            </div>
            <Fuente>Reinscriptos del último año informado · Anuarios SPU</Fuente>
          </div>
        ),
      },
      {
        id: 'internacional',
        contenido: (
          <div>
            <Eyebrow>¿Es normal?</Eyebrow>
            <Titulo>Graduados cada 100 ingresantes</Titulo>
            <div className="mt-[6vh] space-y-[3vh]">
              {COMPARACION_INTERNACIONAL.map((c) => (
                <Barra key={c.pais} label={c.pais} valor={c.valor} max={80} texto={`${c.valor}`} destacada={c.pais === 'Argentina'} />
              ))}
            </div>
            <Fuente>Centro de Estudios de la Educación Argentina (CEA), Universidad de Belgrano · cohorte 2019→2023</Fuente>
          </div>
        ),
      },
      {
        id: 'costo',
        contenido: (
          <div>
            <Eyebrow>Cuánto cuesta cada título</Eyebrow>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <Grande>{formatMoneda(r.costoPorGraduado)}</Grande>
              <p className="text-upl-crema/80 text-[clamp(1rem,2vw,1.8rem)] mb-[1vh] max-w-[22ch]">
                por graduado, promedio del sistema ({unidadMonetaria()})
              </p>
            </div>
            <div className="mt-[5vh] space-y-[2.2vh]">
              {masCaras.map((u, i) => (
                <Barra
                  key={u.id}
                  label={u.sigla}
                  valor={u.costoPorGraduado!}
                  max={masCaras[0].costoPorGraduado!}
                  texto={`${formatMoneda(u.costoPorGraduado)} · ${formatNumero(u.egresados2024)} egresados`}
                  destacada={i === 0}
                />
              ))}
            </div>
            <Fuente>Presupuesto ejecutado 2024 / egresados 2024, deflactado por IPC · Anuarios SPU</Fuente>
          </div>
        ),
      },
      ...(d
        ? [
            {
              id: 'docentes',
              contenido: (
                <div>
                  <Eyebrow>¿Y a dónde va la plata?</Eyebrow>
                  <Titulo>Más cargos, no más horas de clase</Titulo>
                  <div className="mt-[5vh] grid grid-cols-1 md:grid-cols-2 gap-[3vw]">
                    <div>
                      <Grande>+{d.varCargosPct}%</Grande>
                      <p className="mt-2 text-upl-crema/80 text-[clamp(1rem,1.9vw,1.7rem)]">cargos docentes (2017→2023)</p>
                    </div>
                    <div>
                      <Grande>+{d.varFtePct}%</Grande>
                      <p className="mt-2 text-upl-crema/80 text-[clamp(1rem,1.9vw,1.7rem)]">horas reales (equivalente a tiempo completo)</p>
                    </div>
                  </div>
                  <p className="mt-[5vh] text-upl-crema text-[clamp(1.1rem,2.2vw,2rem)]">
                    <span className="text-[#ff8a7a] font-display font-800">+{formatNumero(d.simple2023 - d.simple2017)}</span> cargos
                    simples contra apenas{' '}
                    <span className="text-upl-amarillo font-display font-800">+{formatNumero(d.excl2023 - d.excl2017)}</span> de
                    dedicación exclusiva.
                  </p>
                  <Fuente>{d.universidades} universidades con datos de dedicación · RHUN / Anuarios SPU</Fuente>
                </div>
              ),
            },
          ]
        : []),
      {
        id: 'k',
        contenido: (
          <div>
            <Eyebrow>Universidades creadas por el kirchnerismo</Eyebrow>
            <Titulo>
              {k.length} universidades por ley. Reciben al <span className="text-[#ff8a7a]">{formatPorcentaje(egresoK)}</span> de sus
              ingresantes; el resto, al {formatPorcentaje(egresoResto)}.
            </Titulo>
            <div className="mt-[5vh] flex items-end gap-[2vw] h-[28vh]">
              {kPorAnio.map(([anio, n]) => (
                <div key={anio} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="font-display font-800 text-upl-crema text-[clamp(1rem,2vw,1.8rem)]">{n}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(n / maxPorAnio) * 80}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className={`w-full rounded-t-lg ${anio === '2023' ? 'bg-[#e2574c]' : 'bg-upl-resaltador/70'}`}
                  />
                  <span className="mt-2 text-upl-crema/70 text-[clamp(0.8rem,1.4vw,1.2rem)]">{anio}</span>
                </div>
              ))}
            </div>
            <Fuente>
              En rojo: las 5 sancionadas el mismo día, 28/9/2023, a 2 meses y medio del fin del mandato de Alberto Fernández · Egreso
              ponderado por tamaño
            </Fuente>
          </div>
        ),
      },
      ...(uno
        ? [
            {
              id: 'uno',
              contenido: (
                <div>
                  <Eyebrow>Un caso · Merlo</Eyebrow>
                  <Titulo>{uno.nombre}</Titulo>
                  <p className="mt-[1.5vh] text-upl-crema/70 text-[clamp(1rem,1.8vw,1.6rem)]">
                    Su rector desde 2013 fue Martín Othacehé, hijo del entonces intendente de Merlo.
                  </p>
                  <div className="mt-[5vh] grid grid-cols-2 md:grid-cols-4 gap-[2vw]">
                    {[
                      { v: formatNumero(uno.estudiantes2024), l: 'estudiantes' },
                      { v: formatNumero(uno.egresados2024), l: 'egresados en 2024', alerta: true },
                      { v: formatPorcentaje(uno.tasaCohorte), l: 'se recibe a tiempo', alerta: true },
                      { v: unoCero != null ? `${unoCero}%` : 'S/D', l: 'de los reinscriptos, sin materias', alerta: true },
                    ].map((x) => (
                      <div key={x.l} className="glass rounded-2xl px-5 py-5">
                        <div className={`font-display font-800 leading-none text-[clamp(2rem,5vw,4.4rem)] ${x.alerta ? 'text-[#ff8a7a]' : 'text-upl-crema'}`}>
                          {x.v}
                        </div>
                        <div className="mt-2 text-upl-crema/70 text-[clamp(0.9rem,1.4vw,1.25rem)]">{x.l}</div>
                      </div>
                    ))}
                  </div>
                  <Fuente>Anuarios SPU 2024 · La Nación, Página/12 (ver ficha en la página)</Fuente>
                </div>
              ),
            },
          ]
        : []),
      {
        id: 'undelta',
        contenido: (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] items-center gap-[4vw]">
            <div>
              <Eyebrow>Otro caso · San Fernando</Eyebrow>
              <Titulo>Universidad Nacional del Delta</Titulo>
              <p className="mt-[3vh] text-upl-crema text-[clamp(1.1rem,2.2vw,2rem)] leading-snug">
                Creada por ley en 2023. Todavía no informa ni un estudiante al Anuario de la SPU.
              </p>
              <p className="mt-[2vh] text-[#ff8a7a] font-display font-800 text-[clamp(1.3rem,2.8vw,2.6rem)] leading-tight">
                Lo que sí tiene: una placa en reconocimiento a Malena Galmarini.
              </p>
              <Fuente>Foto tomada por UPL en la sede de San Fernando · placa fechada el 4/8/2025</Fuente>
            </div>
            <img
              src={`${import.meta.env.BASE_URL}fuentes/undelta-placa-galmarini.webp`}
              alt="Placa de la UNDelta en reconocimiento a Malena Galmarini y Alicia Aparicio"
              className="w-full max-h-[62vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        ),
      },
      {
        id: 'auditorias',
        contenido: (
          <div>
            <Eyebrow>Auditorías</Eyebrow>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[3vw]">
              <div>
                <Grande alerta>1</Grande>
                <p className="mt-2 text-upl-crema text-[clamp(1.1rem,2.2vw,2rem)] leading-snug">
                  facultad de la UBA auditada por la AGN en 10 años (Psicología, ejercicio 2017)
                </p>
              </div>
              <div>
                <Grande alerta>2013</Grande>
                <p className="mt-2 text-upl-crema text-[clamp(1.1rem,2.2vw,2rem)] leading-snug">
                  última vez que la SIGEN revisó los fondos de la UBA
                </p>
              </div>
            </div>
            <p className="mt-[6vh] font-display font-800 text-upl-amarillo text-[clamp(1.5rem,3.4vw,3.2rem)] leading-tight max-w-[30ch]">
              No estamos en contra de financiar la universidad. Estamos en contra de financiarla a ciegas.
            </p>
            <Fuente>La Nación (24/04/2024) · El Litoral · Chequeado</Fuente>
          </div>
        ),
      },
      {
        id: 'propuestas',
        contenido: (
          <div>
            <Eyebrow>Qué proponemos</Eyebrow>
            <ol className="space-y-[2.2vh]">
              {lista.map((p, i) => (
                <Fragment key={p.titulo}>
                  {i === POSICION_PRINCIPAL && (
                    <motion.li
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="rounded-2xl border-2 border-upl-amarillo/70 bg-upl-amarillo/[0.12] px-[2vw] py-[1.6vh]"
                    >
                      <span className="font-display font-800 text-upl-amarillo text-[clamp(1.4rem,3.2vw,3rem)] leading-tight">
                        ★ {avanzar.nombre}
                      </span>
                      <span className="block text-upl-crema/80 text-[clamp(0.95rem,1.7vw,1.6rem)] leading-snug">{avanzar.bajada}</span>
                    </motion.li>
                  )}
                  <motion.li
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="flex items-baseline gap-[2vw]"
                  >
                    <span className="font-display font-800 text-upl-amarillo text-[clamp(2rem,4.4vw,4rem)] leading-none w-[1.2em] shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-display font-700 text-upl-crema text-[clamp(1.3rem,3vw,2.8rem)] leading-tight">{p.titulo}</span>
                  </motion.li>
                </Fragment>
              ))}
            </ol>
          </div>
        ),
      },
      {
        id: 'avanzar',
        contenido: (
          <div>
            <Eyebrow>La propuesta central</Eyebrow>
            <h2 className="font-display font-800 text-upl-amarillo leading-none text-[clamp(3rem,8vw,7rem)]">{avanzar.nombre}</h2>
            <p className="mt-[2vh] font-display font-700 text-upl-crema text-[clamp(1.3rem,3vw,2.8rem)] leading-tight max-w-[30ch]">
              {avanzar.bajada}
            </p>
            <div className="mt-[4vh] grid grid-cols-2 md:grid-cols-4 gap-[1.5vw]">
              {avanzar.ejes.map((e) => (
                <div key={e.titulo} className="rounded-2xl border border-upl-crema/15 bg-upl-principal-light/40 px-[1.4vw] py-[1.6vh]">
                  <div className="font-display font-800 text-upl-amarillo text-[clamp(1.1rem,2vw,1.9rem)]">{e.titulo}</div>
                  <div className="text-upl-crema/70 text-[clamp(0.8rem,1.15vw,1.1rem)] leading-snug mt-1">{e.texto}</div>
                </div>
              ))}
            </div>
            <Fuente>{avanzar.dato} Anuario SPU 2024, cuadro 2.1.13.</Fuente>
          </div>
        ),
      },
      {
        id: 'cierre',
        contenido: (
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-[5vw]">
            <QrCode value={SITIO_URL} className="w-[clamp(12rem,30vw,26rem)] h-auto rounded-3xl shadow-2xl mx-auto" />
            <div>
              <Titulo>Buscá tu universidad. Mirá los números.</Titulo>
              <p className="mt-[3vh] text-upl-amarillo font-display font-700 text-[clamp(1.1rem,2.4vw,2.2rem)] break-all">
                {SITIO_URL_CORTA}
              </p>
              <div className="mt-[5vh] flex items-center gap-4">
                <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="" className="w-[clamp(3.5rem,6vw,5.5rem)] rounded-xl" />
                <div>
                  <div className="font-display font-800 text-upl-crema text-[clamp(1.1rem,2.2vw,2rem)]">Universitarios por la Libertad</div>
                  <div className="text-upl-crema/60 text-[clamp(0.9rem,1.6vw,1.4rem)]">@upl_arg</div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ]
    return slides
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneda, tc.venta])
}

export function Presentacion() {
  const slides = useDiapositivas()
  const [params, setParams] = useSearchParams()
  const total = slides.length
  const actual = Math.min(Math.max(Number(params.get('s') ?? 1) || 1, 1), total) - 1

  const ir = useCallback(
    (i: number) => {
      const destino = Math.min(Math.max(i, 0), total - 1)
      setParams({ s: String(destino + 1) }, { replace: true })
    },
    [setParams, total],
  )

  const pantallaCompleta = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        ir(actual + 1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        ir(actual - 1)
      } else if (e.key === 'Home') ir(0)
      else if (e.key === 'End') ir(total - 1)
      else if (e.key === 'f' || e.key === 'F') pantallaCompleta()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [actual, ir, total, pantallaCompleta])

  return (
    <div className="fixed inset-0 overflow-hidden select-none">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob w-[40rem] h-[40rem] bg-upl-secundario/50 -top-40 -right-40" />
        <div className="blob w-[30rem] h-[30rem] bg-upl-resaltador/15 -bottom-20 -left-20" style={{ animationDelay: '6s' }} />
      </div>

      {/* Zonas de clic: tercio izquierdo retrocede, el resto avanza. */}
      <button aria-label="Diapositiva anterior" className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-w-resize" onClick={() => ir(actual - 1)} />
      <button aria-label="Diapositiva siguiente" className="absolute inset-y-0 right-0 w-2/3 z-10 cursor-e-resize" onClick={() => ir(actual + 1)} />

      <AnimatePresence mode="wait">
        <motion.section
          key={slides[actual].id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center px-[6vw] py-[8vh]"
        >
          <div className="w-full max-w-[1400px]">{slides[actual].contenido}</div>
        </motion.section>
      </AnimatePresence>

      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 py-3 opacity-40 hover:opacity-100 transition-opacity">
        <Link to="/" className="text-xs text-upl-crema/80 hover:text-upl-amarillo">
          ← Volver a la página
        </Link>
        <button onClick={pantallaCompleta} className="text-xs text-upl-crema/80 hover:text-upl-amarillo">
          Pantalla completa (F)
        </button>
      </div>

      <div className="absolute bottom-0 inset-x-0 z-20">
        <div className="flex items-center justify-between px-5 pb-2 text-[11px] text-upl-crema/40">
          <span>
            <span className="sm:hidden">Tocá para avanzar</span>
            <span className="hidden sm:inline">← → para navegar</span>
          </span>
          <span>
            {actual + 1} / {total}
          </span>
        </div>
        <div className="h-1 bg-upl-crema/10">
          <motion.div className="h-full bg-upl-amarillo" animate={{ width: `${((actual + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>
    </div>
  )
}
