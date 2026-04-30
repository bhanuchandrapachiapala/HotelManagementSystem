import { format, parseISO } from 'date-fns'
import Badge from '../ui/Badge'

interface TaskStatusRowProps {
  taskId: string
  label: string
  icon: string
  isDone: boolean
  submittedAt?: string
}

export default function TaskStatusRow({ label, icon, isDone, submittedAt }: TaskStatusRowProps) {
  const timeStr = submittedAt
    ? `Checked at ${format(parseISO(submittedAt), 'h:mm a')}`
    : 'Not yet'

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isDone ? 'bg-green text-white' : 'bg-gray-100'
      }`}>
        {isDone ? '✓' : ''}
      </div>
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="font-semibold text-sm text-brand-black">{label}</p>
        <p className="text-xs text-gray-400">{timeStr}</p>
      </div>
      <Badge variant={isDone ? 'green' : 'gray'}>{isDone ? 'Done' : 'Pending'}</Badge>
    </div>
  )
}
