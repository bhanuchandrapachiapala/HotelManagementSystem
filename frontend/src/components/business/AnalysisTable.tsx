import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import type { TaskAnalysisItem } from '../../types'

interface AnalysisTableProps {
  tasks: TaskAnalysisItem[]
  workingDays: number
}

const statusVariant: Record<string, 'green' | 'yellow' | 'orange'> = {
  good: 'green',
  fair: 'yellow',
  low:  'orange',
}

export default function AnalysisTable({ tasks, workingDays }: AnalysisTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Task</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Days Completed</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Rate</th>
            <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Progress</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <tr key={task.task_id} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
              <td className="px-4 py-3 font-medium text-brand-black">{task.label}</td>
              <td className="px-4 py-3 text-center text-gray-600">
                {task.completed_days} / {workingDays}
              </td>
              <td className="px-4 py-3 text-center font-semibold text-brand-black">
                {task.completion_rate}%
              </td>
              <td className="px-4 py-3">
                <ProgressBar value={task.completion_rate} className="w-[120px]" />
              </td>
              <td className="px-4 py-3 text-center">
                <Badge variant={statusVariant[task.status]}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
