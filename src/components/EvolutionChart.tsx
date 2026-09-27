interface Punto {
  label: string
  value: number
}

interface Props {
  data: Punto[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  suffix?: string
}

export function EvolutionChart({ data, color = '#facf3b', height = 120, formatValue }: Props) {
  const puntos = data.filter((d) => Number.isFinite(d.value))
  if (puntos.length < 2) {
    return <div className="text-xs text-upl-crema/50 italic">Datos insuficientes para graficar evolución.</div>
  }

  const width = 480
  const padX = 8
  const padTop = 18
  const padBottom = 22
  const values = puntos.map((p) => p.value)
  const min = Math.min(...values, 0)
  const max = Math.max(...values)
  const range = max - min || 1

  const x = (i: number) => padX + (i / (puntos.length - 1)) * (width - padX * 2)
  const y = (v: number) => padTop + (1 - (v - min) / range) * (height - padTop - padBottom)

  const linePath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(puntos.length - 1).toFixed(1)},${height - padBottom} L${x(0).toFixed(1)},${height - padBottom} Z`

  const last = puntos[puntos.length - 1]
  const first = puntos[0]
  const suba = last.value >= first.value

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {puntos.map((p, i) => (
        <circle key={p.label} cx={x(i)} cy={y(p.value)} r={i === puntos.length - 1 ? 4 : 2.5} fill={color} />
      ))}

      {puntos.map((p, i) => (
        <text
          key={`label-${p.label}`}
          x={x(i)}
          y={height - 6}
          fontSize={10}
          textAnchor={i === 0 ? 'start' : i === puntos.length - 1 ? 'end' : 'middle'}
          fill="currentColor"
          opacity={0.55}
        >
          {p.label}
        </text>
      ))}

      <text
        x={x(puntos.length - 1)}
        y={y(last.value) - 10}
        fontSize={12}
        fontWeight={700}
        textAnchor="end"
        fill={suba ? '#8fd19e' : '#facf3b'}
      >
        {formatValue ? formatValue(last.value) : last.value}
      </text>
    </svg>
  )
}
