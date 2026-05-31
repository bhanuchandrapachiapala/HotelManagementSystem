import { useState, useEffect, Fragment } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, isToday, isYesterday, subDays } from 'date-fns'
import { Pencil, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  useTimeClockEmployees,
  useTodayRoster,
  useTimeEntries,
  useTimeClockAnalytics,
  useClockAction,
  useAddEmployee,
  useUpdateEmployee,
  useEditEntry,
} from '../../hooks/useTimeClock'
import { getToday, cn } from '../../lib/utils'
import type { Department, TimeClockEmployee, TimeClockEntry, TimeEntryStatus } from '../../types'

const TABS = ['Clock In/Out', 'Time Logs', 'Reports']

const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: 'front_desk', label: 'Front Desk' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'management', label: 'Management' },
  { value: 'other', label: 'Other' },
]

const DEPT_LABEL: Record<Department, string> = {
  front_desk: 'Front Desk',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
  kitchen: 'Kitchen',
  management: 'Management',
  other: 'Other',
}

// Static classes so Tailwind includes them in the build.
const DEPT_STYLE: Record<Department, string> = {
  front_desk: 'bg-blue-100 text-blue-700',
  housekeeping: 'bg-orange-100 text-orange-700',
  maintenance: 'bg-yellow-100 text-yellow-800',
  kitchen: 'bg-green-100 text-green-700',
  management: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
}

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatHM(hours: number): string {
  const totalMin = Math.max(0, Math.round(hours * 60))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDateLabel(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE, MMM d')
}

function hoursSince(iso: string, now: number): number {
  return (now - new Date(iso).getTime()) / 3_600_000
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(v: string): string {
  return new Date(v).toISOString()
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v)
  return `"${s.replace(/"/g, '""')}"`
}

// ── small components ────────────────────────────────────────────────────────

function DeptBadge({ dept }: { dept: Department | null }) {
  const d = dept ?? 'other'
  return (
    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', DEPT_STYLE[d])}>
      {DEPT_LABEL[d]}
    </span>
  )
}

function StatusBadge({ status }: { status: TimeEntryStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green bg-green-light px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
        Active
      </span>
    )
  }
  if (status === 'incomplete') return <Badge variant="red">Incomplete</Badge>
  return <Badge variant="gray">Completed</Badge>
}

// ── page ────────────────────────────────────────────────────────────────────

export default function TimeClockPage() {
  const [tab, setTab] = useState(TABS[0])

  // a single ticking clock drives every live timer on the page
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />
      {tab === TABS[0] && <ClockTab now={now} />}
      {tab === TABS[1] && <LogsTab />}
      {tab === TABS[2] && <ReportsTab />}
    </PageWrapper>
  )
}

// ── TAB 1: Clock In/Out ───────────────────────────────────────────────────────

function ClockTab({ now }: { now: number }) {
  const { data, isLoading } = useTimeClockEmployees(true)
  const clock = useClockAction()
  const addEmp = useAddEmployee()
  const updateEmp = useUpdateEmployee()

  const [showManage, setShowManage] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDept, setNewDept] = useState<Department>('front_desk')
  const [confirm, setConfirm] = useState<{ id: number; type: 'in' | 'out' } | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editDept, setEditDept] = useState<Department>('front_desk')
  const [confirmDeactivate, setConfirmDeactivate] = useState<number | null>(null)

  const employees = data?.employees ?? []
  const active = employees.filter((e) => e.is_active)
  const inactive = employees.filter((e) => !e.is_active)

  const currentlyIn = active.filter((e) => e.is_clocked_in).length
  const clockedOutToday = active.filter((e) => !e.is_clocked_in && e.hours_today > 0).length
  const totalHoursToday = active.reduce((s, e) => s + e.hours_today, 0)

  async function handleAdd() {
    const name = newName.trim()
    if (name.length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    try {
      await addEmp.mutateAsync({ name, department: newDept })
      setNewName('')
      setNewDept('front_desk')
      toast.success(`${name} added`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add employee')
    }
  }

  async function handleClock(emp: TimeClockEmployee) {
    setConfirm(null)
    try {
      const res = await clock.mutateAsync(emp.id)
      if (res.action === 'clocked_in') toast.success(`${emp.name} clocked in`)
      else toast.success(`${emp.name} clocked out — ${formatHM(res.total_hours ?? 0)}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Clock action failed')
    }
  }

  function startEdit(emp: TimeClockEmployee) {
    setEditId(emp.id)
    setEditName(emp.name)
    setEditDept(emp.department)
  }

  async function saveEdit(id: number) {
    try {
      await updateEmp.mutateAsync({ id, data: { name: editName.trim(), department: editDept } })
      setEditId(null)
      toast.success('Employee updated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function deactivate(id: number) {
    try {
      await updateEmp.mutateAsync({ id, data: { is_active: false } })
      setConfirmDeactivate(null)
      toast.success('Employee deactivated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to deactivate')
    }
  }

  async function restore(id: number) {
    try {
      await updateEmp.mutateAsync({ id, data: { is_active: true } })
      toast.success('Employee reactivated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to restore')
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="Currently In" value={currentlyIn} icon="🟢" accentColor="green" loading={isLoading} />
        <StatCard label="Clocked Out Today" value={clockedOutToday} icon="✅" accentColor="green" loading={isLoading} />
        <StatCard label="Total Hours Today" value={`${totalHoursToday.toFixed(1)}h`} icon="⏱️" accentColor="orange" loading={isLoading} />
      </div>

      {/* Manage Staff */}
      <SectionCard>
        <button
          type="button"
          onClick={() => setShowManage((v) => !v)}
          className="text-sm font-semibold text-orange hover:text-orange-dark transition-colors"
        >
          Manage Staff {showManage ? '▴' : '▾'}
        </button>

        {showManage && (
          <div className="mt-4 space-y-4">
            {/* Add */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="Employee Name"
                className="flex-1 border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-2.5 outline-none font-body text-sm"
              />
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value as Department)}
                className="border border-gray-200 focus:border-orange rounded-[10px] px-4 py-2.5 outline-none font-body text-sm bg-white"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newName.trim() || addEmp.isPending}
                className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2.5 text-sm transition-colors disabled:opacity-40"
              >
                {addEmp.isPending ? 'Adding…' : 'Add Employee'}
              </button>
            </div>

            {/* Active list */}
            <div className="space-y-2">
              {active.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-[10px]">
                  {editId === emp.id ? (
                    <>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 border border-gray-200 focus:border-orange rounded-[8px] px-3 py-1.5 outline-none text-sm"
                      />
                      <select
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value as Department)}
                        className="border border-gray-200 rounded-[8px] px-3 py-1.5 outline-none text-sm bg-white"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => saveEdit(emp.id)}
                        disabled={editName.trim().length < 2 || updateEmp.isPending}
                        className="text-xs font-bold text-white bg-orange hover:bg-orange-dark px-3 py-1.5 rounded-[8px] disabled:opacity-40"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-semibold text-brand-black">{emp.name}</span>
                      <DeptBadge dept={emp.department} />
                      {confirmDeactivate === emp.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red font-semibold">Deactivate?</span>
                          <button
                            type="button"
                            onClick={() => deactivate(emp.id)}
                            disabled={updateEmp.isPending}
                            className="text-xs font-bold text-white bg-red hover:bg-red/80 px-2 py-1 rounded-[6px] disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeactivate(null)}
                            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(emp)}
                            className="text-gray-300 hover:text-orange transition-colors"
                            aria-label={`Edit ${emp.name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeactivate(emp.id)}
                            className="text-gray-300 hover:text-red transition-colors"
                            aria-label={`Deactivate ${emp.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
              {active.length === 0 && <p className="text-xs text-gray-400">No active employees yet.</p>}
            </div>

            {/* Inactive */}
            <div className="pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowInactive((v) => !v)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showInactive ? 'Hide inactive' : 'Show inactive'}
              </button>
              {showInactive && (
                <div className="mt-3 space-y-2">
                  {inactive.length === 0 ? (
                    <p className="text-xs text-gray-400">No inactive employees.</p>
                  ) : (
                    inactive.map((emp) => (
                      <div key={emp.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-[10px] opacity-60">
                        <span className="flex-1 text-sm text-gray-400 line-through">{emp.name}</span>
                        <DeptBadge dept={emp.department} />
                        <button
                          type="button"
                          onClick={() => restore(emp.id)}
                          disabled={updateEmp.isPending}
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
          </div>
        )}
      </SectionCard>

      {/* Clock grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : active.length === 0 ? (
        <SectionCard>
          <EmptyState icon="⏰" message="No employees yet — add staff above to start clocking time." />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((emp) => {
            const elapsed = emp.clocked_in_at ? hoursSince(emp.clocked_in_at, now) : 0
            const longShift = emp.is_clocked_in && elapsed > 8
            const isConfirming = confirm?.id === emp.id

            return (
              <div
                key={emp.id}
                className={cn(
                  'rounded-card border p-5 transition-colors',
                  emp.is_clocked_in
                    ? 'bg-green-50 border-gray-100 border-l-4 border-l-green-500'
                    : 'bg-white border-gray-100',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-display text-lg font-bold text-brand-black leading-tight">{emp.name}</h3>
                  <DeptBadge dept={emp.department} />
                </div>

                {emp.is_clocked_in ? (
                  <div className="mb-4">
                    <div className={cn('text-2xl font-bold', longShift ? 'text-orange' : 'text-green')}>
                      {longShift && '⚠ '}{formatHM(elapsed)}
                      {longShift && <span className="text-xs font-semibold ml-1">— long shift</span>}
                    </div>
                    {emp.clocked_in_at && (
                      <p className="text-xs text-gray-400 mt-0.5">Since {formatTime(emp.clocked_in_at)}</p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-sm text-gray-400">Not clocked in</p>
                    {emp.hours_today > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">Worked {formatHM(emp.hours_today)} today</p>
                    )}
                  </div>
                )}

                {isConfirming ? (
                  <div className="rounded-[10px] bg-white border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-brand-black mb-1">
                      {confirm?.type === 'in' ? `Clock in ${emp.name}?` : `Clock out ${emp.name}?`}
                    </p>
                    {confirm?.type === 'out' && emp.clocked_in_at && (
                      <p className="text-xs text-gray-400 mb-2">Been in for {formatHM(elapsed)}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleClock(emp)}
                        disabled={clock.isPending}
                        className={cn(
                          'flex-1 text-white font-semibold rounded-[10px] py-2 text-sm transition-colors disabled:opacity-50',
                          confirm?.type === 'in' ? 'bg-green hover:bg-green/85' : 'bg-red hover:bg-red/85',
                        )}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm(null)}
                        className="flex-1 font-semibold rounded-[10px] py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : emp.is_clocked_in ? (
                  <button
                    type="button"
                    onClick={() => setConfirm({ id: emp.id, type: 'out' })}
                    className="w-full bg-red hover:bg-red/85 text-white font-semibold rounded-[10px] py-3 text-sm transition-colors"
                  >
                    Clock Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirm({ id: emp.id, type: 'in' })}
                    className="w-full bg-green hover:bg-green/85 text-white font-semibold rounded-[10px] py-3 text-sm transition-colors"
                  >
                    Clock In
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TAB 2: Time Logs ──────────────────────────────────────────────────────────

function LogsTab() {
  const today = getToday()
  const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')

  const [dateFrom, setDateFrom] = useState(weekAgo)
  const [dateTo, setDateTo] = useState(today)
  const [employeeId, setEmployeeId] = useState<string>('')
  const [department, setDepartment] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | TimeEntryStatus>('all')

  const { data: empData } = useTimeClockEmployees(true)
  const { data, isLoading } = useTimeEntries({
    employee_id: employeeId ? Number(employeeId) : undefined,
    department: department || undefined,
    date_from: dateFrom,
    date_to: dateTo,
    limit: 500,
  })
  const editEntry = useEditEntry()

  const employees = empData?.employees ?? []

  const [editId, setEditId] = useState<number | null>(null)
  const [eIn, setEIn] = useState('')
  const [eOut, setEOut] = useState('')
  const [eNotes, setENotes] = useState('')
  const [eBy, setEBy] = useState('')

  let entries = data?.entries ?? []
  if (statusFilter !== 'all') entries = entries.filter((e) => e.status === statusFilter)
  // incomplete entries float to the top
  const sorted = [...entries].sort((a, b) => {
    if (a.status === 'incomplete' && b.status !== 'incomplete') return -1
    if (b.status === 'incomplete' && a.status !== 'incomplete') return 1
    return new Date(b.clock_in_at).getTime() - new Date(a.clock_in_at).getTime()
  })

  function startEdit(entry: TimeClockEntry) {
    setEditId(entry.id)
    setEIn(isoToLocalInput(entry.clock_in_at))
    setEOut(isoToLocalInput(entry.clock_out_at))
    setENotes(entry.notes ?? '')
    setEBy('')
  }

  async function saveEdit(entryId: number) {
    if (!eBy.trim()) {
      toast.error('"Edited by" is required')
      return
    }
    try {
      await editEntry.mutateAsync({
        entryId,
        data: {
          clock_in_at: eIn ? localInputToIso(eIn) : undefined,
          clock_out_at: eOut ? localInputToIso(eOut) : undefined,
          notes: eNotes || undefined,
          edited_by: eBy.trim(),
        },
      })
      setEditId(null)
      toast.success('Entry updated')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update entry')
    }
  }

  const inputCls =
    'border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-3 py-2 outline-none font-body text-sm bg-white'

  return (
    <div className="space-y-5">
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Filters</h2>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | TimeEntryStatus)} className={inputCls}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Time Entries</h2>
        {isLoading ? (
          <LoadingSpinner />
        ) : sorted.length === 0 ? (
          <EmptyState icon="🗂️" message="No entries match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status', 'Edit'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => {
                  const overEight = (entry.total_hours ?? 0) > 8
                  const isEditing = editId === entry.id
                  return (
                    <Fragment key={entry.id}>
                      <tr
                        className={cn(
                          'border-t border-gray-100',
                          entry.status === 'incomplete' && 'bg-red-light/40',
                        )}
                      >
                        <td className="px-4 py-3 font-semibold text-brand-black whitespace-nowrap">{entry.employee_name ?? '—'}</td>
                        <td className="px-4 py-3"><DeptBadge dept={entry.department} /></td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateLabel(entry.clock_in_at)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTime(entry.clock_in_at)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{entry.clock_out_at ? formatTime(entry.clock_out_at) : '—'}</td>
                        <td className={cn('px-4 py-3 font-semibold whitespace-nowrap', overEight ? 'text-red' : 'text-green')}>
                          {entry.total_hours !== null ? formatHM(entry.total_hours) : '—'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={entry.status} /></td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditId(null) : startEdit(entry))}
                            className="text-gray-300 hover:text-orange transition-colors"
                            aria-label="Edit entry"
                          >
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr className="bg-gray-50/70 border-t border-gray-100">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="flex flex-wrap items-end gap-3">
                              <div>
                                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Clock In</label>
                                <input type="datetime-local" value={eIn} onChange={(e) => setEIn(e.target.value)} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Clock Out</label>
                                <input type="datetime-local" value={eOut} onChange={(e) => setEOut(e.target.value)} className={inputCls} />
                              </div>
                              <div className="flex-1 min-w-[160px]">
                                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Notes</label>
                                <textarea value={eNotes} onChange={(e) => setENotes(e.target.value)} rows={1} className={cn(inputCls, 'w-full resize-y')} />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Edited By *</label>
                                <input type="text" value={eBy} onChange={(e) => setEBy(e.target.value)} placeholder="Your name" className={inputCls} />
                              </div>
                              <button
                                type="button"
                                onClick={() => saveEdit(entry.id)}
                                disabled={editEntry.isPending}
                                className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2 text-sm transition-colors disabled:opacity-40"
                              >
                                {editEntry.isPending ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ── TAB 3: Reports ────────────────────────────────────────────────────────────

const PERIODS: { label: string; days: number }[] = [
  { label: 'This Week', days: 7 },
  { label: 'Last Week', days: 14 },
  { label: 'This Month', days: 30 },
  { label: 'Last Month', days: 60 },
  { label: 'Custom Range', days: 0 },
]

function ReportsTab() {
  const [period, setPeriod] = useState(PERIODS[0].label)
  const [customDays, setCustomDays] = useState(30)

  const selected = PERIODS.find((p) => p.label === period) ?? PERIODS[0]
  const days = selected.days || Math.min(90, Math.max(1, customDays))

  const { data, isLoading } = useTimeClockAnalytics(days)
  const dateFrom = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
  const { data: entriesData } = useTimeEntries({ date_from: dateFrom, date_to: getToday(), limit: 2000 })

  const threshold = days <= 1 ? 8 : 40

  if (isLoading) return <LoadingSpinner />
  if (!data) return null

  const totalEmployees = data.by_employee.length
  const totalHours = data.by_employee.reduce((s, e) => s + e.total_hours, 0)
  const overtimeDays = data.by_employee.reduce((s, e) => s + e.overtime_days, 0)
  const avgHours = totalEmployees ? totalHours / totalEmployees : 0

  const empChartData = data.by_employee.map((e) => ({ name: e.employee_name, hours: e.total_hours }))
  const dailyChartData = data.daily_totals.map((d) => ({ label: d.label, hours: d.total_hours }))

  function exportAllEntries() {
    const header = ['Employee', 'Department', 'Date', 'Clock In', 'Clock Out', 'Total Hours', 'Status']
    const rows = (entriesData?.entries ?? []).map((e) =>
      [
        csvCell(e.employee_name),
        csvCell(e.department ? DEPT_LABEL[e.department] : ''),
        csvCell(format(parseISO(e.clock_in_at), 'yyyy-MM-dd')),
        csvCell(formatTime(e.clock_in_at)),
        csvCell(e.clock_out_at ? formatTime(e.clock_out_at) : ''),
        csvCell(e.total_hours !== null ? e.total_hours.toFixed(2) : ''),
        csvCell(e.status),
      ].join(','),
    )
    downloadCSV([header.map(csvCell).join(','), ...rows].join('\n'), 'time_entries.csv')
  }

  function exportSummary() {
    const header = ['Employee', 'Department', 'Days Worked', 'Total Hours', 'Avg Hours/Day', 'Overtime Days']
    const rows = data!.by_employee.map((e) =>
      [
        csvCell(e.employee_name),
        csvCell(DEPT_LABEL[e.department] ?? e.department),
        csvCell(e.days_worked),
        csvCell(e.total_hours.toFixed(2)),
        csvCell(e.avg_hours_per_day.toFixed(2)),
        csvCell(e.overtime_days),
      ].join(','),
    )
    downloadCSV([header.map(csvCell).join(','), ...rows].join('\n'), 'time_summary_by_employee.csv')
  }

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <SectionCard>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-500">Period:</span>
          {PERIODS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPeriod(p.label)}
              className={cn(
                'text-sm font-semibold px-3 py-1.5 rounded-[10px] transition-colors',
                period === p.label ? 'bg-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {p.label}
            </button>
          ))}
          {selected.days === 0 && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={90}
                value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                className="w-20 border border-gray-200 focus:border-orange rounded-[10px] px-3 py-1.5 outline-none text-sm"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Row 1 — Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Employees" value={totalEmployees} icon="👥" accentColor="orange" />
        <StatCard label="Total Hours" value={`${totalHours.toFixed(1)}h`} icon="⏱️" accentColor="yellow" />
        {overtimeDays > 0 && (
          <StatCard label="Overtime Days Flagged" value={overtimeDays} icon="⚠️" accentColor="red" />
        )}
        <StatCard label="Avg Hours / Employee" value={`${avgHours.toFixed(1)}h`} icon="📊" accentColor="green" />
      </div>

      {/* Row 2 — Hours by employee */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Hours by Employee</h2>
        {empChartData.length === 0 ? (
          <p className="text-sm text-gray-400">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={empChartData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, 'Hours']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine y={threshold} stroke="#dc2626" strokeDasharray="4 4" label={{ value: `${threshold}h`, fontSize: 11, fill: '#dc2626' }} />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {empChartData.map((d, i) => (
                  <Cell key={i} fill={d.hours > threshold ? '#dc2626' : '#F47920'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Row 3 — Daily hours trend */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Daily Team Hours</h2>
        {dailyChartData.length === 0 ? (
          <p className="text-sm text-gray-400">No data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, 'Team Hours']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="hours" stroke="#F47920" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Row 4 — By department */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">By Department</h2>
        {data.by_department.length === 0 ? (
          <p className="text-sm text-gray-400">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Department', 'Employees', 'Total Hours', 'Avg Hours/Employee'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.by_department.map((d) => (
                  <tr key={d.department} className="border-t border-gray-100">
                    <td className="px-4 py-3"><DeptBadge dept={d.department} /></td>
                    <td className="px-4 py-3 text-gray-600">{d.employee_count}</td>
                    <td className="px-4 py-3 font-semibold text-brand-black">{d.total_hours.toFixed(1)}h</td>
                    <td className="px-4 py-3 text-gray-600">
                      {(d.employee_count ? d.total_hours / d.employee_count : 0).toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Row 5 — Overtime alerts */}
      {data.overtime_alerts.length > 0 ? (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 border-l-4 border-l-red p-6">
          <h2 className="font-display text-base font-semibold mb-4 text-red">⚠ Overtime Alerts</h2>
          <div className="space-y-2">
            {data.overtime_alerts.map((a, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-red-light/40 rounded-[10px]">
                <span className="flex-1 text-sm font-semibold text-brand-black">{a.employee_name}</span>
                <span className="text-xs text-gray-500">{a.period.replace('_', ' ')}</span>
                <span className="text-sm text-gray-600">{a.total_hours.toFixed(1)}h total</span>
                <span className="text-sm font-bold text-red">+{a.overtime_hours.toFixed(1)}h OT</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <SectionCard>
          <p className="text-sm font-semibold text-green">✓ No overtime alerts for this period</p>
        </SectionCard>
      )}

      {/* Row 6 — Export */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Export</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportAllEntries}
            className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2.5 text-sm transition-colors"
          >
            Export CSV — All Entries
          </button>
          <button
            type="button"
            onClick={exportSummary}
            className="bg-white border border-gray-200 hover:border-orange text-gray-700 font-semibold rounded-[10px] px-5 py-2.5 text-sm transition-colors"
          >
            Export CSV — Summary by Employee
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
