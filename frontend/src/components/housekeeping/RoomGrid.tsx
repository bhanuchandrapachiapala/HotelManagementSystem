import toast from 'react-hot-toast'
import { cn } from '../../lib/utils'
import type { Housekeeper, RoomAssignment } from '../../types'

const ALL_FLOORS = [1, 2, 3, 4]

function buildFloorRooms(floor: number): string[] {
  return Array.from({ length: 34 }, (_, i) => `${floor}${String(i + 1).padStart(2, '0')}`)
}

interface RoomGridProps {
  floor: number | 'all'
  assignments: RoomAssignment[]
  selectedHousekeeper: Housekeeper | null
  selectedRooms: string[]
  onToggleRoom: (roomNumber: string) => void
  onSelectAll: (floor?: number) => void
  onClearAll: () => void
}

export default function RoomGrid({
  floor,
  assignments,
  selectedHousekeeper,
  selectedRooms,
  onToggleRoom,
  onSelectAll,
  onClearAll,
}: RoomGridProps) {
  const selectedSet = new Set(selectedRooms)
  const assignmentMap = new Map(assignments.map((a) => [a.room_number, a]))
  const floors = floor === 'all' ? ALL_FLOORS : [floor]

  function handleTileClick(rn: string) {
    const existing = assignmentMap.get(rn)
    if (existing && existing.housekeeper_id !== selectedHousekeeper?.id) {
      toast(`Room ${rn} is assigned to ${existing.housekeeper_name ?? 'another housekeeper'}`, {
        icon: 'ℹ️',
        duration: 2500,
      })
      return
    }
    onToggleRoom(rn)
  }

  return (
    <div className="space-y-6">
      {floors.map((f) => {
        const rooms = buildFloorRooms(f)
        return (
          <div key={f}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">Floor {f}</h4>
              <button
                type="button"
                onClick={() => onSelectAll(f)}
                className="text-xs font-semibold text-orange hover:text-orange-dark transition-colors"
              >
                Select all Floor {f}
              </button>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))' }}>
              {rooms.map((rn) => {
                const existing = assignmentMap.get(rn)
                const isOtherHK =
                  existing && selectedHousekeeper && existing.housekeeper_id !== selectedHousekeeper.id
                const isMyHK =
                  existing && selectedHousekeeper && existing.housekeeper_id === selectedHousekeeper.id
                const isSelected = selectedSet.has(rn)

                let tileClass = 'bg-white border-gray-200 text-gray-600 cursor-pointer hover:border-orange'
                let overlay: string | null = null

                if (isOtherHK) {
                  tileClass = 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  const initials = (existing.housekeeper_name ?? '??').slice(0, 2).toUpperCase()
                  overlay = initials
                } else if (isMyHK && !isSelected) {
                  tileClass = 'bg-orange border-orange text-white cursor-pointer'
                } else if (isSelected) {
                  tileClass = 'bg-orange-light border-orange text-orange cursor-pointer'
                }

                return (
                  <button
                    key={rn}
                    type="button"
                    onClick={() => handleTileClick(rn)}
                    className={cn(
                      'relative h-[52px] rounded-[8px] border-2 flex flex-col items-center justify-center transition-all text-[11px] font-bold',
                      tileClass
                    )}
                  >
                    {isSelected && (
                      <span className="absolute top-0.5 right-0.5 text-orange text-[10px]">✓</span>
                    )}
                    <span>{rn}</span>
                    {overlay && (
                      <span className="text-[9px] font-semibold text-gray-400 leading-none">{overlay}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
