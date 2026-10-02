import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

interface Props {
  value: string
  className?: string
  /** Color de los módulos; el fondo siempre es crema para que cualquier cámara lo lea. */
  color?: string
}

/** QR como SVG vectorial: se escala sin perder nitidez (para proyectarlo en pantalla grande). */
export function QrCode({ value, className, color = '#242c50' }: Props) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + 2},${r + 2}h1v1h-1z`
      }
    }
    return { size: n + 4, path: d }
  }, [value])

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} shapeRendering="crispEdges" role="img" aria-label={`Código QR: ${value}`}>
      <rect width={size} height={size} fill="#fffff9" />
      <path d={path} fill={color} />
    </svg>
  )
}
