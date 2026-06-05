import { useState, useEffect, Fragment } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, isToday, isYesterday, addDays } from 'date-fns'
import { Pencil, Trash2, Plus, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  useTimeClockEmployees,
  useTimeEntries,
  useTimeClockAnalytics,
  useEmployeeSchedules,
  useClockAction,
  useAddEmployee,
  useUpdateEmployee,
  useUpdateEmployeeSchedule,
  useCreateScheduleOverride,
  useDeleteScheduleOverride,
  useEditEntry,
} from '../../hooks/useTimeClock'
import { getToday, cn } from '../../lib/utils'
import type { TimeClockEmployee, TimeClockEntry, ScheduleRow, TimeClockAnalytics } from '../../types'

type EmpAnalytics = TimeClockAnalytics['by_employee'][number]

const TABS = ['Clock In/Out', 'Time Logs', 'Reports']

// ── time / date helpers ───────────────────────────────────────────────────────

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

// "09:00" → "9:00 AM"
function fmtClock(hhmm?: string): string {
  if (!hhmm) return '—'
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}:${pad(m)} ${period}`
}

function formatDateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEE MMM d')
}

function hoursSince(iso: string, now: number): number {
  return (now - new Date(iso).getTime()) / 3_600_000
}

function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(v: string): string {
  return new Date(v).toISOString()
}

// Pay week runs Thursday → Wednesday
function payWeekStart(d: Date): Date {
  const day = d.getDay() // Sun=0 .. Sat=6, Thursday=4
  const diff = (day - 4 + 7) % 7
  const s = new Date(d)
  s.setDate(d.getDate() - diff)
  s.setHours(0, 0, 0, 0)
  return s
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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

function predictStatus(now: Date, hhmm: string | undefined, buffer: number): 'early' | 'on_time' | 'late' {
  if (!hhmm) return 'on_time'
  const [h, m] = hhmm.split(':').map(Number)
  const sched = new Date(now)
  sched.setHours(h, m, 0, 0)
  const diffMin = (now.getTime() - sched.getTime()) / 60000
  if (diffMin < -buffer) return 'early'
  if (diffMin <= buffer) return 'on_time'
  return 'late'
}

// ── status badge ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  on_time: { label: 'On Time', cls: 'bg-green-light text-green' },
  late: { label: 'Late', cls: 'bg-orange-light text-orange-dark' },
  early: { label: 'Early', cls: 'bg-blue-100 text-blue-700' },
  manual: { label: 'Manual', cls: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Pending', cls: 'bg-yellow-light text-yellow-900' },
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap', s.cls)}>
      {status === 'pending' && <span className="w-2 h-2 rounded-full bg-yellow-600 animate-pulse" />}
      {s.label}
    </span>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

export default function TimeClockPage() {
  const [tab, setTab] = useState(TABS[0])
  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />
      {tab === TABS[0] && <ClockTab />}
      {tab === TABS[1] && <LogsTab />}
      {tab === TABS[2] && <ReportsTab />}
    </PageWrapper>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — Clock In/Out
// ════════════════════════════════════════════════════════════════════════════

function ClockTab() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const { data: empData, isLoading } = useTimeClockEmployees()
  const { data: schedData } = useEmployeeSchedules()
  const clock = useClockAction()

  const [showManage, setShowManage] = useState(false)
  const [confirm, setConfirm] = useState<{ id: number; type: 'in' | 'out' } | null>(null)

  const employees = empData?.employees ?? []
  const schedules = schedData?.schedules ?? []
  const schedById = new Map<number, ScheduleRow>(schedules.map((s) => [s.employee_id, s]))

  const currentlyIn = employees.filter((e) => e.is_clocked_in).length
  const totalStaff = employees.length
  const hoursToday = employees.reduce((s, e) => s + e.hours_today, 0)

  async function handleClock(emp: TimeClockEmployee) {
    setConfirm(null)
    try {
      const res = await clock.mutateAsync(emp.id)
      if (res.action === 'clocked_in') {
        toast.success(`${emp.name} clocked in — ${STATUS_STYLE[res.clock_in_status ?? 'on_time']?.label ?? ''}`)
      } else {
        toast.success(`${emp.name} clocked out — ${formatHM(res.total_hours ?? 0)}${res.is_night_shift ? ' 🌙' : ''}`)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Clock action failed')
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="Currently In" value={currentlyIn} icon="🟢" accentColor="green" loading={isLoading} />
        <StatCard label="Total Staff" value={totalStaff} icon="👥" accentColor="orange" loading={isLoading} />
        <StatCard label="Hours Today" value={`${hoursToday.toFixed(1)}h`} icon="⏱️" accentColor="orange" loading={isLoading} />
      </div>

      {/* Manage Staff & Schedules */}
      <SectionCard>
        <button
          type="button"
          onClick={() => setShowManage((v) => !v)}
          className="text-sm font-semibold text-orange hover:text-orange-dark transition-colors"
        >
          Manage Staff &amp; Schedules {showManage ? '▴' : '▾'}
        </button>
        {showManage && <ManagePanel schedules={schedules} />}
      </SectionCard>

      {/* Clock grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : employees.length === 0 ? (
        <SectionCard>
          <EmptyState icon="⏰" message="No employees yet — add staff above to start clocking time." />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => {
            const sched = schedById.get(emp.id)
            const ov = sched?.today_override ?? null
            const effStart = ov?.shift_start ?? emp.shift_start
            const effEnd = ov?.shift_end ?? emp.shift_end
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
                <h3 className="font-display text-lg font-bold text-brand-black leading-tight mb-1">{emp.name}</h3>

                {emp.is_clocked_in ? (
                  <div className="mb-4">
                    <div className={cn('text-2xl font-bold', longShift ? 'text-orange' : 'text-green')}>
                      {longShift && '⚠ '}{formatHM(elapsed)}
                      {longShift && <span className="text-xs font-semibold ml-1">long shift</span>}
                    </div>
                    {emp.clocked_in_at && (
                      <p className="text-xs text-gray-400 mt-0.5">Clocked in at {formatTime(emp.clocked_in_at)}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      {emp.clock_in_status && <StatusPill status={emp.clock_in_status} />}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Expected out at {fmtClock(effEnd)}</p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-xs text-gray-400">Schedule: {fmtClock(emp.shift_start)} – {fmtClock(emp.shift_end)}</p>
                    {ov && (
                      <p className="text-xs text-orange font-semibold mt-0.5">Today: {fmtClock(effStart)} – {fmtClock(effEnd)}</p>
                    )}
                    {emp.hours_today > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">Worked {formatHM(emp.hours_today)} earlier</p>
                    )}
                  </div>
                )}

                {isConfirming ? (
                  <div className="rounded-[10px] bg-white border border-gray-200 p-3">
                    {confirm?.type === 'in' ? (
                      <p className="text-sm font-semibold text-brand-black mb-2">
                        Clock in {emp.name}? <span className="font-normal text-gray-400">Scheduled {fmtClock(effStart)} – {fmtClock(effEnd)}</span>
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-brand-black mb-2">
                        Clock out {emp.name}? <span className="font-normal text-gray-400">Been in for {formatHM(elapsed)} — {STATUS_STYLE[predictStatus(new Date(), effEnd, emp.buffer_minutes ?? 30)].label}</span>
                      </p>
                    )}
                    <div className="flex gap-2">
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

// ── Manage Staff & Schedules panel ──────────────────────────────────────────

function ManagePanel({ schedules }: { schedules: ScheduleRow[] }) {
  const addEmp = useAddEmployee()
  const updateEmp = useUpdateEmployee()
  const updateSched = useUpdateEmployeeSchedule()
  const createOverride = useCreateScheduleOverride()
  const deleteOverride = useDeleteScheduleOverride()
  const { data: schedData } = useEmployeeSchedules()
  const overrideList = schedData?.overrides ?? []

  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [eStart, setEStart] = useState('09:00')
  const [eEnd, setEEnd] = useState('16:00')
  const [eBuffer, setEBuffer] = useState(30)
  const [confirmDeactivate, setConfirmDeactivate] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const { data: allEmpData } = useTimeClockEmployees(true)
  const inactiveEmployees = (allEmpData?.employees ?? []).filter((e) => !e.is_active)

  async function restore(id: number) {
    try {
      await updateEmp.mutateAsync({ id, data: { is_active: true } })
      toast.success('Employee restored')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to restore')
    }
  }

  // Override form
  const [showOverrideForm, setShowOverrideForm] = useState(false)
  const [ovDate, setOvDate] = useState(getToday())
  const [ovApplyTo, setOvApplyTo] = useState<string>('all')
  const [ovStart, setOvStart] = useState('09:00')
  const [ovEnd, setOvEnd] = useState('16:00')
  const [ovBuffer, setOvBuffer] = useState(30)
  const [ovNote, setOvNote] = useState('')

  const inputCls =
    'border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-3 py-2 outline-none font-body text-sm bg-white'

  async function handleAdd() {
    const name = newName.trim()
    if (name.length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    try {
      await addEmp.mutateAsync({ name, shift_start: '09:00', shift_end: '16:00', buffer_minutes: 30 })
      setNewName('')
      toast.success(`${name} added`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add employee')
    }
  }

  function startEdit(s: ScheduleRow) {
    setEditId(s.employee_id)
    setEStart(s.shift_start)
    setEEnd(s.shift_end)
    setEBuffer(s.buffer_minutes)
  }

  async function saveSchedule(employeeId: number) {
    try {
      await updateSched.mutateAsync({ employeeId, data: { shift_start: eStart, shift_end: eEnd, buffer_minutes: eBuffer } })
      setEditId(null)
      toast.success('Schedule saved')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save schedule')
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

  async function submitOverride() {
    try {
      await createOverride.mutateAsync({
        employee_id: ovApplyTo === 'all' ? null : Number(ovApplyTo),
        override_date: ovDate,
        shift_start: ovStart,
        shift_end: ovEnd,
        buffer_minutes: ovBuffer,
        override_for_all: ovApplyTo === 'all',
        note: ovNote || undefined,
      })
      setShowOverrideForm(false)
      setOvNote('')
      toast.success('Override added')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add override')
    }
  }

  async function removeOverride(id: number) {
    try {
      await deleteOverride.mutateAsync(id)
      toast.success('Override removed')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove override')
    }
  }

  const nameFor = (id?: number | null) =>
    id == null ? 'All Employees' : schedules.find((s) => s.employee_id === id)?.name ?? `#${id}`

  return (
    <div className="mt-4 space-y-6">
      {/* A — Add employee */}
      <div>
        <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Add Employee</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Employee Name"
            className={cn(inputCls, 'flex-1')}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newName.trim() || addEmp.isPending}
            className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2 text-sm transition-colors disabled:opacity-40"
          >
            {addEmp.isPending ? 'Adding…' : 'Add Employee'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Default schedule: 9:00 AM – 4:00 PM, 30 min buffer</p>
      </div>

      {/* B — Employee list with schedule */}
      <div>
        <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Employee Schedules</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Name', 'Schedule', 'Buffer', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <Fragment key={s.employee_id}>
                  <tr className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-brand-black">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtClock(s.shift_start)} – {fmtClock(s.shift_end)}</td>
                    <td className="px-4 py-3 text-gray-600">{s.buffer_minutes} min</td>
                    <td className="px-4 py-3">
                      {confirmDeactivate === s.employee_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red font-semibold">Deactivate?</span>
                          <button type="button" onClick={() => deactivate(s.employee_id)} className="text-xs font-bold text-white bg-red px-2 py-1 rounded-[6px]">Yes</button>
                          <button type="button" onClick={() => setConfirmDeactivate(null)} className="text-xs font-semibold text-gray-400">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => (editId === s.employee_id ? setEditId(null) : startEdit(s))} className="text-gray-300 hover:text-orange transition-colors" aria-label="Edit schedule">
                            <Pencil size={15} />
                          </button>
                          <button type="button" onClick={() => setConfirmDeactivate(s.employee_id)} className="text-gray-300 hover:text-red transition-colors" aria-label="Deactivate">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {editId === s.employee_id && (
                    <tr className="bg-gray-50/70 border-t border-gray-100">
                      <td colSpan={4} className="px-4 py-4">
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Shift Start</label>
                            <input type="time" value={eStart} onChange={(e) => setEStart(e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Shift End</label>
                            <input type="time" value={eEnd} onChange={(e) => setEEnd(e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Buffer (min)</label>
                            <input type="number" min={0} max={60} value={eBuffer} onChange={(e) => setEBuffer(Number(e.target.value))} className={cn(inputCls, 'w-24')} />
                          </div>
                          <button type="button" onClick={() => saveSchedule(s.employee_id)} disabled={updateSched.isPending} className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2 text-sm transition-colors disabled:opacity-40">
                            {updateSched.isPending ? 'Saving…' : 'Save Permanently'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {schedules.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-3 text-xs text-gray-400">No active employees.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setShowInactive((v) => !v)} className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors mt-3">
          {showInactive ? 'Hide inactive' : 'Show inactive'}
        </button>
        {showInactive && (
          <div className="mt-3 space-y-2">
            {inactiveEmployees.length === 0 ? (
              <p className="text-xs text-gray-400">No inactive employees.</p>
            ) : (
              inactiveEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-[10px] opacity-70">
                  <span className="flex-1 text-sm text-gray-400 line-through">{emp.name}</span>
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

      {/* C — Schedule overrides */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Today's &amp; Upcoming Overrides</h3>
          <button type="button" onClick={() => setShowOverrideForm((v) => !v)} className="inline-flex items-center gap-1 text-xs font-semibold text-orange hover:text-orange-dark transition-colors">
            <Plus size={14} /> Add Override
          </button>
        </div>

        {showOverrideForm && (
          <div className="bg-gray-50 rounded-[10px] p-4 mb-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Date</label>
              <input type="date" min={getToday()} value={ovDate} onChange={(e) => setOvDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Apply To</label>
              <select value={ovApplyTo} onChange={(e) => setOvApplyTo(e.target.value)} className={inputCls}>
                <option value="all">All Employees</option>
                {schedules.map((s) => <option key={s.employee_id} value={s.employee_id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Start</label>
              <input type="time" value={ovStart} onChange={(e) => setOvStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">End</label>
              <input type="time" value={ovEnd} onChange={(e) => setOvEnd(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Buffer</label>
              <input type="number" min={0} max={60} value={ovBuffer} onChange={(e) => setOvBuffer(Number(e.target.value))} className={cn(inputCls, 'w-20')} />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Note</label>
              <input type="text" value={ovNote} onChange={(e) => setOvNote(e.target.value)} placeholder="e.g. Holiday staffing" className={cn(inputCls, 'w-full')} />
            </div>
            <button type="button" onClick={submitOverride} disabled={createOverride.isPending} className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2 text-sm transition-colors disabled:opacity-40">
              {createOverride.isPending ? 'Saving…' : 'Submit'}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {overrideList.length === 0 ? (
            <p className="text-xs text-gray-400">No upcoming overrides.</p>
          ) : (
            overrideList.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-[10px]">
                <span className="text-sm font-semibold text-brand-black">{format(parseISO(o.override_date), 'EEE, MMM d')}</span>
                <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', o.override_for_all ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                  {o.override_for_all ? 'All Employees' : nameFor(o.employee_id)}
                </span>
                <span className="text-sm text-gray-600">{fmtClock(o.shift_start)} – {fmtClock(o.shift_end)}</span>
                {o.note && <span className="text-xs text-gray-400 italic">{o.note}</span>}
                <button type="button" onClick={() => removeOverride(o.id)} className="ml-auto text-gray-300 hover:text-red transition-colors" aria-label="Delete override">
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Time Logs
// ════════════════════════════════════════════════════════════════════════════

type DerivedStatus = 'active' | 'completed' | 'incomplete'

function derivedStatus(entry: TimeClockEntry, todayStr: string): DerivedStatus {
  if (!entry.clock_out_at) return entry.shift_date === todayStr ? 'active' : 'incomplete'
  return 'completed'
}

function PayWeekNav({
  start,
  offset,
  onPrev,
  onNext,
}: {
  start: Date
  offset: number
  onPrev: () => void
  onNext: () => void
}) {
  const end = addDays(start, 6)
  const label = `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={onPrev} className="px-2 py-1 rounded hover:bg-gray-100 transition-colors text-gray-500">← Prev</button>
      <span className="text-sm font-semibold text-brand-black whitespace-nowrap">
        {label}{offset === 0 && <span className="text-orange"> (Current)</span>}
      </span>
      <button type="button" onClick={onNext} disabled={offset >= 0} className="px-2 py-1 rounded hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30">Next →</button>
    </div>
  )
}

function LogsTab() {
  const todayStr = getToday()
  const [weekOffset, setWeekOffset] = useState(0)
  const [employeeId, setEmployeeId] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DerivedStatus>('all')

  const weekStart = addDays(payWeekStart(new Date()), weekOffset * 7)
  const weekEnd = addDays(weekStart, 6)

  const { data: empData } = useTimeClockEmployees()
  const { data, isLoading } = useTimeEntries({
    employee_id: employeeId ? Number(employeeId) : undefined,
    date_from: ymd(weekStart),
    date_to: ymd(weekEnd),
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
  if (statusFilter !== 'all') entries = entries.filter((e) => derivedStatus(e, todayStr) === statusFilter)
  const sorted = [...entries].sort((a, b) => {
    const ai = derivedStatus(a, todayStr) === 'incomplete'
    const bi = derivedStatus(b, todayStr) === 'incomplete'
    if (ai && !bi) return -1
    if (bi && !ai) return 1
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
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Pay Week</label>
            <PayWeekNav start={weekStart} offset={weekOffset} onPrev={() => setWeekOffset((o) => o - 1)} onNext={() => setWeekOffset((o) => Math.min(0, o + 1))} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
              <option value="">All Employees</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | DerivedStatus)} className={inputCls}>
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
          <EmptyState icon="🗂️" message="No entries for this pay week." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'In Status', 'Out Status', 'Edit'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((entry) => {
                  const ds = derivedStatus(entry, todayStr)
                  const overEight = (entry.total_hours ?? 0) > 8
                  const isEditing = editId === entry.id
                  return (
                    <Fragment key={entry.id}>
                      <tr className={cn('border-t border-gray-100', ds === 'incomplete' && 'bg-red-light/40')}>
                        <td className="px-4 py-3 font-semibold text-brand-black whitespace-nowrap">{entry.employee_name ?? '—'}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDateLabel(entry.shift_date)}
                          {entry.is_night_shift && <Moon size={13} className="inline ml-1 text-indigo-500" />}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatTime(entry.clock_in_at)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{entry.clock_out_at ? formatTime(entry.clock_out_at) : '—'}</td>
                        <td className={cn('px-4 py-3 font-semibold whitespace-nowrap', overEight ? 'text-red' : 'text-green')}>
                          {entry.total_hours != null ? formatHM(entry.total_hours) : '—'}
                        </td>
                        <td className="px-4 py-3"><StatusPill status={entry.clock_in_status} /></td>
                        <td className="px-4 py-3"><StatusPill status={ds === 'active' ? 'pending' : entry.clock_out_status} /></td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => (isEditing ? setEditId(null) : startEdit(entry))} className="text-gray-300 hover:text-orange transition-colors" aria-label="Edit entry">
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
                              <button type="button" onClick={() => saveEdit(entry.id)} disabled={editEntry.isPending} className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2 text-sm transition-colors disabled:opacity-40">
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

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — Reports
// ════════════════════════════════════════════════════════════════════════════

function ReportsTab() {
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = addDays(payWeekStart(new Date()), weekOffset * 7)
  const weekEnd = addDays(weekStart, 6)
  const fromStr = ymd(weekStart)
  const toStr = ymd(weekEnd)

  const { data, isLoading } = useTimeClockAnalytics(fromStr, toStr)
  const { data: entriesData } = useTimeEntries({ date_from: fromStr, date_to: toStr, limit: 2000 })

  // pay week day columns (Thu .. Wed)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  if (isLoading) return <LoadingSpinner />
  if (!data) return null

  const totalHours = data.by_employee.reduce((s, e) => s + e.total_hours, 0)
  const activeEmployees = data.by_employee.length
  const overtimeDays = data.by_employee.reduce((s, e) => s + e.overtime_days, 0)
  const avgHours = activeEmployees ? totalHours / activeEmployees : 0

  const empChart = data.by_employee.map((e) => ({ name: e.employee_name, hours: e.total_hours }))

  // per-employee per-day hours map
  function dayHours(emp: EmpAnalytics, dateStr: string): number {
    return emp.entries_by_date.filter((r) => r.date === dateStr).reduce((s, r) => s + r.hours, 0)
  }

  // punctuality counts
  function punctuality(emp: EmpAnalytics) {
    const c = { on_time: 0, late: 0, early: 0 }
    for (const r of emp.entries_by_date) {
      if (r.clock_in_status === 'on_time') c.on_time++
      else if (r.clock_in_status === 'late') c.late++
      else if (r.clock_in_status === 'early') c.early++
    }
    return c
  }

  function exportCSV() {
    const header = ['Employee', 'Date', 'Clock In', 'Clock Out', 'Hours', 'In Status', 'Out Status']
    const rows = (entriesData?.entries ?? []).map((e) =>
      [
        csvCell(e.employee_name),
        csvCell(e.shift_date),
        csvCell(formatTime(e.clock_in_at)),
        csvCell(e.clock_out_at ? formatTime(e.clock_out_at) : ''),
        csvCell(e.total_hours != null ? e.total_hours.toFixed(2) : ''),
        csvCell(e.clock_in_status),
        csvCell(e.clock_out_status),
      ].join(','),
    )
    downloadCSV([header.map(csvCell).join(','), ...rows].join('\n'), `pay_week_${fromStr}.csv`)
  }

  return (
    <div className="space-y-5">
      {/* Pay week nav */}
      <SectionCard>
        <div className="flex items-center justify-center">
          <PayWeekNav start={weekStart} offset={weekOffset} onPrev={() => setWeekOffset((o) => o - 1)} onNext={() => setWeekOffset((o) => Math.min(0, o + 1))} />
        </div>
      </SectionCard>

      {/* Row 1 — stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Total Hours This Week" value={`${totalHours.toFixed(1)}h`} icon="⏱️" accentColor="orange" />
        <StatCard label="Active Employees" value={activeEmployees} icon="👥" accentColor="yellow" />
        {overtimeDays > 0 && <StatCard label="Overtime Days Flagged" value={overtimeDays} icon="⚠️" accentColor="red" />}
        <StatCard label="Avg Hours / Employee" value={`${avgHours.toFixed(1)}h`} icon="📊" accentColor="green" />
      </div>

      {/* Row 2 — hours by employee */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Hours by Employee</h2>
        {empChart.length === 0 ? (
          <p className="text-sm text-gray-400">No data for this pay week.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={empChart} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, 'Hours']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <ReferenceLine y={40} stroke="#dc2626" strokeDasharray="4 4" label={{ value: '40h', fontSize: 11, fill: '#dc2626' }} />
              <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                {empChart.map((d, i) => <Cell key={i} fill={d.hours > 40 ? '#dc2626' : '#F47920'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Row 3 — week-at-a-glance grid */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Daily Hours — Week at a Glance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Employee</th>
                {weekDays.map((d) => (
                  <th key={d.toISOString()} className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                    {format(d, 'EEE')}<br /><span className="text-[10px] font-normal">{format(d, 'M/d')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.by_employee.map((emp) => (
                <tr key={emp.employee_id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-brand-black whitespace-nowrap">{emp.employee_name}</td>
                  {weekDays.map((d) => {
                    const h = dayHours(emp, ymd(d))
                    const cls = h === 0 ? 'text-gray-300' : h > 8 ? 'text-red font-bold' : 'text-green font-semibold'
                    return (
                      <td key={d.toISOString()} className={cn('text-center px-3 py-3', cls)}>
                        {h === 0 ? '—' : formatHM(h)}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {data.by_employee.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-3 text-xs text-gray-400">No data for this pay week.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Row 4 — punctuality */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Clock-in Punctuality</h2>
        {data.by_employee.length === 0 ? (
          <p className="text-sm text-gray-400">No data for this pay week.</p>
        ) : (
          <div className="space-y-2">
            {data.by_employee.map((emp) => {
              const c = punctuality(emp)
              return (
                <div key={emp.employee_id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-[10px]">
                  <span className="flex-1 text-sm font-semibold text-brand-black">{emp.employee_name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-light text-green">{c.on_time} on time</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-light text-orange-dark">{c.late} late</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{c.early} early</span>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Row 5 — overtime alerts */}
      {data.overtime_alerts.length > 0 ? (
        <div className="bg-white rounded-card shadow-sm border border-gray-100 border-l-4 border-l-red p-6">
          <h2 className="font-display text-base font-semibold mb-4 text-red">⚠ Overtime Alerts</h2>
          <div className="space-y-2">
            {data.overtime_alerts.map((a, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-3 py-2.5 bg-red-light/40 rounded-[10px]">
                <span className="flex-1 text-sm font-semibold text-brand-black">{a.employee_name}</span>
                <span className="text-xs text-gray-500 capitalize">{a.type}</span>
                <span className="text-sm text-gray-600">{a.hours.toFixed(1)}h</span>
                <span className="text-sm font-bold text-red">+{a.overtime_hours.toFixed(1)}h over</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <SectionCard>
          <p className="text-sm font-semibold text-green">✓ No overtime this pay week</p>
        </SectionCard>
      )}

      {/* Row 6 — export */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-4">Export</h2>
        <button type="button" onClick={exportCSV} className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-5 py-2.5 text-sm transition-colors">
          Export Pay Week CSV
        </button>
      </SectionCard>
    </div>
  )
}
