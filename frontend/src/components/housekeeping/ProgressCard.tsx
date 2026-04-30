import type { HousekeeperProgress } from '../../types'
import ProgressBar from '../ui/ProgressBar'

interface ProgressCardProps {
  progress: HousekeeperProgress
}

const paceBorder: Record<string, string> = {
  fast:        'border-l-green',
  on_track:    'border-l-yellow-hotel',
  slow:        'border-l-red',
  not_started: 'border-l-gray-300',
}

const paceBadge: Record<string, string> = {
  fast:        'bg-green-light text-green',
  on_track:    'bg-yellow-light text-yellow-900',
  slow:        'bg-red-light text-red',
  not_started: 'bg-gray-100 text-gray-500',
}

const paceLabel: Record<string, string> = {
  fast:        '🚀 Fast',
  on_track:    '✓ On Track',
  slow:        '⚠ Slow',
  not_started: '— Not Started',
}

export default function ProgressCard({ progress }: ProgressCardProps) {
  const { housekeeper_name, pace, assigned, done, pending, in_progress, completion_rate, estimated_finish } = progress

  return (
    <div className={`bg-white rounded-card shadow-sm border-l-4 p-5 ${paceBorder[pace] ?? 'border-l-gray-300'}`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-base font-semibold text-brand-black">{housekeeper_name}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${paceBadge[pace] ?? ''}`}>
          {paceLabel[pace] ?? pace}
        </span>
      </div>

      <ProgressBar value={done} max={assigned || 1} className="mb-3" />

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span><span className="font-bold text-green">{done}</span> done</span>
        <span><span className="font-bold text-orange">{pending}</span> pending</span>
        {in_progress > 0 && (
          <span><span className="font-bold text-yellow-hotel">{in_progress}</span> in progress</span>
        )}
        <span className="ml-auto font-bold text-brand-black">{completion_rate}%</span>
      </div>

      {estimated_finish && (
        <p className="text-xs text-gray-400">
          Est. finish: <span className="font-semibold text-gray-600">{estimated_finish}</span>
        </p>
      )}
    </div>
  )
}
