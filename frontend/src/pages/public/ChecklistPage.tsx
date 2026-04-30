import { useState } from 'react'
import { formatDate, getToday } from '../../lib/utils'
import { TASK_DEFINITIONS } from '../../lib/constants'
import { useTodayTasks, useSubmitChecklist } from '../../hooks/useTasks'
import ChecklistItem from '../../components/checklist/ChecklistItem'
import SubmitButton from '../../components/checklist/SubmitButton'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function ChecklistPage() {
  const { data: todayData, isLoading } = useTodayTasks()
  const submitMutation = useSubmitChecklist()

  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (todayData && !initialized) {
    setChecked(new Set(todayData.task_ids))
    setInitialized(true)
    if (todayData.completed_count === 6) setSubmitted(true)
  }

  function toggle(taskId: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  async function handleSubmit() {
    setError(null)
    try {
      await submitMutation.mutateAsync({ date: getToday(), taskIds: Array.from(checked) })
      setSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    }
  }

  const todayStr = formatDate(new Date())

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8F7F5] flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-10 max-w-sm w-full text-center">
          <div className="w-18 h-18 rounded-full bg-green-light flex items-center justify-center mx-auto mb-5" style={{ width: 72, height: 72 }}>
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">All done for today!</h2>
          <p className="text-gray-400 text-sm mb-1">{todayStr}</p>
          <p className="text-gray-500 text-sm mt-3">
            All 6 tasks have been checked off. Great work — see you tomorrow!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-[500px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-brand-black">
            Casco Bay Hotel
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mt-1">Daily Business Checklist</p>
          <div className="inline-block mt-3 bg-gradient-to-r from-orange to-yellow-hotel text-white text-xs font-semibold px-4 py-1.5 rounded-full">
            {todayStr}
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Today's Tasks</span>
            </div>

            <div className="divide-y divide-gray-100">
              {TASK_DEFINITIONS.map((task) => (
                <ChecklistItem
                  key={task.id}
                  taskId={task.id}
                  label={task.label}
                  icon={task.icon}
                  isChecked={checked.has(task.id)}
                  onToggle={toggle}
                />
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-4">{checked.size} of 6 tasks completed</p>

              {error && (
                <div className="bg-red-light text-red text-sm px-4 py-3 rounded-[10px] mb-3">
                  {error}
                </div>
              )}

              <SubmitButton
                allChecked={checked.size === 6}
                isLoading={submitMutation.isPending}
                onClick={handleSubmit}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
