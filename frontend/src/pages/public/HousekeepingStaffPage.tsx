import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { formatDate, getToday } from '../../lib/utils'
import { useHousekeepers, useAssignments, useUpdateRoomStatus } from '../../hooks/useHousekeeping'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import ProgressBar from '../../components/ui/ProgressBar'
import type { RoomAssignment } from '../../types'

function RoomToggle({
  isDone,
  isPending,
  onToggle,
}: {
  isDone: boolean
  isPending: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDone}
      onClick={onToggle}
      disabled={isPending}
      className={`relative inline-flex h-7 w-[72px] flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        isDone ? 'bg-green' : 'bg-orange'
      }`}
    >
      {/* Sliding thumb */}
      <span
        className={`pointer-events-none absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          isDone ? 'translate-x-[48px]' : 'translate-x-1'
        }`}
      />
      {/* "Pending" label — visible when not done */}
      <span
        className={`pointer-events-none absolute text-[9px] font-bold text-white/80 leading-none transition-opacity duration-150 select-none ${
          isDone ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ left: '30px', top: '50%', transform: 'translateY(-50%)' }}
      >
        Pending
      </span>
      {/* "Done" label — visible when done */}
      <span
        className={`pointer-events-none absolute text-[9px] font-bold text-white leading-none transition-opacity duration-150 select-none ${
          isDone ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ left: '8px', top: '50%', transform: 'translateY(-50%)' }}
      >
        Done
      </span>
    </button>
  )
}

export default function HousekeepingStaffPage() {
  const today = getToday()
  const [selectedHKId, setSelectedHKId] = useState<number | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const { data: hkData, isLoading: loadingHK } = useHousekeepers()
  const { data: assignmentsData, isLoading: loadingAssignments } = useAssignments(
    today,
    confirmed ? selectedHKId ?? undefined : undefined
  )
  const updateStatus = useUpdateRoomStatus()

  const housekeepers = hkData?.housekeepers ?? []
  const selectedName = housekeepers.find((h) => h.id === selectedHKId)?.name ?? ''

  const myRooms: RoomAssignment[] = (assignmentsData?.assignments ?? []).sort((a, b) => {
    const order = { pending: 0, in_progress: 1, done: 2 }
    return (order[a.status] ?? 0) - (order[b.status] ?? 0)
  })

  const done = myRooms.filter((r) => r.status === 'done').length
  const total = myRooms.length
  const pct = total ? Math.round((done / total) * 100) : 0

  async function handleMark(room: RoomAssignment, status: 'done' | 'pending') {
    try {
      await updateStatus.mutateAsync({ id: room.id, status })
      toast.success(status === 'done' ? `Room ${room.room_number} marked done!` : `Room ${room.room_number} reset`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] py-10 px-4">
      <div className="max-w-[520px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-brand-black">
            Casco Bay Hotel
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mt-1">Housekeeping</p>
          <div className="mx-auto mt-4 h-[3px] w-10 rounded-full bg-gradient-to-r from-orange to-yellow-hotel" />
        </div>

        {/* Step 1 — select name */}
        {!confirmed && (
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Select your name
            </label>
            {loadingHK ? (
              <LoadingSpinner />
            ) : (
              <>
                <select
                  value={selectedHKId ?? ''}
                  onChange={(e) => setSelectedHKId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-3 outline-none font-body text-sm mb-4"
                >
                  <option value="">— Choose your name —</option>
                  {housekeepers.map((hk) => (
                    <option key={hk.id} value={hk.id}>{hk.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedHKId}
                  onClick={() => setConfirmed(true)}
                  className="w-full py-3 text-sm font-bold text-white rounded-[10px] bg-gradient-to-r from-orange to-yellow-hotel hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  View My Rooms
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2 — room list */}
        {confirmed && (
          <>
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display text-lg font-semibold">Good morning, {selectedName}!</p>
                <p className="text-xs text-gray-400">{formatDate(new Date())}</p>
              </div>
              <button
                type="button"
                onClick={() => { setConfirmed(false); setSelectedHKId(null) }}
                className="text-xs font-semibold text-orange hover:text-orange-dark transition-colors"
              >
                Switch name
              </button>
            </div>

            {loadingAssignments ? (
              <LoadingSpinner />
            ) : myRooms.length === 0 ? (
              <EmptyState
                icon="🛏️"
                message="No rooms assigned yet"
                subtext="Check back after the manager assigns rooms."
              />
            ) : (
              <>
                {/* Progress summary */}
                <div className="bg-white rounded-card shadow-sm border border-gray-100 p-5 mb-5">
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold text-brand-black">{done} <span className="text-gray-300 font-normal">/ {total}</span></p>
                      <p className="text-xs text-gray-400">rooms completed</p>
                    </div>
                    <p className="text-2xl font-bold text-orange">{pct}%</p>
                  </div>
                  <ProgressBar value={done} max={total} />
                </div>

                {/* Room cards */}
                <div className="space-y-3">
                  {myRooms.map((room) => {
                    const isDone = room.status === 'done'
                    return (
                      <div
                        key={room.id}
                        className={`bg-white rounded-card border shadow-sm p-4 flex items-center gap-4 ${
                          isDone ? 'border-green/30 opacity-80' : 'border-gray-100'
                        }`}
                      >
                        {/* Room number badge */}
                        <div className={`w-14 h-14 rounded-[10px] flex flex-col items-center justify-center flex-shrink-0 ${
                          isDone ? 'bg-green-light' : 'bg-brand-black'
                        }`}>
                          <span className={`text-[10px] uppercase tracking-widest font-semibold ${isDone ? 'text-green/60' : 'text-white/40'}`}>
                            Room
                          </span>
                          <span className={`font-bold text-lg leading-tight ${isDone ? 'text-green' : 'text-white'}`}>
                            {room.room_number}
                          </span>
                        </div>

                        {/* Floor info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-400">Floor {room.floor}</p>
                        </div>

                        {/* Toggle + timestamp */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                          <RoomToggle
                            isDone={isDone}
                            isPending={updateStatus.isPending}
                            onToggle={() => handleMark(room, isDone ? 'pending' : 'done')}
                          />
                          {isDone && room.completed_at && (
                            <p className="text-[10px] text-green font-semibold whitespace-nowrap">
                              {format(parseISO(room.completed_at), 'h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
