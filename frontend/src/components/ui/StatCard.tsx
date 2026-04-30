import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: string
  accentColor: 'orange' | 'yellow' | 'green' | 'red'
  loading?: boolean
}

const borderColors = {
  orange: 'border-t-orange',
  yellow: 'border-t-yellow-hotel',
  green:  'border-t-green',
  red:    'border-t-red',
}

export default function StatCard({ label, value, subtext, icon, accentColor, loading }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-card shadow-sm border-t-[3px] p-6 hover:-translate-y-0.5 transition-transform',
        borderColors[accentColor]
      )}
    >
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-8 bg-gray-200 rounded w-1/3" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            {icon && <span className="text-[28px]">{icon}</span>}
            <span className="text-[11px] uppercase tracking-widest text-gray-400 font-body font-semibold">
              {label}
            </span>
          </div>
          <div className="text-[36px] font-bold text-brand-black leading-none">{value}</div>
          {subtext && <div className="text-xs text-gray-400 mt-1">{subtext}</div>}
        </>
      )}
    </div>
  )
}
