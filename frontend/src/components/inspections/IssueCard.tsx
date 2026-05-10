import { useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import SeverityBadge from './SeverityBadge'
import PhotoUpload from './PhotoUpload'
import { cn, timeAgo } from '../../lib/utils'
import { useUpdateIssueStatus } from '../../hooks/useInspections'
import type { InspectionIssue } from '../../types'

const CATEGORY_EMOJIS: Record<string, string> = {
  cleanliness: '🧹',
  maintenance: '🔧',
  furniture: '🪑',
  plumbing: '🚿',
  electrical: '⚡',
  hvac: '❄️',
  safety: '🔒',
  cosmetic: '🎨',
}

const CATEGORY_LABELS: Record<string, string> = {
  cleanliness: 'Cleanliness',
  maintenance: 'Maintenance',
  furniture: 'Furniture',
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  hvac: 'HVAC',
  safety: 'Safety',
  cosmetic: 'Cosmetic',
}

const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  standard: 24,
  minor: 72,
}

const borderBySeverity: Record<string, string> = {
  urgent: 'border-l-red-500',
  standard: 'border-l-yellow-400',
  minor: 'border-l-blue-400',
  note: 'border-l-gray-300',
}

function formatHours(h?: number): string {
  if (h == null) return ''
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 24) {
    const hr = Math.floor(h)
    const min = Math.round((h - hr) * 60)
    return min ? `${hr}h ${min}m` : `${hr}h`
  }
  const days = Math.floor(h / 24)
  return `${days}d ${Math.round(h % 24)}h`
}

export default function IssueCard({ issue }: { issue: InspectionIssue }) {
  const [expanded, setExpanded] = useState(false)
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [resolvedBy, setResolvedBy] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | undefined>(issue.after_photo_url)
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null)

  const updateStatus = useUpdateIssueStatus()

  const slaHours = SLA_HOURS[issue.severity]
  const elapsed = issue.time_open_hours ?? 0
  const slaPct = slaHours ? Math.min(100, (elapsed / slaHours) * 100) : 0

  let slaBarColor = 'bg-green-500'
  if (slaPct >= 100) slaBarColor = 'bg-red-500'
  else if (slaPct >= 75) slaBarColor = 'bg-orange'
  else if (slaPct >= 50) slaBarColor = 'bg-yellow-400'

  let timeOpenColor = 'text-gray-500'
  if (issue.sla_status === 'breached') timeOpenColor = 'text-red-600 font-semibold'
  else if (issue.sla_status === 'at_risk') timeOpenColor = 'text-orange font-semibold'

  async function handleStatusChange(newStatus: string) {
    if (newStatus === issue.status) return
    if (newStatus === 'resolved') {
      setShowResolveForm(true)
      setExpanded(true)
      return
    }
    try {
      await updateStatus.mutateAsync({
        issueId: issue.id,
        data: { status: newStatus },
      })
      toast.success(`Issue marked ${newStatus.replace('_', ' ')}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function handleResolve() {
    if (!resolvedBy.trim()) {
      toast.error('Please enter who resolved the issue')
      return
    }
    try {
      await updateStatus.mutateAsync({
        issueId: issue.id,
        data: {
          status: 'resolved',
          resolved_by: resolvedBy.trim(),
          resolution_notes: resolutionNotes.trim() || undefined,
          after_photo_url: afterPhotoUrl,
        },
      })
      toast.success('Issue resolved')
      setShowResolveForm(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  const isResolved = issue.status === 'resolved' || issue.status === 'closed'

  let resolutionDuration: string | null = null
  if (issue.resolved_at && issue.created_at) {
    const created = new Date(issue.created_at).getTime()
    const resolved = new Date(issue.resolved_at).getTime()
    const hours = (resolved - created) / 3600000
    resolutionDuration = formatHours(hours)
  }

  const timeOpenDisplay = issue.sla_status === 'breached' && slaHours
    ? `SLA breached — ${formatHours(elapsed - slaHours)} ago`
    : `Open ${formatHours(elapsed)}`

  return (
    <div
      className={cn(
        'bg-white rounded-card shadow-sm border border-gray-100 border-l-[6px] p-5 space-y-3',
        borderBySeverity[issue.severity] ?? 'border-l-gray-300'
      )}
    >
      {/* Top row */}
      <div className="flex items-center gap-3 flex-wrap">
        <SeverityBadge severity={issue.severity} />
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
          <span className="text-base">{CATEGORY_EMOJIS[issue.category] ?? '🔧'}</span>
          {CATEGORY_LABELS[issue.category] ?? issue.category}
        </span>
        <span className="bg-brand-black text-white text-xs font-bold px-2.5 py-1 rounded-full">
          Room {issue.room_number}
        </span>
        <span className={cn('text-xs ml-auto', timeOpenColor)}>{timeOpenDisplay}</span>
      </div>

      {/* Description */}
      <p className={cn('text-sm text-brand-black leading-snug', !expanded && 'line-clamp-2')}>
        {issue.description}
      </p>

      {/* Row 3 */}
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        {issue.location_in_room && <span>{issue.location_in_room}</span>}
        {issue.location_in_room && <span className="text-gray-300">·</span>}
        <span>Logged {timeAgo(issue.created_at)}</span>
      </div>

      {/* Photo */}
      {issue.before_photo_url && (
        <button
          type="button"
          onClick={() => setPhotoModalUrl(issue.before_photo_url ?? null)}
          className="block"
        >
          <img
            src={issue.before_photo_url}
            alt="Issue"
            className="h-20 w-20 object-cover rounded-[8px] border border-gray-200 hover:border-orange transition-colors"
          />
        </button>
      )}

      {/* SLA bar */}
      {slaHours && (
        <div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', slaBarColor)}
              style={{ width: `${slaPct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            {issue.sla_status === 'breached'
              ? `SLA breached — ${formatHours(elapsed - slaHours)} ago`
              : `${slaHours}h SLA · ${formatHours(elapsed)} elapsed`}
          </p>
        </div>
      )}

      {/* Bottom row: status + expand */}
      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
        <select
          value={issue.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={updateStatus.isPending}
          className="text-xs font-semibold border border-gray-200 rounded-[6px] px-2 py-1.5 bg-white outline-none focus:border-orange disabled:opacity-50"
        >
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        {isResolved && issue.resolved_by && (
          <span className="text-xs text-green font-semibold">
            Resolved by {issue.resolved_by}
            {resolutionDuration && ` · Fixed in ${resolutionDuration}`}
          </span>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          {showResolveForm && !isResolved && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                Mark as Resolved
              </h4>
              <input
                value={resolvedBy}
                onChange={(e) => setResolvedBy(e.target.value)}
                placeholder="Resolved by (your name)"
                className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 outline-none focus:border-orange"
              />
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Resolution notes (optional)"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-[8px] px-3 py-2 outline-none focus:border-orange resize-none"
              />
              <PhotoUpload
                inspectionId={issue.inspection_id}
                issueId={issue.id}
                photoType="after"
                existingUrl={afterPhotoUrl}
                onUploaded={setAfterPhotoUrl}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={updateStatus.isPending}
                  className="bg-green hover:bg-green/90 text-white text-sm font-semibold rounded-[8px] px-4 py-2 disabled:opacity-40"
                >
                  {updateStatus.isPending ? 'Saving…' : 'Mark Resolved'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResolveForm(false)}
                  className="text-sm font-semibold text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isResolved && (
            <div className="space-y-2 text-sm">
              {issue.resolved_by && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Resolved by:</span>{' '}
                  <span className="font-semibold">{issue.resolved_by}</span>
                </div>
              )}
              {issue.resolution_notes && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Notes:</span>{' '}
                  <span>{issue.resolution_notes}</span>
                </div>
              )}
              {issue.after_photo_url && (
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-widest font-semibold">After photo:</span>
                  <button type="button" onClick={() => setPhotoModalUrl(issue.after_photo_url ?? null)} className="block mt-1">
                    <img src={issue.after_photo_url} alt="After" className="h-20 w-20 object-cover rounded-[8px] border border-gray-200" />
                  </button>
                </div>
              )}
              {issue.resolved_at && (
                <p className="text-xs text-gray-400">
                  Resolved {timeAgo(issue.resolved_at)}
                  {resolutionDuration && ` · Fixed in ${resolutionDuration}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {photoModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPhotoModalUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPhotoModalUrl(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
          >
            <X size={24} />
          </button>
          <img
            src={photoModalUrl}
            alt="Full size"
            className="max-w-full max-h-full rounded-card"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
