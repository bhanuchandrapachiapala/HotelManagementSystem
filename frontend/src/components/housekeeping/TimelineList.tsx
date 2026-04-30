import type { HousekeepingTimelineEntry } from '../../types'
import EmptyState from '../ui/EmptyState'

interface TimelineListProps {
  entries: HousekeepingTimelineEntry[]
}

export default function TimelineList({ entries }: TimelineListProps) {
  if (entries.length === 0) {
    return <EmptyState icon="🕐" message="No completions yet today" />
  }

  return (
    <div className="divide-y divide-gray-100">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <span className="text-xs font-semibold text-orange w-16 flex-shrink-0">
            {entry.time_display}
          </span>
          <div className="w-10 h-10 rounded-[8px] bg-green-light flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-green">{entry.room_number}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-brand-black">{entry.housekeeper_name}</p>
            <p className="text-xs text-gray-400">Floor {entry.floor}</p>
          </div>
          <span className="text-xs text-green font-semibold">✓ Done</span>
        </div>
      ))}
    </div>
  )
}
