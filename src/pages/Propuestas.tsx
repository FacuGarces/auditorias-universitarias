import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { propuestas } from '../lib/propuestas'

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
} as const

export function Propuestas() {
  const lista = propuestas()

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
          No estamos en contra de financiar la universidad pública: estamos en contra de financiarla a ciegas. Cinco
          propuestas de Universitarios por la Libertad, cada una con el dato que la justifica.
        </motion.p>

        <motion.ol
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl overflow-hidden flex flex-col gap-px border border-upl-crema/12 bg-upl-crema/15 [backdrop-filter:blur(18px)] shadow-[0_8px_30px_rgba(10,8,30,0.35)]"
        >
          {lista.map((p, i) => (
            <motion.li key={p.titulo} variants={itemVariants} className="flex gap-4 sm:gap-5 px-5 py-5 bg-upl-principal-light/40">
              <span className="font-display font-800 text-4xl sm:text-5xl text-upl-amarillo leading-none w-9 sm:w-11 shrink-0">
                {i + 1}
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
      </div>
    </div>
  )
}
