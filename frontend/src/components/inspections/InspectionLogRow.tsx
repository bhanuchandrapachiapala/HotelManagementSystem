import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, X as XIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import SeverityBadge from './SeverityBadge'
import { useInspection } from '../../hooks/useInspections'
import type { Inspection } from '../../types'

const TYPE_LABELS: Record<string, string> = {
  routine: 'Routine',
  post_checkout: 'Post-Checkout',
  post_maintenance: 'Post-Maintenance',
  deep_clean: 'Deep Clean',
  pre_vip: 'Pre-VIP',
}

const TYPE_COLORS: Record<string, string> = {
  routine: 'bg-gray-100 text-gray-700',
  post_checkout: 'bg-blue-100 text-blue-700',
  post_maintenance: 'bg-purple-100 text-purple-700',
  deep_clean: 'bg-green-100 text-green-700',
  pre_vip: 'bg-yellow-100 text-yellow-800',
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-green-100 text-green-700',
  good: 'bg-blue-100 text-blue-700',
  fair: 'bg-yellow-100 text-yellow-800',
  poor: 'bg-red-100 text-red-700',
}

const QUICK_CHECK_LABELS: Record<string, string> = {
  bed_made: 'Bed made',
  bathroom_clean: 'Bathroom clean',
  floor_vacuumed: 'Floor vacuumed',
  windows_clean: 'Windows clean',
  ac_working: 'AC/Heat',
  tv_working: 'TV',
  safe_working: 'Safe',
  fridge_working: 'Mini fridge',
  towels_stocked: 'Towels',
  toiletries_stocked: 'Toiletries',
  door_lock_working: 'Door lock',
  lights_working: 'Lights',
}

function formatDuration(min?: number): { text: string; color: string } {
  if (min == null) return { text: '—', color: 'text-gray-400' }
  const mInt = Math.floor(min)
  const seconds = Math.round((min - mInt) * 60)
  const text = `${mInt}m ${seconds}s`
  let color = 'text-green'
  if (mInt > 20) color = 'text-red'
  else if (mInt >= 10) color = 'text-yellow-700'
  return { text, color }
}

export default function InspectionLogRow({ inspection }: { inspection: Inspection }) {
  const [expanded, setExpanded] = useState(false)
  const { data: detail } = useInspection(expanded ? inspection.id : null)

  const fullInspection = detail?.inspection ?? inspection
  const issues = fullInspection.issues ?? []

  const typeColor = TYPE_COLORS[inspection.inspection_type] ?? 'bg-gray-100 text-gray-700'
  const typeLabel = TYPE_LABELS[inspection.inspection_type] ?? inspection.inspection_type
  const conditionColor = inspection.overall_condition ? CONDITION_COLORS[inspection.overall_condition] : 'bg-gray-100 text-gray-600'
  const duration = formatDuration(inspection.duration_minutes)

  const issueCount = inspection.issues_count ?? issues.length
  const hasUrgent = issues.some((i) => i.severity === 'urgent')
  const hasStandard = issues.some((i) => i.severity === 'standard')
  let issuesColor = 'text-gray-400'
  if (issueCount > 0) {
    if (hasUrgent) issuesColor = 'text-red font-semibold'
    else if (hasStandard) issuesColor = 'text-yellow-700 font-semibold'
    else issuesColor = 'text-green font-semibold'
  }

  const submittedAt = inspection.submitted_at ? new Date(inspection.submitted_at) : null
  const startedAt = inspection.started_at ? new Date(inspection.started_at) : null

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <td className="px-4 py-3">
          <span className="bg-brand-black text-white text-xs font-bold px-2 py-1 rounded-full">
            {inspection.room_number}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-semibold">{inspection.inspector_name ?? '—'}</td>
        <td className="px-4 py-3">
          <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', typeColor)}>{typeLabel}</span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {submittedAt ? (
            <>
              <div>{submittedAt.toLocaleDateString()}</div>
              <div className="text-xs text-gray-400">{submittedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </>
          ) : '—'}
        </td>
        <td className={cn('px-4 py-3 text-sm font-semibold', duration.color)}>{duration.text}</td>
        <td className="px-4 py-3">
          {inspection.overall_condition ? (
            <span className={cn('text-xs font-semibold px-2 py-1 rounded-full capitalize', conditionColor)}>
              {inspection.overall_condition}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className={cn('px-4 py-3 text-sm', issuesColor)}>
          {issueCount} issue{issueCount === 1 ? '' : 's'}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-semibold text-gray-600 capitalize">{inspection.status.replace('_', ' ')}</span>
        </td>
        <td className="px-4 py-3 text-gray-400">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </td>
      </tr>

      {expanded && (
        <tr className="border-t border-gray-100 bg-gray-50">
          <td colSpan={9} className="px-6 py-5">
            <div className="space-y-5">
              {/* Quick checks */}
              {fullInspection.quick_checks && (
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">
                    Quick Checks
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Object.entries(QUICK_CHECK_LABELS).map(([key, label]) => {
                      const passed = fullInspection.quick_checks?.[key]
                      // default true if not present
                      const result = passed === undefined ? true : passed
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {result ? (
                            <Check size={14} className="text-green flex-shrink-0" />
                          ) : (
                            <XIcon size={14} className="text-red flex-shrink-0" />
                          )}
                          <span className={result ? 'text-gray-700' : 'text-red font-semibold'}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Issues */}
              <div>
                <h4 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">
                  Issues ({issues.length})
                </h4>
                {issues.length === 0 ? (
                  <p className="text-sm text-gray-400">No issues logged.</p>
                ) : (
                  <div className="space-y-2">
                    {issues.map((issue) => (
                      <div key={issue.id} className="flex items-center gap-3 bg-white rounded-[8px] px-3 py-2 border border-gray-100">
                        <SeverityBadge severity={issue.severity} size="sm" />
                        <span className="flex-1 text-sm text-brand-black">{issue.description}</span>
                        <span className="text-xs font-semibold text-gray-500 capitalize">
                          {issue.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {fullInspection.general_notes && (
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">
                    General Notes
                  </h4>
                  <p className="text-sm text-gray-700">{fullInspection.general_notes}</p>
                </div>
              )}

              {/* Timeline */}
              {startedAt && (
                <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                  Started {startedAt.toLocaleString()}
                  {submittedAt && ` · Submitted ${submittedAt.toLocaleString()}`}
                  {inspection.duration_minutes != null && ` · Duration ${duration.text}`}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
