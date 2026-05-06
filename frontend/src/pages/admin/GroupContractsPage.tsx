import React, { useState, useEffect } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  useGroupContracts,
  useGroupContract,
  useGroupStats,
  useCreateGroup,
  useUpdateGroup,
  useAddGroupNote,
} from '../../hooks/useGroups'
import { cn } from '../../lib/utils'
import type {
  GroupContract,
  CreateGroupContractRequest,
  UpdateGroupContractRequest,
} from '../../types'

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-50 text-blue-600',
  confirmed: 'bg-green-light text-green',
  checked_in: 'bg-orange/10 text-orange',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red/10 text-red',
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_BORDER: Record<string, string> = {
  inquiry: 'border-l-blue-400',
  confirmed: 'border-l-green',
  checked_in: 'border-l-orange',
  completed: 'border-l-gray-300',
  cancelled: 'border-l-red',
}

function nightsCount(checkIn: string, checkOut: string): number {
  return Math.max(
    0,
    Math.floor(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
    )
  )
}

function DaysPill({ days }: { days?: number }) {
  if (days === undefined) return null
  if (days < 0)
    return (
      <span className="text-[10px] font-bold bg-red/10 text-red px-2 py-0.5 rounded-full">
        OVERDUE
      </span>
    )
  if (days === 0)
    return (
      <span className="text-[10px] font-bold bg-red/10 text-red px-2 py-0.5 rounded-full">
        TODAY
      </span>
    )
  if (days <= 7)
    return (
      <span className="text-[10px] font-bold bg-orange/10 text-orange px-2 py-0.5 rounded-full">
        In {days}d
      </span>
    )
  return (
    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
      In {days}d
    </span>
  )
}

// ─── ContractCard ─────────────────────────────────────────────────────────────

function ContractCard({
  contract,
  isExpanded,
  onToggle,
}: {
  contract: GroupContract
  isExpanded: boolean
  onToggle: () => void
}) {
  const { data: detail, isLoading: loadingDetail } = useGroupContract(
    isExpanded ? contract.id : null
  )
  const updateGroup = useUpdateGroup()
  const addNote = useAddGroupNote()

  const [internalNotes, setInternalNotes] = useState(
    contract.internal_notes ?? ''
  )
  const [noteInput, setNoteInput] = useState('')
  const [statusSelect, setStatusSelect] = useState<string>(contract.status)

  useEffect(() => {
    setInternalNotes(contract.internal_notes ?? '')
  }, [contract.internal_notes])

  useEffect(() => {
    setStatusSelect(contract.status)
  }, [contract.status])

  async function handleNotesBlur() {
    const trimmed = internalNotes.trim()
    if (trimmed === (contract.internal_notes ?? '').trim()) return
    try {
      await updateGroup.mutateAsync({
        id: contract.id,
        data: { internal_notes: trimmed },
      })
      toast.success('Notes saved')
    } catch {
      toast.error('Save failed')
    }
  }

  async function handleAddNote() {
    const n = noteInput.trim()
    if (n.length < 5) return
    try {
      await addNote.mutateAsync({ id: contract.id, note: n })
      setNoteInput('')
    } catch {
      toast.error('Failed to add note')
    }
  }

  async function handleStatusUpdate() {
    if (statusSelect === contract.status) return
    try {
      await updateGroup.mutateAsync({
        id: contract.id,
        data: { status: statusSelect },
      })
      toast.success('Status updated')
    } catch {
      toast.error('Update failed')
    }
  }

  async function handleDepositToggle() {
    try {
      await updateGroup.mutateAsync({
        id: contract.id,
        data: { deposit_paid: !contract.deposit_paid },
      })
    } catch {
      toast.error('Update failed')
    }
  }

  const activityLog = detail?.contract?.activity_log ?? []
  const borderColor = STATUS_BORDER[contract.status] ?? 'border-l-gray-200'
  const nights = nightsCount(contract.check_in_date, contract.check_out_date)
  const rateFields: Array<{
    key: keyof UpdateGroupContractRequest & ('room_rate' | 'triple_rate' | 'quad_rate')
    label: string
    value: number | undefined
  }> = [
    { key: 'room_rate', label: 'Std Rate', value: contract.room_rate },
    { key: 'triple_rate', label: 'Triple Rate', value: contract.triple_rate },
    { key: 'quad_rate', label: 'Quad Rate', value: contract.quad_rate },
  ]

  return (
    <div
      className={`bg-white rounded-card border border-gray-100 border-l-4 shadow-sm ${borderColor}`}
    >
      {/* Always-visible header */}
      <div className="p-4 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-base font-bold text-brand-black leading-tight">
            {contract.group_name}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[contract.status]}`}
            >
              {STATUS_LABELS[contract.status]}
            </span>
            <DaysPill days={contract.days_until_checkin} />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-1.5">
          <span>
            {contract.contact_name} · {contract.contact_phone}
          </span>
          <span>
            {contract.room_count} {contract.room_type} room
            {contract.room_count !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>{contract.check_in_date}</span>
          <span>→</span>
          <span>{contract.check_out_date}</span>
          <span className="text-gray-200">·</span>
          <span>
            {nights} night{nights !== 1 ? 's' : ''}
          </span>
        </div>
        {contract.cutoff_alert && (
          <p className="text-xs font-semibold text-red mb-2">
            ⚠ Cutoff {contract.cutoff_date} — confirm reservations now
          </p>
        )}
        <div className="flex items-center justify-between">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              contract.deposit_paid
                ? 'bg-green-light text-green'
                : 'bg-yellow-hotel/20 text-yellow-700'
            }`}
          >
            {contract.deposit_paid ? '✓ Deposit Paid' : 'Deposit Pending'}
          </span>
          <ChevronDown
            size={15}
            className={`text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/40">
          {loadingDetail ? (
            <LoadingSpinner />
          ) : (
            <>
              {/* Internal notes */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                  Internal Notes (auto-saved)
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  rows={2}
                  placeholder="Internal notes visible only to staff…"
                  className="w-full border border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20 rounded-[10px] px-3 py-2 text-sm outline-none resize-none bg-white"
                />
              </div>

              {/* Guest special notes */}
              {contract.special_notes && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                    Guest Notes
                  </label>
                  <p className="text-sm text-gray-600 bg-white border border-gray-100 rounded-[10px] px-3 py-2">
                    {contract.special_notes}
                  </p>
                </div>
              )}

              {/* Rates */}
              <div className="grid grid-cols-3 gap-3">
                {rateFields.map(({ key, label, value }) => (
                  <div key={key}>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      defaultValue={value ?? ''}
                      onBlur={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v))
                          updateGroup
                            .mutateAsync({ id: contract.id, data: { [key]: v } })
                            .catch(() => {})
                      }}
                      placeholder="—"
                      className="w-full border border-gray-200 focus:border-orange rounded-[10px] px-3 py-2 text-sm outline-none bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* Status + deposit */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                    Status
                  </label>
                  <select
                    value={statusSelect}
                    onChange={(e) => setStatusSelect(e.target.value)}
                    className="w-full border border-gray-200 focus:border-orange rounded-[10px] px-3 py-2.5 text-sm outline-none bg-white"
                  >
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleStatusUpdate}
                  disabled={
                    statusSelect === contract.status || updateGroup.isPending
                  }
                  className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2.5 text-sm transition-colors disabled:opacity-40"
                >
                  Update
                </button>
                <button
                  onClick={handleDepositToggle}
                  disabled={updateGroup.isPending}
                  className={`font-semibold rounded-[10px] px-4 py-2.5 text-sm transition-colors ${
                    contract.deposit_paid
                      ? 'bg-green-light text-green hover:bg-green/20'
                      : 'bg-yellow-hotel/20 text-yellow-700 hover:bg-yellow-hotel/30'
                  }`}
                >
                  {contract.deposit_paid ? '✓ Deposit Paid' : 'Mark Deposit Paid'}
                </button>
              </div>

              {/* Key dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Booked', value: contract.created_at.slice(0, 10) },
                  { label: 'Deposit By', value: contract.deposit_by_date },
                  { label: 'Cutoff', value: contract.cutoff_date },
                  { label: 'Signed By', value: contract.signed_by_date },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                      {label}
                    </p>
                    <p className="text-sm font-semibold text-brand-black mt-0.5">
                      {value ?? '—'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Activity log */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">
                  Activity Log
                </label>
                {activityLog.length === 0 ? (
                  <p className="text-xs text-gray-400 mb-2">
                    No activity logged yet.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto mb-3">
                    {activityLog.map((log) => (
                      <div key={log.id} className="flex gap-2 text-sm">
                        <span className="text-[10px] text-gray-300 flex-shrink-0 mt-0.5 w-20">
                          {log.created_at.slice(0, 10)}
                        </span>
                        <span className="text-gray-600">{log.note}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    placeholder="Log a note (min 5 chars)…"
                    className="flex-1 border border-gray-200 focus:border-orange rounded-[10px] px-3 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={noteInput.trim().length < 5 || addNote.isPending}
                    className="bg-brand-black text-white font-semibold rounded-[10px] px-4 py-2 text-sm disabled:opacity-40 transition-colors"
                  >
                    Log
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── NewContractForm ──────────────────────────────────────────────────────────

function NewContractForm({ onClose }: { onClose: () => void }) {
  const createGroup = useCreateGroup()
  const [form, setForm] = useState({
    group_name: '',
    contact_name: '',
    contact_phone: '',
    company_address: '',
    check_in_date: '',
    check_out_date: '',
    room_count: '10',
    room_type: 'standard',
    room_rate: '',
    deposit_by_date: '',
    cutoff_date: '',
    special_notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!form.group_name.trim()) errs.group_name = 'Required'
    if (!form.contact_name.trim()) errs.contact_name = 'Required'
    if (!form.contact_phone.trim()) errs.contact_phone = 'Required'
    if (!form.check_in_date) errs.check_in_date = 'Required'
    if (!form.check_out_date) errs.check_out_date = 'Required'
    if (!form.room_count || parseInt(form.room_count) < 1)
      errs.room_count = 'Min 1'
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    try {
      await createGroup.mutateAsync({
        group_name: form.group_name.trim(),
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        company_address: form.company_address.trim() || undefined,
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        room_count: parseInt(form.room_count),
        room_type: form.room_type,
        room_rate: form.room_rate ? parseFloat(form.room_rate) : undefined,
        deposit_by_date: form.deposit_by_date || undefined,
        cutoff_date: form.cutoff_date || undefined,
        special_notes: form.special_notes.trim() || undefined,
        source: 'admin',
      } as CreateGroupContractRequest)
      toast.success('Contract created')
      onClose()
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create contract'
      )
    }
  }

  const inputCls = (field: string) =>
    cn(
      'w-full border rounded-[10px] px-4 py-2.5 outline-none font-body text-sm transition-colors',
      errors[field]
        ? 'border-red focus:border-red focus:ring-1 focus:ring-red/20'
        : 'border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20'
    )

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-100 rounded-card bg-gray-50/40 p-5 mb-5 space-y-4"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-base font-semibold">
          New Group Contract
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
          Group / Company Name *
        </label>
        <input
          className={inputCls('group_name')}
          value={form.group_name}
          onChange={(e) => set('group_name', e.target.value)}
          placeholder="e.g. Acme Corp"
        />
        {errors.group_name && (
          <p className="text-xs text-red mt-1">{errors.group_name}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Contact Name *
          </label>
          <input
            className={inputCls('contact_name')}
            value={form.contact_name}
            onChange={(e) => set('contact_name', e.target.value)}
            placeholder="Full name"
          />
          {errors.contact_name && (
            <p className="text-xs text-red mt-1">{errors.contact_name}</p>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Phone *
          </label>
          <input
            className={inputCls('contact_phone')}
            value={form.contact_phone}
            onChange={(e) => set('contact_phone', e.target.value)}
            placeholder="(555) 000-0000"
          />
          {errors.contact_phone && (
            <p className="text-xs text-red mt-1">{errors.contact_phone}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
          Company Address
        </label>
        <input
          className={inputCls('company_address')}
          value={form.company_address}
          onChange={(e) => set('company_address', e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Check-in *
          </label>
          <input
            type="date"
            className={inputCls('check_in_date')}
            value={form.check_in_date}
            onChange={(e) => set('check_in_date', e.target.value)}
          />
          {errors.check_in_date && (
            <p className="text-xs text-red mt-1">{errors.check_in_date}</p>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Check-out *
          </label>
          <input
            type="date"
            className={inputCls('check_out_date')}
            value={form.check_out_date}
            onChange={(e) => set('check_out_date', e.target.value)}
          />
          {errors.check_out_date && (
            <p className="text-xs text-red mt-1">{errors.check_out_date}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Room Count *
          </label>
          <input
            type="number"
            min="1"
            className={inputCls('room_count')}
            value={form.room_count}
            onChange={(e) => set('room_count', e.target.value)}
          />
          {errors.room_count && (
            <p className="text-xs text-red mt-1">{errors.room_count}</p>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Room Type
          </label>
          <select
            className={inputCls('room_type')}
            value={form.room_type}
            onChange={(e) => set('room_type', e.target.value)}
          >
            <option value="standard">Standard</option>
            <option value="triple">Triple</option>
            <option value="quad">Quad</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Rate / Night
          </label>
          <input
            type="number"
            className={inputCls('room_rate')}
            value={form.room_rate}
            onChange={(e) => set('room_rate', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Deposit By
          </label>
          <input
            type="date"
            className={inputCls('deposit_by_date')}
            value={form.deposit_by_date}
            onChange={(e) => set('deposit_by_date', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
            Cutoff Date
          </label>
          <input
            type="date"
            className={inputCls('cutoff_date')}
            value={form.cutoff_date}
            onChange={(e) => set('cutoff_date', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
          Special Notes
        </label>
        <textarea
          rows={2}
          className={inputCls('special_notes')}
          value={form.special_notes}
          onChange={(e) => set('special_notes', e.target.value)}
          placeholder="Optional notes for this booking…"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={createGroup.isPending}
          className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-6 py-2.5 text-sm transition-colors disabled:opacity-40"
        >
          {createGroup.isPending ? 'Adding…' : 'Add Contract'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Pipeline', 'History', 'Analysis']

export default function GroupContractsPage() {
  const [tab, setTab] = useState(TABS[0])
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [historyExpandedId, setHistoryExpandedId] = useState<number | null>(null)

  const { data: contractsData, isLoading } = useGroupContracts()
  const { data: stats, isLoading: loadingStats } = useGroupStats()
  const { data: historyDetail } = useGroupContract(historyExpandedId)

  const all = contractsData?.contracts ?? []
  const ACTIVE = ['inquiry', 'confirmed', 'checked_in']
  const activeContracts = all.filter((c) => ACTIVE.includes(c.status))
  const historyContracts = all.filter((c) =>
    ['completed', 'cancelled'].includes(c.status)
  )

  const pipeline = (
    statusFilter === 'all'
      ? activeContracts
      : activeContracts.filter((c) => c.status === statusFilter)
  ).sort(
    (a, b) => (a.days_until_checkin ?? 999) - (b.days_until_checkin ?? 999)
  )

  const filteredHistory = historyContracts.filter(
    (c) =>
      !historySearch ||
      c.group_name.toLowerCase().includes(historySearch.toLowerCase()) ||
      c.contact_name.toLowerCase().includes(historySearch.toLowerCase())
  )

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function toggleHistoryExpand(id: number) {
    setHistoryExpandedId((prev) => (prev === id ? null : id))
  }

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'inquiry', label: 'Inquiry' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'checked_in', label: 'Checked In' },
  ]

  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />

      {/* ── TAB 1: PIPELINE ── */}
      {tab === 'Pipeline' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold">
              Active Group Bookings
            </h2>
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2 text-sm transition-colors"
            >
              <Plus size={15} />
              New Contract
            </button>
          </div>

          {showNewForm && (
            <NewContractForm onClose={() => setShowNewForm(false)} />
          )}

          <div className="flex gap-2 mb-4 flex-wrap">
            {filterButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => setStatusFilter(btn.key)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
                  statusFilter === btn.key
                    ? 'bg-orange text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : pipeline.length === 0 ? (
            <EmptyState
              icon="🏨"
              message="No active group bookings"
              subtext={
                statusFilter !== 'all'
                  ? 'Try clearing the status filter.'
                  : 'Inquiries submitted via the public form will appear here.'
              }
            />
          ) : (
            <div className="space-y-3">
              {pipeline.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  isExpanded={expandedId === contract.id}
                  onToggle={() => toggleExpand(contract.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: HISTORY ── */}
      {tab === 'History' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search by group name or contact…"
              className="w-full max-w-sm border border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20 rounded-[10px] px-4 py-2.5 text-sm outline-none"
            />
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              icon="📋"
              message="No completed or cancelled contracts"
              subtext="Completed and cancelled bookings appear here."
            />
          ) : (
            <SectionCard>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {[
                        'Group Name',
                        'Contact',
                        'Check-in',
                        'Check-out',
                        'Rooms',
                        'Status',
                        'Source',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr
                          className="border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleHistoryExpand(c.id)}
                        >
                          <td className="px-4 py-3 font-semibold text-brand-black">
                            {c.group_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.contact_name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.check_in_date}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.check_out_date}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {c.room_count}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}
                            >
                              {c.status === 'completed'
                                ? '✓ Completed'
                                : '✗ Cancelled'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              {c.source === 'public_form'
                                ? 'Public Form'
                                : 'Admin'}
                            </span>
                          </td>
                        </tr>
                        {historyExpandedId === c.id && (
                          <tr className="border-t border-gray-100 bg-gray-50/60">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-semibold">
                                      Room Type
                                    </p>
                                    <p className="font-semibold mt-0.5 capitalize">
                                      {c.room_type}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-semibold">
                                      Phone
                                    </p>
                                    <p className="font-semibold mt-0.5">
                                      {c.contact_phone}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-semibold">
                                      Deposit
                                    </p>
                                    <p
                                      className={`font-semibold mt-0.5 ${
                                        c.deposit_paid
                                          ? 'text-green'
                                          : 'text-gray-500'
                                      }`}
                                    >
                                      {c.deposit_paid ? 'Paid' : 'Unpaid'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] uppercase text-gray-400 font-semibold">
                                      Created
                                    </p>
                                    <p className="font-semibold mt-0.5">
                                      {c.created_at.slice(0, 10)}
                                    </p>
                                  </div>
                                </div>
                                {c.special_notes && (
                                  <p className="text-sm text-gray-600 bg-white border border-gray-100 rounded-[10px] px-3 py-2">
                                    {c.special_notes}
                                  </p>
                                )}
                                {historyDetail?.contract?.activity_log &&
                                  historyDetail.contract.activity_log.length >
                                    0 && (
                                    <div>
                                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">
                                        Activity Log
                                      </p>
                                      <div className="space-y-1">
                                        {historyDetail.contract.activity_log.map(
                                          (log) => (
                                            <div
                                              key={log.id}
                                              className="flex gap-2 text-sm"
                                            >
                                              <span className="text-[10px] text-gray-300 w-20 flex-shrink-0 mt-0.5">
                                                {log.created_at.slice(0, 10)}
                                              </span>
                                              <span className="text-gray-600">
                                                {log.note}
                                              </span>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── TAB 3: ANALYSIS ── */}
      {tab === 'Analysis' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              label="Active Bookings"
              value={stats?.total_active ?? '—'}
              icon="🏨"
              accentColor="orange"
              loading={loadingStats}
            />
            <StatCard
              label="Upcoming This Week"
              value={stats?.upcoming_this_week ?? '—'}
              icon="📅"
              accentColor="yellow"
              loading={loadingStats}
            />
            <StatCard
              label="Completed All Time"
              value={stats?.total_completed ?? '—'}
              icon="✅"
              accentColor="green"
              loading={loadingStats}
            />
            <StatCard
              label="Cutoff Alerts"
              value={stats?.cutoff_alerts ?? '—'}
              icon="⚠️"
              accentColor="red"
              loading={loadingStats}
            />
          </div>

          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-5">
              Bookings by Month
            </h2>
            {loadingStats ? (
              <LoadingSpinner />
            ) : (stats?.by_month ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={stats!.by_month}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#888' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#888' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(v) => [`${v} bookings`, 'Count']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#F47920"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>

          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-4">
              Status Breakdown
            </h2>
            {loadingStats ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-3">
                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                  const count = stats?.by_status?.[status] ?? 0
                  const total = Object.values(stats?.by_status ?? {}).reduce(
                    (a, b) => a + b,
                    0
                  )
                  const pct = total ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}
                        >
                          {label}
                        </span>
                        <span className="text-sm font-bold text-brand-black">
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-4">
              Recent Contracts
            </h2>
            {isLoading ? (
              <LoadingSpinner />
            ) : all.length === 0 ? (
              <p className="text-sm text-gray-400">No contracts yet.</p>
            ) : (
              <ul className="space-y-3">
                {[...all]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  .slice(0, 8)
                  .map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-brand-black">
                          {c.group_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {c.check_in_date} · {c.room_count} rooms
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[c.status]}`}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}
    </PageWrapper>
  )
}
