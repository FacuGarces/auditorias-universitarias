interface Punto {
  label: string
  value: number
}

interface Props {
  data: Punto[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  /** Si es true, el eje arranca siempre en 0 (recomendado para no exagerar variaciones visualmente). */
  desdeCero?: boolean
}

export function EvolutionChart({ data, color = '#facf3b', height = 150, formatValue, desdeCero = true }: Props) {
  const puntos = data.filter((d) => Number.isFinite(d.value))
  if (puntos.length < 2) {
    return <div className="text-xs text-upl-crema/50 italic">Datos insuficientes para graficar evolución.</div>
  }

  const fmt = formatValue ?? ((v: number) => `${v}`)
  const width = 480
  const padLeft = 50
  const padRight = 10
  const padTop = 18
  const padBottom = 22
  const values = puntos.map((p) => p.value)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const min = desdeCero ? Math.min(0, dataMin) : dataMin
  const max = dataMax === min ? min + 1 : dataMax
  const range = max - min

  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const x = (i: number) => padLeft + (i / (puntos.length - 1)) * plotW
  const y = (v: number) => padTop + (1 - (v - min) / range) * plotH

  const linePath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(puntos.length - 1).toFixed(1)},${padTop + plotH} L${x(0).toFixed(1)},${padTop + plotH} Z`

  const last = puntos[puntos.length - 1]
  const first = puntos[0]
  const suba = last.value >= first.value

  const gridTicks = 4
  const gridValues = Array.from({ length: gridTicks + 1 }, (_, i) => min + (range * i) / gridTicks)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grilla + eje de referencia */}
      {gridValues.map((v) => (
        <g key={v}>
          <line x1={padLeft} x2={width - padRight} y1={y(v)} y2={y(v)} stroke="#fffff9" strokeOpacity={0.1} strokeWidth={1} />
          <text x={padLeft - 6} y={y(v) + 3} fontSize={9} textAnchor="end" fill="currentColor" opacity={0.5}>
            {fmt(Math.round(v))}
          </text>
        </g>
      ))}

      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {puntos.map((p, i) => (
        <circle key={p.label} cx={x(i)} cy={y(p.value)} r={i === puntos.length - 1 ? 4 : 2.5} fill={color} />
      ))}

      {puntos.map((p, i) => {
        const paso = puntos.length > 16 ? 3 : puntos.length > 8 ? 2 : 1
        const esUltimo = i === puntos.length - 1
        const chocaConUltimo = !esUltimo && puntos.length - 1 - i < paso
        if ((i % paso !== 0 && !esUltimo) || chocaConUltimo) return null
        return (
          <text
            key={`label-${p.label}`}
            x={x(i)}
            y={height - 6}
            fontSize={10}
            textAnchor={i === 0 ? 'start' : esUltimo ? 'end' : 'middle'}
            fill="currentColor"
            opacity={0.55}
          >
            {p.label}
          </text>
        )
      })}

      <text
        x={x(puntos.length - 1)}
        y={Math.max(y(last.value) - 10, padTop + 8)}
        fontSize={12}
        fontWeight={700}
        textAnchor="end"
        fill={suba ? '#8fd19e' : '#facf3b'}
      >
        {fmt(last.value)}
      </text>
    </svg>
  )
}
