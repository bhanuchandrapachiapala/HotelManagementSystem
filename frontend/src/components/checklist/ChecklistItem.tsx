import { cn } from '../../lib/utils'

interface ChecklistItemProps {
  taskId: string
  label: string
  icon: string
  isChecked: boolean
  onToggle: (taskId: string) => void
}

export default function ChecklistItem({ taskId, label, icon, isChecked, onToggle }: ChecklistItemProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(taskId)}
      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors rounded-[10px] text-left"
    >
      <div
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
          isChecked ? 'bg-green border-green' : 'border-gray-300 bg-white'
        )}
      >
        {isChecked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10.3 2.3a1 1 0 0 0-1.4 0L5 6.2 3.1 4.3a1 1 0 0 0-1.4 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z" />
          </svg>
        )}
      </div>
      <span className="text-xl">{icon}</span>
      <span
        className={cn(
          'text-sm font-semibold transition-colors',
          isChecked ? 'line-through text-gray-400' : 'text-brand-black'
        )}
      >
        {label}
      </span>
    </button>
  )
}
