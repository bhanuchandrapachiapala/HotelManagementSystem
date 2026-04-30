import { cn } from '../../lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  color?: string
  className?: string
}

export default function ProgressBar({ value, max = 100, color = '#F47920', className }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('h-2 bg-gray-100 rounded-full overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  )
}
