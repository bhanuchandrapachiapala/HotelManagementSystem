import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { RoomInspectionStatus } from '../../types'

interface RoomStatusGridProps {
  rooms: Record<string, RoomInspectionStatus>
  onSelectRoom: (roomNumber: string) => void
  selectedRoom?: string | null
}

const ALL_FLOORS = [1, 2, 3, 4]

const statusConfig: Record<
  RoomInspectionStatus['status'],
  { className: string; label: string }
> = {
  never_inspected: { className: 'bg-gray-100 text-gray-400 border border-gray-200', label: 'Never Inspected' },
  clear: { className: 'bg-green-100 text-green-700 border border-green-200', label: 'Clear' },
  minor_issues: { className: 'bg-blue-100 text-blue-700 border border-blue-200', label: 'Minor Issues' },
  standard_issues: { className: 'bg-yellow-100 text-yellow-700 border border-yellow-200', label: 'Standard Issues' },
  urgent: { className: 'bg-red-100 text-red-700 border border-red-200', label: 'Urgent' },
}

function buildFloorRooms(floor: number): string[] {
  return Array.from({ length: 34 }, (_, i) => `${floor}${String(i + 1).padStart(2, '0')}`)
}

export default function RoomStatusGrid({ rooms, onSelectRoom, selectedRoom }: RoomStatusGridProps) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {ALL_FLOORS.map((f) => {
        const floorRooms = buildFloorRooms(f)
        return (
          <div key={f}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              Floor {f}
            </h4>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))' }}>
              {floorRooms.map((rn) => {
                const room = rooms[rn]
                const status = room?.status ?? 'never_inspected'
                const cfg = statusConfig[status]
                const isHovered = hoveredRoom === rn
                const isSelected = selectedRoom === rn

                return (
                  <div key={rn} className="relative">
                    <button
                      type="button"
                      onClick={() => onSelectRoom(rn)}
                      onMouseEnter={() => setHoveredRoom(rn)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      className={cn(
                        'h-[56px] w-full rounded-[10px] flex flex-col items-center justify-center text-[11px] font-bold transition-all',
                        cfg.className,
                        isSelected && 'ring-2 ring-orange ring-offset-1'
                      )}
                    >
                      <span>{rn}</span>
                      {room?.open_issues ? (
                        <span className="text-[9px] font-semibold leading-none mt-0.5">
                          {room.open_issues} open
                        </span>
                      ) : null}
                    </button>

                    {isHovered && room && (
                      <div className="absolute z-30 left-1/2 -translate-x-1/2 top-full mt-2 w-[200px] bg-brand-black text-white text-xs rounded-[8px] p-3 shadow-lg pointer-events-none">
                        <div className="font-bold mb-1">Room {rn}</div>
                        <div>
                          {room.last_inspection_date
                            ? `Last inspected ${room.last_inspection_date}`
                            : 'Never inspected'}
                        </div>
                        <div>{room.open_issues} open issue{room.open_issues === 1 ? '' : 's'}</div>
                        {room.urgent_issues > 0 && (
                          <div className="text-red-300 font-semibold mt-0.5">
                            {room.urgent_issues} urgent
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface RoomDetailPanelProps {
  roomNumber: string
  room?: RoomInspectionStatus
  onClose: () => void
  children?: React.ReactNode
}

export function RoomDetailPanel({ roomNumber, room, onClose, children }: RoomDetailPanelProps) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-[480px] bg-white h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <h2 className="font-display text-2xl font-bold text-brand-black flex-1">
            Room {roomNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {room?.last_inspection_date ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Last Inspection
              </p>
              <p className="text-sm">{room.last_inspection_date} · {room.last_inspection_type ?? 'routine'}</p>
              {room.overall_condition && (
                <p className="text-sm capitalize">Overall condition: <span className="font-semibold">{room.overall_condition}</span></p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No inspection records yet.</p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

export { statusConfig as roomStatusConfig }
