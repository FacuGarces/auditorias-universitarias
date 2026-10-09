import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { useMeta } from '../lib/meta'
import { RUTAS } from '../lib/rutas'
import { POSICION_PRINCIPAL, propuestaPrincipal, propuestas, type Propuesta } from '../lib/propuestas'

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
} as const

function ListaPropuestas({ items, desde }: { items: Propuesta[]; desde: number }) {
  return (
    <motion.ol
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl overflow-hidden flex flex-col gap-px border border-upl-crema/12 bg-upl-crema/15 [backdrop-filter:blur(18px)] shadow-[0_8px_30px_rgba(10,8,30,0.35)]"
    >
      {items.map((p, i) => (
        <motion.li key={p.titulo} variants={itemVariants} className="flex gap-4 sm:gap-5 px-5 py-5 bg-upl-principal-light/40">
          <span className="font-display font-800 text-4xl sm:text-5xl text-upl-amarillo leading-none w-9 sm:w-11 shrink-0">
            {desde + i + 1}
          </span>
          <div className="min-w-0">
            <h2 className="font-display font-700 text-lg sm:text-xl text-upl-crema leading-snug">{p.titulo}</h2>
            <p className="text-sm text-upl-crema/70 mt-1">{p.detalle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#e2574c]/40 bg-[#e2574c]/10 px-3 py-2">
              <span className="text-sm text-upl-crema/90">
                <span className="text-[#ff8a7a] font-semibold">Por qué: </span>
                {p.dato}
              </span>
              {p.link.to ? (
                <Link to={p.link.to} className="text-xs font-semibold text-upl-resaltador underline decoration-dotted">
                  {p.link.label} →
                </Link>
              ) : (
                <a
                  href={p.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-upl-resaltador underline decoration-dotted"
                >
                  Fuente: {p.link.label} ↗
                </a>
              )}
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ol>
  )
}

function AvanzAR() {
  const p = propuestaPrincipal()
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="my-8 rounded-3xl overflow-hidden border-2 border-upl-amarillo/70 bg-gradient-to-br from-upl-amarillo/[0.16] via-upl-principal-light/50 to-upl-principal/60 [backdrop-filter:blur(18px)] shadow-[0_12px_40px_rgba(250,207,59,0.12)]"
    >
      <div className="px-5 sm:px-7 pt-6 pb-5">
        <div className="text-xs uppercase tracking-[0.18em] font-semibold text-upl-amarillo mb-2">La propuesta central</div>
        <h2 className="font-display font-800 text-3xl sm:text-4xl text-upl-crema leading-tight">{p.nombre}</h2>
        <p className="mt-1 font-display font-600 text-lg sm:text-xl text-upl-amarillo leading-snug">{p.bajada}</p>
        <p className="mt-3 text-sm sm:text-base text-upl-crema/75">{p.detalle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-upl-crema/10 border-y border-upl-crema/10">
        {p.ejes.map((e) => (
          <div key={e.titulo} className="bg-upl-principal/55 px-5 sm:px-7 py-4">
            <div className="font-display font-700 text-upl-crema">{e.titulo}</div>
            <p className="mt-0.5 text-sm text-upl-crema/65">{e.texto}</p>
          </div>
        ))}
      </div>
      <div className="px-5 sm:px-7 py-5">
        <div className="text-xs uppercase tracking-wide font-semibold text-upl-resaltador mb-2">Carreras estratégicas</div>
        <ul className="flex flex-wrap gap-1.5">
          {p.carreras.map((c) => (
            <li key={c} className="rounded-full border border-upl-amarillo/40 bg-upl-amarillo/10 px-3 py-1 text-xs font-semibold text-upl-crema">
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-[#e2574c]/40 bg-[#e2574c]/10 px-3 py-2 text-sm text-upl-crema/90">
          <span className="text-[#ff8a7a] font-semibold">Por qué: </span>
          {p.dato}
        </div>
      </div>
    </motion.section>
  )
}

export function Propuestas() {
  const lista = propuestas()
  useMeta({
    titulo: 'Qué proponemos',
    descripcion:
      'Las propuestas de Universitarios por la Libertad para la universidad pública: examen de ingreso, regularidad que exija rendir materias, financiamiento mixto, auditorías externas y las Becas AvanzAR.',
    ruta: RUTAS.propuestas,
  })

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="blob w-[34rem] h-[34rem] bg-upl-resaltador/20 -top-32 -right-32" />
        <div className="blob w-[26rem] h-[26rem] bg-upl-secundario/40 bottom-0 -left-20" style={{ animationDelay: '5s' }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-display font-800 text-3xl text-upl-crema mb-1"
        >
          Qué proponemos
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="text-upl-crema/60 mb-6"
        >
          No estamos en contra de financiar la universidad pública: estamos en contra de financiarla a ciegas. Cuatro
          propuestas de Universitarios por la Libertad y una apuesta central, cada una con el dato que la justifica.
        </motion.p>

        <ListaPropuestas items={lista.slice(0, POSICION_PRINCIPAL)} desde={0} />
        <AvanzAR />
        <ListaPropuestas items={lista.slice(POSICION_PRINCIPAL)} desde={POSICION_PRINCIPAL} />
      </div>
    </div>
  )
}
