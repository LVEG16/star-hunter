interface AvatarProps {
  index: number
  nickname: string
  size?: number
  className?: string
}

const AVATAR_COLORS = [
  '#00FFD1', // 0 cyan
  '#FF00AA', // 1 magenta
  '#9D00FF', // 2 purple
  '#FFD700', // 3 gold
  '#00FF88', // 4 green
  '#FF4D4D', // 5 red
]

function ShapeLayer({ index, color, size }: { index: number; color: string; size: number }) {
  const c = size / 2
  const stroke = { stroke: color, strokeWidth: 2, fill: 'none' } as const
  switch (index) {
    case 0: {
      // Triangle
      const r = size * 0.28
      const pts = `${c},${c - r} ${c - r * Math.sin((2 * Math.PI) / 3)},${c - r * Math.cos((2 * Math.PI) / 3)} ${c + r * Math.sin((2 * Math.PI) / 3)},${c - r * Math.cos((2 * Math.PI) / 3)}`
      return <polygon points={pts} {...stroke} />
    }
    case 1: {
      // Square
      const s = size * 0.4
      return <rect x={c - s / 2} y={c - s / 2} width={s} height={s} {...stroke} />
    }
    case 2: {
      // Diamond
      const r = size * 0.3
      return <polygon points={`${c},${c - r} ${c + r},${c} ${c},${c + r} ${c - r},${c}`} {...stroke} />
    }
    case 3: {
      // Star (5-point)
      const r = size * 0.3
      const inner = r * 0.4
      const pts: string[] = []
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r : inner
        const angle = (Math.PI * i) / 5 - Math.PI / 2
        pts.push(`${c + Math.cos(angle) * rad},${c + Math.sin(angle) * rad}`)
      }
      return <polygon points={pts.join(' ')} {...stroke} />
    }
    case 4: {
      // Hexagon
      const r = size * 0.3
      const pts: string[] = []
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 6
        pts.push(`${c + Math.cos(angle) * r},${c + Math.sin(angle) * r}`)
      }
      return <polygon points={pts.join(' ')} {...stroke} />
    }
    case 5: {
      // Cross
      const len = size * 0.3
      return (
        <>
          <line x1={c - len} y1={c} x2={c + len} y2={c} {...stroke} />
          <line x1={c} y1={c - len} x2={c} y2={c + len} {...stroke} />
        </>
      )
    }
    default:
      return null
  }
}

export default function Avatar({ index, nickname, size = 48, className = '' }: AvatarProps) {
  const safeIndex = Math.max(0, Math.min(5, index))
  const color = AVATAR_COLORS[safeIndex]
  const letter = (nickname || '?').charAt(0).toUpperCase() || '?'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ filter: `drop-shadow(0 0 ${size * 0.12}px ${color})` }}
    >
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 1} fill={`${color}22`} stroke={color} strokeWidth={2} />
      <ShapeLayer index={safeIndex} color={color} size={size} />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Orbitron, sans-serif"
        fontWeight="bold"
        fontSize={size * 0.34}
        fill="#ffffff"
      >
        {letter}
      </text>
    </svg>
  )
}
