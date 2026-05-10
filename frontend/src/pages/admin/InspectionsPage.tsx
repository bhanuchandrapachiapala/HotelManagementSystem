import { useState, useMemo } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import IssueCard from '../../components/inspections/IssueCard'
import RoomStatusGrid, { RoomDetailPanel, roomStatusConfig } from '../../components/inspections/RoomStatusGrid'
import InspectionLogRow from '../../components/inspections/InspectionLogRow'
import AnalyticsCharts from '../../components/inspections/AnalyticsCharts'
import {
  useOpenIssues,
  useInspectionLog,
  useRoomStatus,
  useInspectionAnalytics,
  useInspectors,
  useAddInspector,
  useDeleteInspector,
} from '../../hooks/useInspections'
import { cn } from '../../lib/utils'

const TABS = ['Live Issues', 'Inspection Log', 'Room Status', 'Analytics']

const CATEGORY_OPTIONS = [
  { id: 'cleanliness', label: 'Cleanliness' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'plumbing', label: 'Plumbing' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'hvac', label: 'HVAC' },
  { id: 'safety', label: 'Safety' },
  { id: 'cosmetic', label: 'Cosmetic' },
]

export default function InspectionsPage() {
  const [tab, setTab] = useState(TABS[0])

  // Live Issues filters
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [roomFilter, setRoomFilter] = useState<string>('')

  // Log filters
  const [logRoom, setLogRoom] = useState('')
  const [logInspectorId, setLogInspectorId] = useState<string>('')
  const [logTypeFilter, setLogTypeFilter] = useState('')
  const [logDateFrom, setLogDateFrom] = useState('')
  const [logDateTo, setLogDateTo] = useState('')

  // Room status detail
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)

  // Analytics period
  const [analyticsDays, setAnalyticsDays] = useState(30)

  // Add inspector modal
  const [showAddInspector, setShowAddInspector] = useState(false)
  const [newInspectorName, setNewInspectorName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const openIssuesQuery = useOpenIssues({
    severity: severityFilter || undefined,
    category: categoryFilter || undefined,
    room_number: roomFilter.trim() || undefined,
  })
  const logQuery = useInspectionLog({
    limit: 50,
    room_number: logRoom.trim() || undefined,
    inspector_id: logInspectorId ? Number(logInspectorId) : undefined,
    date_from: logDateFrom || undefined,
    date_to: logDateTo || undefined,
  })
  const roomStatusQuery = useRoomStatus()
  const analyticsQuery = useInspectionAnalytics(analyticsDays)
  const inspectorsQuery = useInspectors()
  const addInspector = useAddInspector()
  const deleteInspector = useDeleteInspector()

  const inspectors = inspectorsQuery.data?.inspectors ?? []
  const issues = openIssuesQuery.data?.issues ?? []
  const inspectionsList = logQuery.data?.inspections ?? []
  const filteredInspections = logTypeFilter
    ? inspectionsList.filter((i) => i.inspection_type === logTypeFilter)
    : inspectionsList

  const rooms = roomStatusQuery.data?.rooms ?? {}
  const selectedRoomData = selectedRoom ? rooms[selectedRoom] : null

  const selectedRoomOpenIssues = useMemo(() => {
    if (!selectedRoom) return []
    return issues.filter((i) => i.room_number === selectedRoom)
  }, [issues, selectedRoom])

  const selectedRoomInspections = useMemo(() => {
    if (!selectedRoom) return []
    return inspectionsList.filter((i) => i.room_number === selectedRoom)
  }, [inspectionsList, selectedRoom])

  async function handleAddInspector() {
    const name = newInspectorName.trim()
    if (!name) return
    try {
      await addInspector.mutateAsync(name)
      setNewInspectorName('')
      setShowAddInspector(false)
      toast.success(`${name} added`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add inspector')
    }
  }

  async function handleDeleteInspector(id: number) {
    try {
      await deleteInspector.mutateAsync(id)
      setConfirmDeleteId(null)
      toast.success('Inspector removed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />

      {/* ── Tab 1: Live Issues ── */}
      {tab === TABS[0] && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              label="Total Open Issues"
              value={openIssuesQuery.data?.total ?? '—'}
              icon="🔍"
              accentColor="orange"
              loading={openIssuesQuery.isLoading}
            />
            <StatCard
              label="Urgent"
              value={openIssuesQuery.data?.urgent ?? '—'}
              icon="🔴"
              accentColor="red"
              loading={openIssuesQuery.isLoading}
            />
            <StatCard
              label="Standard"
              value={openIssuesQuery.data?.standard ?? '—'}
              icon="🟡"
              accentColor="yellow"
              loading={openIssuesQuery.isLoading}
            />
            <StatCard
              label="Minor"
              value={openIssuesQuery.data?.minor ?? '—'}
              icon="🔵"
              accentColor="orange"
              loading={openIssuesQuery.isLoading}
            />
          </div>

          {/* Filter bar */}
          <SectionCard>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                  Severity
                </label>
                <div className="flex gap-1.5">
                  {[
                    { id: '', label: 'All' },
                    { id: 'urgent', label: 'Urgent' },
                    { id: 'standard', label: 'Standard' },
                    { id: 'minor', label: 'Minor' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSeverityFilter(opt.id)}
                      className={cn(
                        'text-xs font-semibold px-3 py-2 rounded-[8px] border transition-colors',
                        severityFilter === opt.id
                          ? 'bg-orange text-white border-orange'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-orange'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-gray-200 focus:border-orange rounded-[8px] px-3 py-2 outline-none text-sm bg-white"
                >
                  <option value="">All categories</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                  Room
                </label>
                <input
                  type="text"
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  placeholder="e.g. 204"
                  className="border border-gray-200 focus:border-orange rounded-[8px] px-3 py-2 outline-none text-sm w-[120px]"
                />
              </div>
              {(severityFilter || categoryFilter || roomFilter) && (
                <button
                  type="button"
                  onClick={() => { setSeverityFilter(''); setCategoryFilter(''); setRoomFilter('') }}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  Clear filters
                </button>
              )}
            </div>
          </SectionCard>

          {/* Issue list */}
          {openIssuesQuery.isLoading ? (
            <SectionCard><LoadingSpinner /></SectionCard>
          ) : issues.length === 0 ? (
            <SectionCard>
              <EmptyState icon="✅" message="No open issues" subtext="All rooms are looking great." />
            </SectionCard>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Inspection Log ── */}
      {tab === TABS[1] && (
        <div className="space-y-5">
          {/* Add inspector */}
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Inspectors</h2>
              <button
                type="button"
                onClick={() => setShowAddInspector(true)}
                className="text-xs font-semibold text-orange hover:text-orange-dark flex items-center gap-1"
              >
                <Plus size={14} /> Add Inspector
              </button>
            </div>
            {inspectorsQuery.isLoading ? (
              <LoadingSpinner />
            ) : inspectors.length === 0 ? (
              <p className="text-xs text-gray-400">No inspectors yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {inspectors.map((insp) => {
                  const isConfirming = confirmDeleteId === insp.id
                  return (
                    <div key={insp.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-[8px]">
                      <span className="flex-1 text-sm font-semibold text-brand-black">{insp.name}</span>
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteInspector(insp.id)}
                            className="text-xs font-bold text-white bg-red hover:bg-red/80 px-2 py-1 rounded-[6px]"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-semibold text-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(insp.id)}
                          className="text-gray-300 hover:text-red transition-colors"
                          aria-label={`Remove ${insp.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Filters */}
          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-4">Inspection Log</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">From</label>
                <input
                  type="date"
                  value={logDateFrom}
                  onChange={(e) => setLogDateFrom(e.target.value)}
                  className="border border-gray-200 focus:border-orange rounded-[8px] px-3 py-2 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">To</label>
                <input
                  type="date"
                  value={logDateTo}
                  onChange={(e) => setLogDateTo(e.target.value)}
                  className="border border-gray-200 focus:border-orange rounded-[8px] px-3 py-2 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Room</label>
                <input
                  type="text"
                  value={logRoom}
                  onChange={(e) => setLogRoom(e.target.value)}
                  placeholder="e.g. 204"
                  className="border border-gray-200 focus:border-orange rounded-[8px] px-3 py-2 outline-none text-sm w-[120px]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Inspector</label>
                <select
                  value={logInspectorId}
                  onChange={(e) => setLogInspectorId(e.target.value)}
                  className="border border-gray-200 focus:border-orange rounded-[8px] px-3 py-2 outline-none text-sm bg-white"
                >
                  <option value="">All inspectors</option>
                  {inspectors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Type</label>
                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value)}
                  className="border border-gray-200 focus:border-orange rounded-[8px] px-3 py-2 outline-none text-sm bg-white"
                >
                  <option value="">All types</option>
                  <option value="routine">Routine</option>
                  <option value="post_checkout">Post-Checkout</option>
                  <option value="post_maintenance">Post-Maintenance</option>
                  <option value="deep_clean">Deep Clean</option>
                  <option value="pre_vip">Pre-VIP</option>
                </select>
              </div>
            </div>

            {logQuery.isLoading ? (
              <LoadingSpinner />
            ) : filteredInspections.length === 0 ? (
              <EmptyState icon="📋" message="No inspections match these filters" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Room', 'Inspector', 'Type', 'Date & Time', 'Duration', 'Condition', 'Issues', 'Status', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInspections.map((insp) => (
                      <InspectionLogRow key={insp.id} inspection={insp} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── Tab 3: Room Status Board ── */}
      {tab === TABS[2] && (
        <div className="space-y-5">
          <SectionCard>
            <div className="flex items-center gap-4 flex-wrap text-xs">
              <span className="font-semibold text-gray-500">Legend:</span>
              {(Object.entries(roomStatusConfig) as Array<[keyof typeof roomStatusConfig, { className: string; label: string }]>).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <span className={cn('h-3 w-3 rounded-[4px]', cfg.className.split(' ')[0])} />
                  <span className="text-gray-600 font-medium">{cfg.label}</span>
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-5">Room Inspection Status</h2>
            {roomStatusQuery.isLoading ? (
              <LoadingSpinner />
            ) : (
              <RoomStatusGrid
                rooms={rooms}
                onSelectRoom={(rn) => setSelectedRoom(rn)}
                selectedRoom={selectedRoom}
              />
            )}
          </SectionCard>

          {selectedRoom && (
            <RoomDetailPanel
              roomNumber={selectedRoom}
              room={selectedRoomData ?? undefined}
              onClose={() => setSelectedRoom(null)}
            >
              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">
                  Open Issues ({selectedRoomOpenIssues.length})
                </h3>
                {selectedRoomOpenIssues.length === 0 ? (
                  <p className="text-sm text-gray-400">No open issues for this room.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedRoomOpenIssues.map((issue) => (
                      <IssueCard key={issue.id} issue={issue} />
                    ))}
                  </div>
                )}
              </div>

              {selectedRoomInspections.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">
                    Inspection History
                  </h3>
                  <div className="space-y-2">
                    {selectedRoomInspections.map((insp) => (
                      <div key={insp.id} className="bg-gray-50 rounded-[8px] px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{insp.inspector_name}</span>
                          <span className="text-xs text-gray-500">
                            {insp.submitted_at ? new Date(insp.submitted_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {insp.inspection_type.replace('_', ' ')} ·
                          {insp.overall_condition ? ` ${insp.overall_condition}` : ' —'} ·
                          {insp.issues_count ?? 0} issue{insp.issues_count === 1 ? '' : 's'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </RoomDetailPanel>
          )}
        </div>
      )}

      {/* ── Tab 4: Analytics ── */}
      {tab === TABS[3] && (
        <div className="space-y-5">
          <SectionCard>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Period:</span>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAnalyticsDays(d)}
                  className={cn(
                    'text-sm font-semibold px-4 py-2 rounded-[8px] border transition-colors',
                    analyticsDays === d
                      ? 'bg-orange text-white border-orange'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-orange'
                  )}
                >
                  Last {d} days
                </button>
              ))}
            </div>
          </SectionCard>

          {analyticsQuery.isLoading ? (
            <SectionCard><LoadingSpinner /></SectionCard>
          ) : analyticsQuery.data ? (
            <>
              {/* Row 1 — KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
                <StatCard
                  label="Total Inspections"
                  value={analyticsQuery.data.total_inspections}
                  icon="📋"
                  accentColor="orange"
                />
                <StatCard
                  label="Total Issues"
                  value={analyticsQuery.data.total_issues}
                  icon="🚨"
                  accentColor="red"
                />
                <StatCard
                  label="Open Issues"
                  value={analyticsQuery.data.open_issues}
                  icon="⏳"
                  accentColor="yellow"
                />
                <StatCard
                  label="Avg Inspection"
                  value={analyticsQuery.data.avg_inspection_duration_minutes != null
                    ? `${Math.round(analyticsQuery.data.avg_inspection_duration_minutes)}m`
                    : '—'}
                  icon="⏱️"
                  accentColor="green"
                />
                <StatCard
                  label="SLA Compliance"
                  value={(() => {
                    const c = analyticsQuery.data.sla_compliance
                    const totals = ['urgent', 'standard', 'minor'].reduce(
                      (acc, sev) => {
                        acc.total += c[sev]?.total ?? 0
                        acc.met += c[sev]?.within_sla ?? 0
                        return acc
                      },
                      { total: 0, met: 0 }
                    )
                    return totals.total > 0 ? `${Math.round((totals.met / totals.total) * 100)}%` : '—'
                  })()}
                  icon="✅"
                  accentColor="orange"
                />
              </div>

              <AnalyticsCharts data={analyticsQuery.data} />

              {/* Most problematic rooms */}
              <SectionCard>
                <h3 className="font-display text-base font-semibold mb-4">Most Problematic Rooms</h3>
                {analyticsQuery.data.most_problematic_rooms.length === 0 ? (
                  <p className="text-sm text-gray-400">No data for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {['Room', 'Floor', 'Total Issues', 'Open Issues', 'Inspections', 'Avg Issues / Inspection'].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsQuery.data.most_problematic_rooms.map((row) => (
                          <tr key={row.room_number} className="border-t border-gray-100">
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => { setTab(TABS[2]); setSelectedRoom(row.room_number) }}
                                className="bg-brand-black text-white text-xs font-bold px-2 py-1 rounded-full hover:bg-orange transition-colors"
                              >
                                {row.room_number}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{row.floor}</td>
                            <td className="px-4 py-3 font-semibold">{row.total_issues}</td>
                            <td className="px-4 py-3 text-yellow-700 font-semibold">{row.open_issues}</td>
                            <td className="px-4 py-3 text-gray-600">{row.inspection_count}</td>
                            <td className="px-4 py-3 text-gray-600">{row.avg_issues_per_inspection}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              {/* Inspector performance */}
              <SectionCard>
                <h3 className="font-display text-base font-semibold mb-4">Inspector Performance</h3>
                {analyticsQuery.data.inspector_stats.length === 0 ? (
                  <p className="text-sm text-gray-400">No data for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          {['Inspector', 'Inspections', 'Avg Duration', 'Issues Found', 'Avg Issues / Inspection'].map((h) => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsQuery.data.inspector_stats.map((row) => {
                          const dur = row.avg_duration_minutes
                          let durColor = 'text-gray-600'
                          if (dur != null) {
                            if (dur < 5) durColor = 'text-red'
                            else if (dur > 20) durColor = 'text-orange'
                            else durColor = 'text-green'
                          }
                          return (
                            <tr key={row.inspector_id} className="border-t border-gray-100">
                              <td className="px-4 py-3 font-semibold">{row.inspector_name}</td>
                              <td className="px-4 py-3 text-gray-600">{row.total_inspections}</td>
                              <td className={cn('px-4 py-3 font-semibold', durColor)}>
                                {dur != null ? `${dur.toFixed(1)}m` : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{row.total_issues_found}</td>
                              <td className="px-4 py-3 text-gray-600">{row.avg_issues_per_inspection}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          ) : null}
        </div>
      )}

      {/* Add Inspector Modal */}
      {showAddInspector && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowAddInspector(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-card p-6 w-full max-w-[400px] shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Add Inspector</h3>
              <button
                type="button"
                onClick={() => setShowAddInspector(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={newInspectorName}
              onChange={(e) => setNewInspectorName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddInspector()}
              placeholder="Inspector full name"
              className="w-full border border-gray-200 focus:border-orange rounded-[10px] px-4 py-3 outline-none text-sm"
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddInspector}
              disabled={!newInspectorName.trim() || addInspector.isPending}
              className="w-full mt-4 bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] py-3 text-sm disabled:opacity-40"
            >
              {addInspector.isPending ? 'Adding…' : 'Add Inspector'}
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
