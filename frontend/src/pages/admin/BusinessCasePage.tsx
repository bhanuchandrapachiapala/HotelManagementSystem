import { useState } from 'react'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import TaskStatusRow from '../../components/business/TaskStatusRow'
import HeatmapGrid from '../../components/business/HeatmapGrid'
import AnalysisTable from '../../components/business/AnalysisTable'
import HistoryChart from '../../components/business/HistoryChart'
import { useTodayTasks, useTasksRange, useTaskAnalysis, useTaskHistory } from '../../hooks/useTasks'
import { getMonthRange } from '../../lib/utils'
import { TASK_DEFINITIONS } from '../../lib/constants'

const TABS = ["Today's Status", 'Monthly Heatmap', 'Task Analysis']

export default function BusinessCasePage() {
  const [tab, setTab] = useState(TABS[0])
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'))

  const [year, monthIdx] = currentMonth.split('-').map(Number)
  const { start, end } = getMonthRange(currentMonth)

  const { data: todayData, isLoading: loadingToday, refetch } = useTodayTasks()
  const { data: rangeData, isLoading: loadingRange } = useTasksRange(start, end)
  const { data: analysisData, isLoading: loadingAnalysis } = useTaskAnalysis(currentMonth)
  const { data: historyData, isLoading: loadingHistory } = useTaskHistory(7)

  const completedIds = new Set(todayData?.task_ids ?? [])

  function badgeVariant(count: number): 'green' | 'yellow' | 'orange' | 'red' {
    if (count === 6) return 'green'
    if (count >= 3) return 'yellow'
    if (count >= 1) return 'orange'
    return 'red'
  }

  const monthLabel = format(new Date(year, monthIdx - 1, 1), 'MMMM yyyy')

  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === TABS[0] && (
        <div className="space-y-5">
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-base font-semibold">Daily Task Checklist Status</h2>
                {todayData && (
                  <Badge variant={badgeVariant(todayData.completed_count)}>
                    {todayData.completed_count}/6 completed
                  </Badge>
                )}
              </div>
              <button
                onClick={() => refetch()}
                className="text-xs font-semibold text-orange hover:text-orange-dark transition-colors"
              >
                Refresh
              </button>
            </div>

            {loadingToday ? (
              <LoadingSpinner />
            ) : (
              <div>
                {TASK_DEFINITIONS.map((task) => {
                  const isDone = completedIds.has(task.id)
                  return (
                    <TaskStatusRow
                      key={task.id}
                      taskId={task.id}
                      label={task.label}
                      icon={task.icon}
                      isDone={isDone}
                      submittedAt={isDone ? (todayData?.submitted_at ?? undefined) : undefined}
                    />
                  )
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <h2 className="font-display text-base font-semibold mb-5">Submission History — Last 7 Days</h2>
            {loadingHistory ? <LoadingSpinner /> : historyData ? (
              <HistoryChart data={historyData.history} />
            ) : null}
          </SectionCard>
        </div>
      )}

      {tab === TABS[1] && (
        <SectionCard>
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display text-base font-semibold">Monthly Task Completion Heatmap</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentMonth(format(subMonths(new Date(year, monthIdx - 1), 1), 'yyyy-MM'))}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  ←
                </button>
                <span className="text-sm font-semibold w-32 text-center">{monthLabel}</span>
                <button
                  onClick={() => setCurrentMonth(format(addMonths(new Date(year, monthIdx - 1), 1), 'yyyy-MM'))}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  →
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">Color intensity = % of tasks completed that day</p>
          </div>

          {loadingRange ? (
            <LoadingSpinner />
          ) : (
            <>
              <HeatmapGrid
                year={year}
                month={monthIdx - 1}
                data={rangeData?.days ?? []}
              />
              <div className="flex items-center gap-3 mt-4 text-xs text-gray-400">
                <span>None</span>
                {['#E8E8E8', '#FFE4C8', '#FFBA7A', '#F47920', '#C95E10'].map((c) => (
                  <div key={c} className="w-5 h-5 rounded-[3px]" style={{ backgroundColor: c }} />
                ))}
                <span>Full</span>
              </div>
            </>
          )}
        </SectionCard>
      )}

      {tab === TABS[2] && (
        <SectionCard>
          <div className="mb-5">
            <h2 className="font-display text-base font-semibold">Task Completion Analysis</h2>
            <p className="text-xs text-gray-400 mt-0.5">{monthLabel}</p>
          </div>

          {loadingAnalysis ? (
            <LoadingSpinner />
          ) : analysisData ? (
            <>
              <AnalysisTable tasks={analysisData.tasks} workingDays={analysisData.working_days} />
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <span className="text-sm text-gray-500">Overall monthly completion rate:</span>
                <span className="font-bold text-brand-black">
                  {analysisData.tasks.length > 0
                    ? `${(analysisData.tasks.reduce((s, t) => s + t.completion_rate, 0) / analysisData.tasks.length).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
            </>
          ) : null}
        </SectionCard>
      )}
    </PageWrapper>
  )
}
