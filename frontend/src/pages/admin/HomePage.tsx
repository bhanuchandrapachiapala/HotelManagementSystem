import { format as fnsFormat } from 'date-fns'
import { Link } from 'react-router-dom'
import PageWrapper from '../../components/layout/PageWrapper'
import StatCard from '../../components/ui/StatCard'
import SectionCard from '../../components/ui/SectionCard'
import AlertItem from '../../components/ui/AlertItem'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ProgressBar from '../../components/ui/ProgressBar'
import { useTodayTasks, useTasksRange } from '../../hooks/useTasks'
import { useTodayOrders } from '../../hooks/useOrders'
import { useHousekeepingProgress, useHousekeepingTimeline } from '../../hooks/useHousekeeping'
import { useGroupContracts, useGroupStats } from '../../hooks/useGroups'
import { useInventoryAlerts } from '../../hooks/useInventory'
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
  const { data: groupStats } = useGroupStats()
  const { data: groupContractsData } = useGroupContracts(undefined, true)
  const { data: invAlerts } = useInventoryAlerts()

  const hour = new Date().getHours()
  const completedCount = todayTasks?.completed_count ?? 0
  const pendingOrders = todayOrders?.pending ?? 0
  const roomsDone = hkProgress?.total_done ?? 0
  const roomsTotal = hkProgress?.total_assigned ?? 0
  const roomsPending = hkProgress?.total_pending ?? 0
  const invCritical = invAlerts?.critical_count ?? 0
  const invLow = invAlerts?.low_count ?? 0
  const invAlertTotal = invCritical + invLow
  const topCriticalItems = Object.values(invAlerts?.by_vendor ?? {})
    .flat()
    .filter((i) => i.status === 'critical')
    .slice(0, 3)

  const cutoffAlerts = groupStats?.cutoff_alerts ?? 0
  const totalActiveGroups = groupStats?.total_active ?? 0
  const upcomingContracts = (groupContractsData?.contracts ?? [])
    .filter((c) => ['inquiry', 'confirmed', 'checked_in'].includes(c.status))
    .slice(0, 3)

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
    if (cutoffAlerts > 0) {
      list.push({ type: 'warning', title: 'Group cutoff alert', message: `${cutoffAlerts} group contract(s) have a cutoff date within 3 days.`, icon: '🚨' })
    }
    if (invCritical > 0) {
      list.push({ type: 'warning', title: 'Inventory critically low', message: `${invCritical} item(s) need to be ordered — check Order List.`, icon: '⚠️' })
    }
    const hkClear = roomsTotal === 0 || roomsPending === 0
    if (completedCount === 6 && pendingOrders === 0 && hkClear && cutoffAlerts === 0) {
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

      {/* Inventory Alerts — only shown when items need reordering */}
      {invAlertTotal > 0 && (
        <div className="mt-5">
          <SectionCard>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">Inventory Alerts</h2>
              <Link to="/admin/inventory" className="text-xs text-orange hover:underline font-semibold">
                View Inventory →
              </Link>
            </div>
            {invCritical > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔴</span>
                <p className="text-sm font-semibold text-red">{invCritical} item{invCritical > 1 ? 's' : ''} critically low — order now</p>
              </div>
            )}
            {invLow > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🟡</span>
                <p className="text-sm font-semibold text-yellow-hotel">{invLow} item{invLow > 1 ? 's' : ''} running low</p>
              </div>
            )}
            {topCriticalItems.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">{topCriticalItems.map((i) => i.name).join(' · ')}</p>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Group Bookings — only shown when there are active contracts */}
      {totalActiveGroups > 0 && (
        <div className="mt-5">
          <SectionCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Group Bookings</h2>
              <Link to="/admin/groups" className="text-xs text-orange hover:underline font-semibold">
                View all →
              </Link>
            </div>

            {cutoffAlerts > 0 && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
                <span>🚨</span>
                <p className="text-xs font-semibold text-red">
                  {cutoffAlerts} contract{cutoffAlerts > 1 ? 's' : ''} have a cutoff date within 3 days — action required
                </p>
              </div>
            )}

            {upcomingContracts.length === 0 ? (
              <p className="text-gray-400 text-sm">No upcoming group check-ins.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {upcomingContracts.map((c) => {
                  const statusColors: Record<string, string> = {
                    inquiry: 'bg-orange/10 text-orange',
                    confirmed: 'bg-green-light text-green',
                    checked_in: 'bg-blue-50 text-blue-600',
                  }
                  const statusLabels: Record<string, string> = {
                    inquiry: 'Inquiry',
                    confirmed: 'Confirmed',
                    checked_in: 'Checked In',
                  }
                  const daysLabel =
                    c.days_until_checkin === 0
                      ? 'Today'
                      : c.days_until_checkin === 1
                      ? 'Tomorrow'
                      : c.days_until_checkin !== undefined && c.days_until_checkin < 0
                      ? 'Checked in'
                      : `In ${c.days_until_checkin} days`

                  return (
                    <div key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-brand-black truncate">{c.group_name}</p>
                        <p className="text-xs text-gray-400">{c.check_in_date} · {c.room_count} rooms · {daysLabel}</p>
                        {c.cutoff_alert && (
                          <p className="text-[10px] font-bold text-red mt-0.5">Cutoff approaching</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[c.status] ?? 'bg-gray-100 text-gray-400'}`}>
                        {statusLabels[c.status] ?? c.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
              <span><span className="font-semibold text-brand-black">{groupStats?.total_active ?? 0}</span> active</span>
              <span><span className="font-semibold text-brand-black">{groupStats?.upcoming_this_week ?? 0}</span> arriving this week</span>
            </div>
          </SectionCard>
        </div>
      )}
    </PageWrapper>
  )
}
