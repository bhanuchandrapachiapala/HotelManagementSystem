import { cn } from '../../lib/utils'

interface SeverityBadgeProps {
  severity: 'urgent' | 'standard' | 'minor' | 'note'
  size?: 'sm' | 'md'
}

const severityConfig: Record<SeverityBadgeProps['severity'], { className: string; emoji: string; label: string }> = {
  urgent:   { className: 'bg-red-100 text-red-700 border border-red-200',     emoji: '🔴', label: 'Urgent' },
  standard: { className: 'bg-yellow-100 text-yellow-700 border border-yellow-200', emoji: '🟡', label: 'Standard' },
  minor:    { className: 'bg-blue-100 text-blue-700 border border-blue-200',  emoji: '🔵', label: 'Minor' },
  note:     { className: 'bg-gray-100 text-gray-600 border border-gray-200',  emoji: '📝', label: 'Note' },
}

export default function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const cfg = severityConfig[severity]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold rounded-full', padding, cfg.className)}>
      <span>{cfg.emoji}</span>
      <span>{cfg.label}</span>
    </span>
  )
}
