import { format, parseISO } from 'date-fns'
import type { RoomAssignment } from '../../types'

const ALL_FLOORS = [1, 2, 3, 4]

function buildFloorRooms(floor: number): string[] {
  return Array.from({ length: 34 }, (_, i) => `${floor}${String(i + 1).padStart(2, '0')}`)
}

interface RoomStatusMapProps {
  assignments: RoomAssignment[]
}

const statusColor: Record<string, string> = {
  pending:     'bg-blue-light border-blue/30 text-blue',
  in_progress: 'bg-orange-light border-orange text-orange-dark',
  done:        'bg-green-light border-green/40 text-green',
}

export default function RoomStatusMap({ assignments }: RoomStatusMapProps) {
  const assignmentMap = new Map(assignments.map((a) => [a.room_number, a]))

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-gray-200 bg-white inline-block" />
          Unassigned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-blue/30 bg-blue-light inline-block" />
          Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-orange bg-orange-light inline-block" />
          In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm border border-green/40 bg-green-light inline-block" />
          Done
        </span>
      </div>

      {ALL_FLOORS.map((f) => (
        <div key={f}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Floor {f}</p>
          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))' }}>
            {buildFloorRooms(f).map((rn) => {
              const a = assignmentMap.get(rn)
              const tileClass = a ? (statusColor[a.status] ?? 'bg-white border-gray-200') : 'bg-white border-gray-200 text-gray-300'

              let tooltipText = `Room ${rn} — Unassigned`
              if (a) {
                tooltipText = `Room ${rn} — ${a.housekeeper_name ?? 'Unknown'}`
                if (a.status === 'done' && a.completed_at) {
                  tooltipText += ` — Done at ${format(parseISO(a.completed_at), 'h:mm a')}`
                } else {
                  tooltipText += ` — ${a.status.replace('_', ' ')}`
                }
              }

              return (
                <div
                  key={rn}
                  title={tooltipText}
                  className={`h-[44px] rounded-[6px] border flex items-center justify-center text-[10px] font-bold cursor-default transition-colors ${tileClass}`}
                >
                  {rn.slice(1)}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
