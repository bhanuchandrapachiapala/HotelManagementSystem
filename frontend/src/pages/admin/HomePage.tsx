import { format as fnsFormat } from 'date-fns'
import PageWrapper from '../../components/layout/PageWrapper'
import StatCard from '../../components/ui/StatCard'
import SectionCard from '../../components/ui/SectionCard'
import AlertItem from '../../components/ui/AlertItem'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ProgressBar from '../../components/ui/ProgressBar'
import { useTodayTasks, useTasksRange } from '../../hooks/useTasks'
import { useTodayOrders } from '../../hooks/useOrders'
import { useHousekeepingProgress, useHousekeepingTimeline } from '../../hooks/useHousekeeping'
import { getMonthRange, getToday, timeAgo } from '../../lib/utils'

const PACE_LABEL: Record<string, string> = {
  fast: 'Fast',
  on_track: 'On Track',
  slow: 'Slow',
  not_started: 'Not Started',
}

const PACE_COLOR: Record<string, string> = {
  fast: 'bg-green-light text-green',
  on_track: 'bg-orange/10 text-orange',
  slow: 'bg-red/10 text-red',
  not_started: 'bg-gray-100 text-gray-400',
}

export default function HomePage() {
  const today = fnsFormat(new Date(), 'yyyy-MM')
  const { start, end } = getMonthRange(today)
  const todayDate = getToday()

  const { data: todayTasks, isLoading: loadingTasks } = useTodayTasks()
  const { data: todayOrders, isLoading: loadingOrders } = useTodayOrders()
  const { data: monthRange, isLoading: loadingRange } = useTasksRange(start, end)
  const { data: hkProgress, isLoading: loadingHK } = useHousekeepingProgress(todayDate)
  const { data: timelineData } = useHousekeepingTimeline(todayDate)

  const hour = new Date().getHours()
  const completedCount = todayTasks?.completed_count ?? 0
  const pendingOrders = todayOrders?.pending ?? 0
  const roomsDone = hkProgress?.total_done ?? 0
  const roomsTotal = hkProgress?.total_assigned ?? 0
  const roomsPending = hkProgress?.total_pending ?? 0

  const alerts = (() => {
    const list: Array<{ type: 'warning' | 'error' | 'success' | 'info'; title: string; message: string; icon: string }> = []
    if (hour >= 17 && completedCount < 6) {
      list.push({ type: 'warning', title: 'Tasks incomplete', message: `${6 - completedCount} tasks not yet completed today.`, icon: '⚠️' })
    }
    if (pendingOrders > 0) {
      list.push({ type: 'warning', title: 'Orders waiting', message: `${pendingOrders} dinner order(s) pending preparation.`, icon: '🍽️' })
    }
    if (roomsPending > 0) {
      list.push({ type: 'warning', title: 'Rooms pending', message: `${roomsPending} room(s) not yet cleaned today.`, icon: '🛏️' })
    }
    const hkClear = roomsTotal === 0 || roomsPending === 0
    if (completedCount === 6 && pendingOrders === 0 && hkClear) {
      list.push({ type: 'success', title: 'All clear', message: 'All tasks done, no pending orders, rooms on track.', icon: '✅' })
    }
    if (!todayTasks && !todayOrders) {
      list.push({ type: 'info', title: 'System ready', message: "Awaiting today's activity.", icon: 'ℹ️' })
    }
    return list
  })()

  const recentEvents: Array<{ label: string; time: string }> = [
    ...(todayOrders?.orders?.slice(0, 3).map((o) => ({
      label: `Order #${o.id} — Room ${o.room_number} (${o.guest_initials})`,
      time: o.submitted_at,
    })) ?? []),
    ...(todayTasks?.submitted_at
      ? [{ label: `Daily checklist submitted (${completedCount}/6 tasks)`, time: todayTasks.submitted_at }]
      : []),
    ...(timelineData?.timeline?.slice(0, 5).map((e) => ({
      label: `Room ${e.room_number} cleaned — ${e.housekeeper_name}`,
      time: e.completed_at,
    })) ?? []),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6)

  const activeHousekeepers = (hkProgress?.housekeepers ?? []).filter((h) => h.assigned > 0)

  return (
    <PageWrapper>
      {/* Stats grid — 2 rows of 3 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <StatCard
          label="Today's Tasks"
          value={loadingTasks ? '—' : `${completedCount}/6`}
          subtext={loadingTasks ? '' : `${6 - completedCount} remaining`}
          icon="📋"
          accentColor="orange"
          loading={loadingTasks}
        />
        <StatCard
          label="Dinner Orders Today"
          value={loadingOrders ? '—' : todayOrders?.total ?? 0}
          icon="🍽️"
          accentColor="yellow"
          loading={loadingOrders}
        />
        <StatCard
          label="Monthly Compliance"
          value={loadingRange ? '—' : `${monthRange?.summary.overall_completion_rate ?? 0}%`}
          icon="📊"
          accentColor="green"
          loading={loadingRange}
        />
        <StatCard
          label="Pending Orders"
          value={loadingOrders ? '—' : pendingOrders}
          icon="⏳"
          accentColor="red"
          loading={loadingOrders}
        />
        <StatCard
          label="Rooms Done Today"
          value={loadingHK ? '—' : `${roomsDone}/${roomsTotal}`}
          icon="🛏️"
          accentColor="green"
          loading={loadingHK}
        />
        <StatCard
          label="Rooms Pending"
          value={loadingHK ? '—' : roomsPending}
          icon="⏳"
          accentColor="red"
          loading={loadingHK}
        />
      </div>

      {/* Alerts + Activity + Housekeeping Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard>
          <h2 className="font-display text-base font-semibold mb-4">Alerts & Notices</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-sm">No active alerts.</p>
          ) : (
            alerts.map((a, i) => (
              <AlertItem key={i} type={a.type} title={a.title} message={a.message} icon={a.icon} />
            ))
          )}
        </SectionCard>

        <SectionCard>
          <h2 className="font-display text-base font-semibold mb-4">Recent Activity</h2>
          {recentEvents.length === 0 ? (
            <p className="text-gray-400 text-sm">No activity yet today.</p>
          ) : (
            <ul className="space-y-3">
              {recentEvents.map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                  <p className="text-sm text-brand-black">{e.label}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(e.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard>
          <h2 className="font-display text-base font-semibold mb-4">Housekeeping Progress</h2>
          {loadingHK ? (
            <LoadingSpinner />
          ) : activeHousekeepers.length === 0 ? (
            <p className="text-gray-400 text-sm">No rooms assigned today.</p>
          ) : (
            <div className="space-y-4">
              {activeHousekeepers.map((h) => (
                <div key={h.housekeeper_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-brand-black truncate pr-2">{h.housekeeper_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${PACE_COLOR[h.pace]}`}>
                      {PACE_LABEL[h.pace]}
                    </span>
                  </div>
                  <ProgressBar value={h.done} max={h.assigned} />
                  <p className="text-[11px] text-gray-400 mt-1">{h.done}/{h.assigned} rooms done</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </PageWrapper>
  )
}
