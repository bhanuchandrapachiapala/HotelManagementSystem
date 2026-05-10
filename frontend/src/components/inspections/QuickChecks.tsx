import { cn } from '../../lib/utils'

const QUICK_CHECK_ITEMS: Array<{ id: string; label: string }> = [
  { id: 'bed_made', label: 'Bed made properly' },
  { id: 'bathroom_clean', label: 'Bathroom clean' },
  { id: 'floor_vacuumed', label: 'Floor vacuumed/mopped' },
  { id: 'windows_clean', label: 'Windows clean' },
  { id: 'ac_working', label: 'AC/Heat working' },
  { id: 'tv_working', label: 'TV working' },
  { id: 'safe_working', label: 'Safe working' },
  { id: 'fridge_working', label: 'Mini fridge working' },
  { id: 'towels_stocked', label: 'Towels stocked' },
  { id: 'toiletries_stocked', label: 'Toiletries stocked' },
  { id: 'door_lock_working', label: 'Door lock working' },
  { id: 'lights_working', label: 'All lights working' },
]

interface QuickChecksProps {
  values: Record<string, boolean>
  onChange: (next: Record<string, boolean>) => void
}

export default function QuickChecks({ values, onChange }: QuickChecksProps) {
  function toggle(id: string) {
    const current = values[id] !== undefined ? values[id] : true
    onChange({ ...values, [id]: !current })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {QUICK_CHECK_ITEMS.map((item) => {
        const value = values[item.id] !== undefined ? values[item.id] : true
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-[12px] border-2 text-left transition-all min-h-[48px]',
              value
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            )}
          >
            <div
              role="switch"
              aria-checked={value}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
                value ? 'bg-green' : 'bg-red'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                  value ? 'translate-x-[22px]' : 'translate-x-0.5'
                )}
              />
            </div>
            <span className={cn(
              'flex-1 text-sm font-semibold',
              value ? 'text-green-800' : 'text-red-800'
            )}>
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { QUICK_CHECK_ITEMS }
