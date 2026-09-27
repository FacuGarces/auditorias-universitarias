interface Props {
  sigla: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
}

export function UniversidadBadge({ sigla, size = 'md' }: Props) {
  return (
    <div
      className={`flex ${SIZES[size]} shrink-0 items-center justify-center rounded-xl bg-upl-principal text-upl-amarillo font-display font-700 border border-upl-resaltador/40 leading-none text-center px-1`}
      title={sigla}
    >
      {sigla}
    </div>
  )
}
