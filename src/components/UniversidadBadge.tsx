interface Props {
  sigla: string
  size?: 'sm' | 'md' | 'lg'
}

// Alto fijo, ancho MÍNIMO (no fijo): así una sigla larga como "UNLPam" o "UNSAdA" ensancha el
// badge en vez de desbordar la caja. Tamaños más grandes en general, pedidos como "estándar".
const SIZES = {
  sm: 'h-10 min-w-10 text-xs px-1.5',
  md: 'h-14 min-w-14 text-sm px-2',
  lg: 'h-20 min-w-20 text-lg px-2.5',
}

export function UniversidadBadge({ sigla, size = 'md' }: Props) {
  return (
    <div
      className={`inline-flex ${SIZES[size]} shrink-0 items-center justify-center rounded-xl bg-upl-principal text-upl-amarillo font-display font-700 border border-upl-resaltador/40 leading-none text-center whitespace-nowrap`}
      title={sigla}
    >
      {sigla}
    </div>
  )
}
