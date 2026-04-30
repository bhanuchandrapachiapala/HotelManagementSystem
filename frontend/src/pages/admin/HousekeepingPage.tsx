import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import HousekeeperSelect from '../../components/housekeeping/HousekeeperSelect'
import RoomGrid from '../../components/housekeeping/RoomGrid'
import ProgressCard from '../../components/housekeeping/ProgressCard'
import RoomStatusMap from '../../components/housekeeping/RoomStatusMap'
import TransferModal from '../../components/housekeeping/TransferModal'
import TimelineList from '../../components/housekeeping/TimelineList'
import {
  useHousekeepers,
  useInactiveHousekeepers,
  useAssignments,
  useHousekeepingProgress,
  useHousekeepingTimeline,
  useAddHousekeeper,
  useDeleteHousekeeper,
  useRestoreHousekeeper,
  useAssignRooms,
} from '../../hooks/useHousekeeping'
import { getToday } from '../../lib/utils'
import type { Housekeeper } from '../../types'

const TABS = ['Assignment', 'Overview & Analysis']

export default function HousekeepingPage() {
  const [tab, setTab] = useState(TABS[0])
  const today = getToday()

  // Assignment tab state
  const [newName, setNewName] = useState('')
  const [selectedHKId, setSelectedHKId] = useState<number | null>(null)
  const [floorFilter, setFloorFilter] = useState<number | 'all'>('all')
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const { data: hkData, isLoading: loadingHK } = useHousekeepers()
  const { data: inactiveHousekeepers = [] } = useInactiveHousekeepers(showInactive)
  const { data: assignmentsData, isLoading: loadingAssignments, refetch: refetchAssignments } = useAssignments(today)
  const { data: progressData, isLoading: loadingProgress, refetch: refetchProgress } = useHousekeepingProgress(today)
  const { data: timelineData, isLoading: loadingTimeline } = useHousekeepingTimeline(today)

  const addHK = useAddHousekeeper()
  const deleteHK = useDeleteHousekeeper()
  const restoreHK = useRestoreHousekeeper()
  const assignRooms = useAssignRooms()

  const housekeepers = hkData?.housekeepers ?? []
  const assignments = assignmentsData?.assignments ?? []
  const selectedHousekeeper: Housekeeper | null =
    housekeepers.find((h) => h.id === selectedHKId) ?? null

  // ── Add housekeeper ────────────────────────────────────────────────────────
  async function handleAddHousekeeper() {
    const name = newName.trim()
    if (!name) return
    try {
      await addHK.mutateAsync(name)
      setNewName('')
      toast.success(`${name} added`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add housekeeper')
    }
  }

  // ── Delete / restore housekeeper ──────────────────────────────────────────
  async function handleDelete(id: number) {
    try {
      await deleteHK.mutateAsync(id)
      setConfirmDeleteId(null)
      toast.success('Housekeeper removed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function handleRestore(id: number) {
    try {
      await restoreHK.mutateAsync(id)
      toast.success('Housekeeper restored')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Restore failed')
    }
  }

  // ── Room selection ─────────────────────────────────────────────────────────
  function toggleRoom(rn: string) {
    setSelectedRooms((prev) =>
      prev.includes(rn) ? prev.filter((r) => r !== rn) : [...prev, rn]
    )
  }

  function selectAll(floor?: number) {
    const floors = floor ? [floor] : [1, 2, 3, 4]
    const available: string[] = []
    for (const f of floors) {
      for (let i = 1; i <= 34; i++) {
        const rn = `${f}${String(i).padStart(2, '0')}`
        const existing = assignments.find((a) => a.room_number === rn)
        if (!existing || existing.housekeeper_id === selectedHKId) {
          available.push(rn)
        }
      }
    }
    setSelectedRooms((prev) => Array.from(new Set([...prev, ...available])))
  }

  // ── Assign rooms ───────────────────────────────────────────────────────────
  async function handleAssign() {
    if (!selectedHKId || selectedRooms.length === 0) return
    try {
      const res = await assignRooms.mutateAsync({
        date: today,
        housekeeper_id: selectedHKId,
        room_numbers: selectedRooms,
      })
      toast.success(res.message)
      setSelectedRooms([])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Assignment failed')
    }
  }

  // ── Floor breakdown (for analysis tab) ────────────────────────────────────
  const floorBreakdown = [1, 2, 3, 4].map((f) => {
    const floorAssignments = assignments.filter((a) => a.floor === f)
    const assigned = floorAssignments.length
    const done = floorAssignments.filter((a) => a.status === 'done').length
    const pending = floorAssignments.filter((a) => a.status !== 'done').length
    return { floor: f, assigned, done, pending, rate: assigned ? Math.round((done / assigned) * 100) : 0 }
  })

  const sortedProgress = [...(progressData?.housekeepers ?? [])].sort((a, b) => {
    if (a.pace === 'not_started' && b.pace !== 'not_started') return 1
    if (b.pace === 'not_started' && a.pace !== 'not_started') return -1
    return b.completion_rate - a.completion_rate
  })

  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />

      {/* ── Tab 1: Assignment ── */}
      {tab === TABS[0] && (
        <div className="space-y-5">
          {/* Add housekeeper */}
          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-4">Add Housekeeper</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddHousekeeper()}
                placeholder="Enter full name"
                className="flex-1 border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-2.5 outline-none font-body text-sm"
              />
              <button
                type="button"
                onClick={handleAddHousekeeper}
                disabled={!newName.trim() || addHK.isPending}
                className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2.5 text-sm transition-colors disabled:opacity-40"
              >
                {addHK.isPending ? 'Adding…' : 'Add'}
              </button>
            </div>
            {/* Active housekeeper list */}
            {loadingHK ? null : housekeepers.length === 0 ? (
              <p className="text-xs text-gray-400 mt-3">No housekeepers added yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {housekeepers.map((hk) => {
                  const roomCount = assignments.filter((a) => a.housekeeper_id === hk.id).length
                  const isConfirming = confirmDeleteId === hk.id
                  return (
                    <div
                      key={hk.id}
                      className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-[10px]"
                    >
                      <span className="flex-1 text-sm font-semibold text-brand-black">{hk.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{roomCount} room{roomCount !== 1 ? 's' : ''} today</span>
                      {isConfirming ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-red font-semibold">Delete?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(hk.id)}
                            disabled={deleteHK.isPending}
                            className="text-xs font-bold text-white bg-red hover:bg-red/80 px-2 py-1 rounded-[6px] transition-colors disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(hk.id)}
                          className="text-gray-300 hover:text-red transition-colors flex-shrink-0"
                          aria-label={`Remove ${hk.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Show inactive toggle */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowInactive((v) => !v)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showInactive ? 'Hide inactive' : 'Show inactive housekeepers'}
              </button>
              {showInactive && (
                <div className="mt-3 space-y-2">
                  {inactiveHousekeepers.length === 0 ? (
                    <p className="text-xs text-gray-400">No inactive housekeepers.</p>
                  ) : (
                    inactiveHousekeepers.map((hk) => (
                      <div
                        key={hk.id}
                        className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-[10px] opacity-60"
                      >
                        <span className="flex-1 text-sm text-gray-400 line-through">{hk.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRestore(hk.id)}
                          disabled={restoreHK.isPending}
                          className="text-xs font-bold text-orange hover:text-orange-dark transition-colors disabled:opacity-50"
                        >
                          Restore
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Assign rooms */}
          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-4">Assign Rooms</h2>

            <div className="flex flex-wrap gap-4 mb-5">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                  Select Housekeeper
                </label>
                <HousekeeperSelect
                  housekeepers={housekeepers}
                  value={selectedHKId}
                  onChange={(id) => { setSelectedHKId(id); setSelectedRooms([]) }}
                  className="min-w-[180px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                  Select Floor
                </label>
                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="border border-gray-200 focus:border-orange rounded-[10px] px-4 py-2.5 outline-none font-body text-sm bg-white"
                >
                  <option value="all">All Floors</option>
                  {[1, 2, 3, 4].map((f) => <option key={f} value={f}>Floor {f}</option>)}
                </select>
              </div>
            </div>

            {loadingAssignments ? (
              <LoadingSpinner />
            ) : (
              <RoomGrid
                floor={floorFilter}
                assignments={assignments}
                selectedHousekeeper={selectedHousekeeper}
                selectedRooms={selectedRooms}
                onToggleRoom={toggleRoom}
                onSelectAll={selectAll}
                onClearAll={() => setSelectedRooms([])}
              />
            )}

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100 flex-wrap">
              <span className="text-sm text-gray-500">
                <span className="font-bold text-brand-black">{selectedRooms.length}</span> rooms selected
              </span>
              <button
                type="button"
                onClick={handleAssign}
                disabled={!selectedHKId || selectedRooms.length === 0 || assignRooms.isPending}
                className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2.5 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assignRooms.isPending ? 'Assigning…' : 'Assign Selected'}
              </button>
              {selectedRooms.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedRooms([])}
                  className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </SectionCard>

          {/* Transfer rooms */}
          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-4">Transfer Rooms</h2>
            {loadingHK ? (
              <LoadingSpinner />
            ) : (
              <TransferModal housekeepers={housekeepers} assignments={assignments} />
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Tab 2: Overview & Analysis ── */}
      {tab === TABS[1] && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              label="Total Assigned"
              value={progressData?.total_assigned ?? '—'}
              icon="🛏️"
              accentColor="orange"
              loading={loadingProgress}
            />
            <StatCard
              label="Total Done"
              value={progressData?.total_done ?? '—'}
              icon="✅"
              accentColor="green"
              loading={loadingProgress}
            />
            <StatCard
              label="Total Pending"
              value={progressData?.total_pending ?? '—'}
              icon="⏳"
              accentColor="yellow"
              loading={loadingProgress}
            />
            <StatCard
              label="Completion"
              value={progressData ? `${progressData.overall_completion_rate}%` : '—'}
              icon="📊"
              accentColor="orange"
              loading={loadingProgress}
            />
          </div>

          {/* Housekeeper progress cards */}
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-base font-semibold">Housekeeper Progress</h2>
              <button
                onClick={() => { refetchProgress(); refetchAssignments() }}
                className="text-xs font-semibold text-orange hover:text-orange-dark transition-colors"
              >
                Refresh
              </button>
            </div>
            {loadingProgress ? (
              <LoadingSpinner />
            ) : sortedProgress.length === 0 ? (
              <EmptyState icon="🧹" message="No assignments yet today" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedProgress.map((p) => (
                  <ProgressCard key={p.housekeeper_id} progress={p} />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Room status map */}
          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-5">Room Status Map</h2>
            {loadingAssignments ? (
              <LoadingSpinner />
            ) : (
              <RoomStatusMap assignments={assignments} />
            )}
          </SectionCard>

          {/* Completion timeline */}
          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-5">Completion Timeline</h2>
            {loadingTimeline ? (
              <LoadingSpinner />
            ) : (
              <TimelineList entries={timelineData?.timeline ?? []} />
            )}
          </SectionCard>

          {/* Floor breakdown */}
          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-5">Floor Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    {['Floor', 'Assigned', 'Done', 'Pending', 'Completion %'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {floorBreakdown.map((row) => (
                    <tr key={row.floor} className="border-t border-gray-100">
                      <td className="px-4 py-3 font-semibold">Floor {row.floor}</td>
                      <td className="px-4 py-3 text-gray-600">{row.assigned}</td>
                      <td className="px-4 py-3 text-green font-semibold">{row.done}</td>
                      <td className="px-4 py-3 text-gray-600">{row.pending}</td>
                      <td className="px-4 py-3 font-bold text-brand-black">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}
    </PageWrapper>
  )
}
