import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Plus, Star, Trash2, Check } from 'lucide-react'
import QuickChecks from '../../components/inspections/QuickChecks'
import IssueForm from '../../components/inspections/IssueForm'
import SeverityBadge from '../../components/inspections/SeverityBadge'
import {
  useInspectors,
  useStartInspection,
  useUpdateInspection,
  useSubmitInspection,
  useAddIssue,
  useAddInspector,
} from '../../hooks/useInspections'
import { cn } from '../../lib/utils'
import type { InspectionIssue } from '../../types'

const INSPECTION_TYPES = [
  { id: 'routine', label: 'Routine Check' },
  { id: 'post_checkout', label: 'Post-Checkout' },
  { id: 'post_maintenance', label: 'Post-Maintenance' },
  { id: 'deep_clean', label: 'Deep Clean' },
  { id: 'pre_vip', label: 'Pre-VIP' },
]

const CONDITIONS = [
  { id: 'excellent', emoji: '🟢', label: 'Excellent' },
  { id: 'good', emoji: '🔵', label: 'Good' },
  { id: 'fair', emoji: '🟡', label: 'Fair' },
  { id: 'poor', emoji: '🔴', label: 'Poor' },
]

const CATEGORY_EMOJIS: Record<string, string> = {
  cleanliness: '🧹', maintenance: '🔧', furniture: '🪑', plumbing: '🚿',
  electrical: '⚡', hvac: '❄️', safety: '🔒', cosmetic: '🎨',
}

interface DraftIssue {
  id: number
  category: string
  severity: string
  location_in_room?: string
  description: string
  before_photo_url?: string
}

interface InspectionDraft {
  inspection_id: number
  room_number: string
  inspector_id: number
  inspector_name: string
  inspection_type: string
  started_at: string
  step: number
  overall_cleanliness: number
  overall_condition: string
  quick_checks: Record<string, boolean>
  issues: DraftIssue[]
  general_notes: string
}

function isValidRoomNumber(room: string): boolean {
  const trimmed = room.trim()
  if (!/^\d{3}$/.test(trimmed)) return false
  const floor = parseInt(trimmed[0], 10)
  const roomNum = parseInt(trimmed.slice(1), 10)
  return floor >= 1 && floor <= 4 && roomNum >= 1 && roomNum <= 34
}

function getDraftKey(roomNumber: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `inspection_draft_${roomNumber}_${today}`
}

function findExistingDraft(): InspectionDraft | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('inspection_draft_')) {
      try {
        const value = localStorage.getItem(key)
        if (value) return JSON.parse(value) as InspectionDraft
      } catch {
        // continue
      }
    }
  }
  return null
}

export default function InspectionFormPage() {
  // Step management
  const [step, setStep] = useState(1)

  // Step 1
  const [inspectorId, setInspectorId] = useState<number | null>(null)
  const [inspectorName, setInspectorName] = useState('')
  const [showAddName, setShowAddName] = useState(false)
  const [newInspectorName, setNewInspectorName] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [inspectionType, setInspectionType] = useState('routine')

  // Step 2
  const [cleanliness, setCleanliness] = useState(0)
  const [condition, setCondition] = useState('')
  const [quickChecks, setQuickChecks] = useState<Record<string, boolean>>({})

  // Step 3
  const [issues, setIssues] = useState<DraftIssue[]>([])
  const [showIssueForm, setShowIssueForm] = useState(false)

  // Step 4
  const [generalNotes, setGeneralNotes] = useState('')

  // State
  const [inspectionId, setInspectionId] = useState<number | null>(null)
  const [showResume, setShowResume] = useState<InspectionDraft | null>(null)
  const [submitted, setSubmitted] = useState<{
    duration_minutes?: number
    issues_count: number
  } | null>(null)

  const inspectorsQuery = useInspectors()
  const startInspection = useStartInspection()
  const updateInspection = useUpdateInspection()
  const submitInspection = useSubmitInspection()
  const addIssue = useAddIssue()
  const addInspector = useAddInspector()

  const inspectors = inspectorsQuery.data?.inspectors ?? []

  // Check for existing draft on mount
  useEffect(() => {
    const draft = findExistingDraft()
    if (draft) setShowResume(draft)
  }, [])

  // Auto-save draft
  useEffect(() => {
    if (!inspectionId || !roomNumber) return
    const draft: InspectionDraft = {
      inspection_id: inspectionId,
      room_number: roomNumber,
      inspector_id: inspectorId ?? 0,
      inspector_name: inspectorName,
      inspection_type: inspectionType,
      started_at: new Date().toISOString(),
      step,
      overall_cleanliness: cleanliness,
      overall_condition: condition,
      quick_checks: quickChecks,
      issues,
      general_notes: generalNotes,
    }
    try {
      localStorage.setItem(getDraftKey(roomNumber), JSON.stringify(draft))
    } catch {
      // storage full — ignore
    }
  }, [inspectionId, roomNumber, inspectorId, inspectorName, inspectionType, step, cleanliness, condition, quickChecks, issues, generalNotes])

  function clearDraft() {
    if (roomNumber) {
      try { localStorage.removeItem(getDraftKey(roomNumber)) } catch { /* noop */ }
    }
  }

  function resumeDraft(draft: InspectionDraft) {
    setInspectionId(draft.inspection_id)
    setRoomNumber(draft.room_number)
    setInspectorId(draft.inspector_id)
    setInspectorName(draft.inspector_name)
    setInspectionType(draft.inspection_type)
    setStep(draft.step)
    setCleanliness(draft.overall_cleanliness)
    setCondition(draft.overall_condition)
    setQuickChecks(draft.quick_checks)
    setIssues(draft.issues)
    setGeneralNotes(draft.general_notes)
    setShowResume(null)
  }

  function discardDraft(draft: InspectionDraft) {
    try { localStorage.removeItem(getDraftKey(draft.room_number)) } catch { /* noop */ }
    setShowResume(null)
  }

  // ── Step 1 actions ──────────────────────────────────────────────────────────

  async function handleAddInspector() {
    const name = newInspectorName.trim()
    if (!name) return
    try {
      const result = await addInspector.mutateAsync(name)
      setInspectorId(result.inspector.id)
      setInspectorName(result.inspector.name)
      setShowAddName(false)
      setNewInspectorName('')
      toast.success(`Welcome, ${result.inspector.name}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add inspector')
    }
  }

  async function handleStartInspection() {
    if (!inspectorId) return toast.error('Please select your name')
    if (!isValidRoomNumber(roomNumber)) return toast.error('Invalid room number')

    try {
      const result = await startInspection.mutateAsync({
        room_number: roomNumber.trim(),
        inspector_id: inspectorId,
        inspection_type: inspectionType,
      })
      setInspectionId(result.inspection.id)
      setStep(2)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to start inspection')
    }
  }

  // ── Step 2 actions ──────────────────────────────────────────────────────────

  async function handleStep2Continue() {
    if (cleanliness === 0) return toast.error('Please rate cleanliness')
    if (!condition) return toast.error('Please select an overall condition')
    if (!inspectionId) return

    try {
      await updateInspection.mutateAsync({
        id: inspectionId,
        data: {
          overall_cleanliness: cleanliness,
          overall_condition: condition,
          quick_checks: quickChecks,
        },
      })
      setStep(3)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  // ── Step 3 actions ──────────────────────────────────────────────────────────

  async function handleAddIssue(draft: {
    category: string
    severity: string
    location_in_room?: string
    description: string
    before_photo_url?: string
  }) {
    if (!inspectionId) return
    try {
      const result = await addIssue.mutateAsync({
        inspectionId,
        data: {
          inspection_id: inspectionId,
          room_number: roomNumber,
          category: draft.category,
          severity: draft.severity,
          location_in_room: draft.location_in_room,
          description: draft.description,
          before_photo_url: draft.before_photo_url,
        },
      })
      setIssues((prev) => [
        ...prev,
        {
          id: result.issue.id,
          category: result.issue.category,
          severity: result.issue.severity,
          location_in_room: result.issue.location_in_room,
          description: result.issue.description,
          before_photo_url: result.issue.before_photo_url,
        },
      ])
      setShowIssueForm(false)
      toast.success('Issue logged')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add issue')
    }
  }

  function handleRemoveLocalIssue(id: number) {
    setIssues((prev) => prev.filter((i) => i.id !== id))
  }

  // ── Step 4 actions ──────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!inspectionId) return
    try {
      const result = await submitInspection.mutateAsync({
        id: inspectionId,
        data: {
          overall_cleanliness: cleanliness,
          overall_condition: condition,
          quick_checks: quickChecks,
          general_notes: generalNotes.trim() || undefined,
        },
      })
      clearDraft()
      setSubmitted({
        duration_minutes: result.duration_minutes,
        issues_count: result.issues_count,
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Submission failed')
    }
  }

  function handleStartNew() {
    setStep(1)
    setInspectorId(null)
    setInspectorName('')
    setRoomNumber('')
    setInspectionType('routine')
    setCleanliness(0)
    setCondition('')
    setQuickChecks({})
    setIssues([])
    setGeneralNotes('')
    setInspectionId(null)
    setSubmitted(null)
  }

  const failedChecks = useMemo(
    () => Object.values(quickChecks).filter((v) => v === false).length,
    [quickChecks]
  )
  const passedChecks = 12 - failedChecks

  const issueSeverityCounts = useMemo(() => {
    const counts = { urgent: 0, standard: 0, minor: 0, note: 0 }
    issues.forEach((i) => {
      counts[i.severity as keyof typeof counts] = (counts[i.severity as keyof typeof counts] ?? 0) + 1
    })
    return counts
  }, [issues])

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center p-4">
        <div className="bg-white rounded-card shadow-lg p-8 max-w-[440px] w-full text-center">
          <div className="h-20 w-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-5">
            <Check className="text-green" size={48} strokeWidth={3} />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-black mb-2">Inspection Complete!</h1>
          <p className="text-gray-600 mb-1">
            Room <span className="font-bold">{roomNumber}</span> · {inspectorName}
          </p>
          {submitted.duration_minutes != null && (
            <p className="text-sm text-gray-500 mb-4">
              Completed in {Math.round(submitted.duration_minutes)} minutes
            </p>
          )}
          <div className="bg-gray-50 rounded-[10px] p-4 mb-5 text-sm">
            <p className="font-semibold mb-1">{submitted.issues_count} issue{submitted.issues_count === 1 ? '' : 's'} logged</p>
            {submitted.issues_count > 0 && (
              <p className="text-xs text-gray-500">
                {issueSeverityCounts.urgent} urgent · {issueSeverityCounts.standard} standard · {issueSeverityCounts.minor} minor
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleStartNew}
            className="w-full bg-orange hover:bg-orange-dark text-white font-bold rounded-[10px] py-4 text-base mb-2 min-h-[48px]"
          >
            Start New Inspection
          </button>
          <a
            href="/admin/inspections"
            className="block text-sm font-semibold text-orange hover:text-orange-dark py-2"
          >
            View Issues →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] pb-12">
      {/* Resume draft modal */}
      {showResume && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-card p-6 max-w-[400px] w-full">
            <h3 className="font-display text-lg font-bold mb-2">Resume previous inspection?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Found an unfinished inspection for Room <span className="font-bold">{showResume.room_number}</span> by {showResume.inspector_name}.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => resumeDraft(showResume)}
                className="flex-1 bg-orange hover:bg-orange-dark text-white font-bold rounded-[10px] py-3 text-sm min-h-[48px]"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => discardDraft(showResume)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-[10px] py-3 text-sm min-h-[48px]"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header (sticky) */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-100 shadow-sm">
        <div className="max-w-[520px] mx-auto px-5 py-4">
          <h1 className="font-display text-lg font-bold uppercase tracking-wider text-brand-black">
            Casco Bay Hotel
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Room Inspection</p>
          <div className="mt-3 flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-colors',
                  s <= step ? 'bg-orange' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-2">
            Step {step} of 4
          </p>
        </div>
      </header>

      <main className="max-w-[520px] mx-auto px-5 py-6">
        {/* ── Step 1 ── */}
        {step === 1 && (
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
            <h2 className="font-display text-xl font-bold text-brand-black mb-1">
              Begin Room Inspection
            </h2>
            <p className="text-sm text-gray-500 mb-6">Enter your details to get started.</p>

            <div className="space-y-5">
              {/* Inspector */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
                  Your Name
                </label>
                {showAddName ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newInspectorName}
                      onChange={(e) => setNewInspectorName(e.target.value)}
                      placeholder="Enter your full name"
                      className="flex-1 text-base border-2 border-gray-200 focus:border-orange rounded-[10px] px-4 py-3 outline-none min-h-[48px]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddInspector}
                      disabled={!newInspectorName.trim() || addInspector.isPending}
                      className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 disabled:opacity-40 min-h-[48px]"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={inspectorId ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '__add__') {
                        setShowAddName(true)
                        setInspectorId(null)
                        setInspectorName('')
                      } else if (value) {
                        const id = Number(value)
                        const insp = inspectors.find((i) => i.id === id)
                        setInspectorId(id)
                        setInspectorName(insp?.name ?? '')
                      } else {
                        setInspectorId(null)
                      }
                    }}
                    className="w-full text-base border-2 border-gray-200 focus:border-orange rounded-[10px] px-4 py-3 outline-none bg-white min-h-[48px]"
                  >
                    <option value="">Select your name…</option>
                    {inspectors.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                    <option value="__add__">+ Add your name</option>
                  </select>
                )}
              </div>

              {/* Room number */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
                  Room Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="e.g. 204"
                  className={cn(
                    'w-full text-2xl font-bold tracking-wider text-center border-2 rounded-[10px] px-4 py-4 outline-none min-h-[48px]',
                    roomNumber && !isValidRoomNumber(roomNumber)
                      ? 'border-red focus:border-red'
                      : 'border-gray-200 focus:border-orange'
                  )}
                />
                {roomNumber && !isValidRoomNumber(roomNumber) && (
                  <p className="text-xs text-red mt-1">
                    Room must be 101–134, 201–234, 301–334, or 401–434
                  </p>
                )}
              </div>

              {/* Inspection type */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
                  Inspection Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {INSPECTION_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInspectionType(t.id)}
                      className={cn(
                        'px-4 py-3 rounded-[10px] border-2 text-sm font-semibold transition-all min-h-[48px]',
                        inspectionType === t.id
                          ? 'bg-orange text-white border-orange'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-orange/50'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartInspection}
                disabled={!inspectorId || !isValidRoomNumber(roomNumber) || startInspection.isPending}
                className="w-full bg-orange hover:bg-orange-dark text-white font-bold rounded-[10px] py-4 text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]"
              >
                {startInspection.isPending ? 'Starting…' : 'Begin Inspection →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-bold text-brand-black mb-1">Room Overview</h2>
              <p className="text-sm text-gray-500">
                Rate the overall condition before logging specific issues.
              </p>
            </div>

            {/* Cleanliness */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">
                Overall Cleanliness
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCleanliness(n)}
                    className="p-2"
                    aria-label={`${n} stars`}
                  >
                    <Star
                      size={40}
                      className={cn(
                        'transition-colors',
                        n <= cleanliness ? 'fill-orange text-orange' : 'text-gray-300'
                      )}
                    />
                  </button>
                ))}
              </div>
              {cleanliness > 0 && (
                <p className="text-center text-sm text-gray-500 mt-1">
                  {cleanliness} of 5 stars
                </p>
              )}
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">
                Overall Condition
              </label>
              <div className="grid grid-cols-2 gap-3">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCondition(c.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 py-5 rounded-[12px] border-2 transition-all min-h-[80px]',
                      condition === c.id
                        ? 'border-orange bg-orange-light/50 text-orange-dark'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange/50'
                    )}
                  >
                    <span className="text-3xl">{c.emoji}</span>
                    <span className="text-sm font-bold">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick checks */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-3">
                Quick Checks
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Toggle off anything that's not working. All start as passed.
              </p>
              <QuickChecks values={quickChecks} onChange={setQuickChecks} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 text-sm font-semibold text-gray-500 hover:text-gray-700 min-h-[48px]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleStep2Continue}
                disabled={!cleanliness || !condition || updateInspection.isPending}
                className="flex-1 bg-orange hover:bg-orange-dark text-white font-bold rounded-[10px] py-3.5 text-base transition-colors disabled:opacity-40 min-h-[48px]"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 ── */}
        {step === 3 && (
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl font-bold text-brand-black mb-1">Flag Issues</h2>
              <p className="text-sm text-gray-500">
                Add any problems found. Leave empty if room is perfect.
              </p>
            </div>

            {/* Existing issues */}
            {issues.length > 0 && (
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-3 p-3 rounded-[10px] bg-gray-50 border border-gray-200"
                  >
                    <span className="text-xl flex-shrink-0">{CATEGORY_EMOJIS[issue.category] ?? '🔧'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={issue.severity as 'urgent' | 'standard' | 'minor' | 'note'} size="sm" />
                        {issue.location_in_room && (
                          <span className="text-[10px] text-gray-400 font-semibold">
                            {issue.location_in_room}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-brand-black">{issue.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocalIssue(issue.id)}
                      className="text-gray-300 hover:text-red transition-colors flex-shrink-0 p-1"
                      aria-label="Remove issue"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add issue */}
            {showIssueForm && inspectionId ? (
              <IssueForm
                inspectionId={inspectionId}
                onAdd={handleAddIssue}
                onCancel={() => setShowIssueForm(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowIssueForm(true)}
                className="w-full border-2 border-dashed border-gray-300 hover:border-orange hover:bg-orange-light/10 text-gray-600 hover:text-orange-dark font-bold rounded-[12px] py-5 text-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
              >
                <Plus size={20} />
                Add Issue
              </button>
            )}

            {issues.length === 0 && !showIssueForm && (
              <p className="text-xs text-center text-gray-400">
                No issues yet — that's great! You can skip this step if everything looks good.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 text-sm font-semibold text-gray-500 hover:text-gray-700 min-h-[48px]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 bg-orange hover:bg-orange-dark text-white font-bold rounded-[10px] py-3.5 text-base min-h-[48px]"
              >
                {issues.length === 0 ? 'Skip — No Issues' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 space-y-5">
              <h2 className="font-display text-xl font-bold text-brand-black">Review Inspection</h2>

              <div className="bg-gray-50 rounded-[12px] p-5 space-y-3">
                <div className="text-center">
                  <div className="font-display text-3xl font-bold text-brand-black">Room {roomNumber}</div>
                  <p className="text-sm text-gray-500">{inspectorName}</p>
                  <span className="inline-block mt-1 text-xs font-semibold bg-orange-light text-orange-dark px-2.5 py-0.5 rounded-full capitalize">
                    {INSPECTION_TYPES.find((t) => t.id === inspectionType)?.label ?? inspectionType}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500">Cleanliness</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={16}
                          className={n <= cleanliness ? 'fill-orange text-orange' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Condition</span>
                    <span className="font-semibold capitalize">{condition}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Quick Checks</span>
                    <span className={cn(
                      'font-semibold',
                      failedChecks > 0 ? 'text-red' : 'text-green'
                    )}>
                      {failedChecks > 0
                        ? `${failedChecks} failed · ${passedChecks} passed`
                        : `12/12 passed ✓`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Issues */}
              <div>
                <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
                  Issues ({issues.length})
                </h3>
                {issues.length === 0 ? (
                  <p className="text-sm text-gray-500">No issues logged.</p>
                ) : (
                  <>
                    <div className="flex gap-2 mb-3">
                      {issueSeverityCounts.urgent > 0 && (
                        <SeverityBadge severity="urgent" size="sm" />
                      )}
                      {issueSeverityCounts.standard > 0 && (
                        <SeverityBadge severity="standard" size="sm" />
                      )}
                      {issueSeverityCounts.minor > 0 && (
                        <SeverityBadge severity="minor" size="sm" />
                      )}
                      {issueSeverityCounts.note > 0 && (
                        <SeverityBadge severity="note" size="sm" />
                      )}
                    </div>
                    <div className="space-y-2">
                      {issues.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-2 text-sm">
                          <span className="text-base flex-shrink-0">{CATEGORY_EMOJIS[issue.category] ?? '🔧'}</span>
                          <span className="flex-1">{issue.description}</span>
                          <SeverityBadge
                            severity={issue.severity as 'urgent' | 'standard' | 'minor' | 'note'}
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {issueSeverityCounts.urgent > 0 && (
                <div className="bg-red-light/30 border border-red-200 rounded-[10px] p-3 flex items-start gap-2 text-sm">
                  <span>⚠️</span>
                  <span className="text-red font-semibold">
                    {issueSeverityCounts.urgent} urgent issue{issueSeverityCounts.urgent === 1 ? '' : 's'} flagged — management will be notified.
                  </span>
                </div>
              )}

              {/* General notes */}
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">
                  General Notes (optional)
                </label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Any additional comments…"
                  rows={3}
                  className="w-full text-base border-2 border-gray-200 focus:border-orange rounded-[10px] px-4 py-3 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 text-sm font-semibold text-gray-500 hover:text-gray-700 min-h-[48px]"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitInspection.isPending}
                className="flex-1 bg-orange hover:bg-orange-dark text-white font-bold rounded-[10px] py-4 text-base transition-colors disabled:opacity-40 min-h-[48px]"
              >
                {submitInspection.isPending ? 'Submitting…' : 'Submit Inspection'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
