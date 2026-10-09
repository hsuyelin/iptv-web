interface SparklineProps {
  /** Values, oldest first. */
  values: readonly number[]
  /** Accessible description of what the chart shows. */
  label: string
}

const WIDTH = 300
const HEIGHT = 80
const PAD = 4

/** A small filled line chart that scales to its box. */
export function Sparkline({ values, label }: SparklineProps) {
  const peak = Math.max(1, ...values)
  const step = values.length > 1 ? (WIDTH - 2 * PAD) / (values.length - 1) : 0
  const points = values.map((value, index) => {
    const x = PAD + index * step
    const y = HEIGHT - PAD - (value / peak) * (HEIGHT - 2 * PAD)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = points.join(' ')
  const first = points[0]?.split(',')[0] ?? String(PAD)
  const last = points[points.length - 1]?.split(',')[0] ?? String(PAD)
  const area = `${first},${HEIGHT - PAD} ${line} ${last},${HEIGHT - PAD}`
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polygon points={area} fill="var(--accent)" fillOpacity="0.22" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--accent-text)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
