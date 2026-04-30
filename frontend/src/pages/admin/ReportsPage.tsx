import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useTaskHistory, useTasksRange } from '../../hooks/useTasks'
import { useOrderHistory, useTodayOrders } from '../../hooks/useOrders'
import { useHousekeepingProgress, useAssignments } from '../../hooks/useHousekeeping'
import { getMonthRange, getToday } from '../../lib/utils'
import { format } from 'date-fns'

export default function ReportsPage() {
  const { data: taskHistory, isLoading: loadingTasks } = useTaskHistory(7)
  const { data: orderHistory, isLoading: loadingOrders } = useOrderHistory(7)
  const { data: todayOrders } = useTodayOrders()
  const today = format(new Date(), 'yyyy-MM')
  const { start, end } = getMonthRange(today)
  useTasksRange(start, end)

  const todayDate = getToday()
  const { data: hkProgress, isLoading: loadingHKProgress } = useHousekeepingProgress(todayDate)
  const { data: assignmentsData, isLoading: loadingAssignments } = useAssignments(todayDate)

  const taskChartData = taskHistory?.history.map((d) => ({
    label: d.label,
    tasks: d.completed_count,
  })) ?? []

  const orderChartData = orderHistory?.history.map((d) => ({
    label: d.label,
    orders: d.total,
  })) ?? []

  const hkChartData = (hkProgress?.housekeepers ?? [])
    .filter((h) => h.assigned > 0)
    .map((h) => ({
      name: h.housekeeper_name.split(' ')[0],
      rate: h.completion_rate,
    }))

  const assignments = assignmentsData?.assignments ?? []
  const floorBreakdown = [1, 2, 3, 4].map((f) => {
    const fa = assignments.filter((a) => a.floor === f)
    const done = fa.filter((a) => a.status === 'done').length
    const assigned = fa.length
    return {
      floor: f,
      total: 34,
      assigned,
      done,
      pending: assigned - done,
      rate: assigned ? Math.round((done / assigned) * 100) : 0,
    }
  })

  function exportTasksCSV() {
    const header = 'Date,Completed Count,Completion Rate,Label'
    const rows = taskHistory?.history.map(
      (d) => `${d.date},${d.completed_count},${d.completion_rate}%,${d.label}`
    ) ?? []
    downloadCSV([header, ...rows].join('\n'), 'task_log.csv')
  }

  function exportOrdersCSV() {
    const header = 'ID,Room,Initials,Entrée,Sides,Dessert,Drink,Status,Submitted At'
    const rows = todayOrders?.orders.map(
      (o) =>
        `${o.id},${o.room_number},${o.guest_initials},${o.entree},"${o.sides.join('; ')}",${o.dessert},${o.drink},${o.status},${o.submitted_at}`
    ) ?? []
    downloadCSV([header, ...rows].join('\n'), 'order_history.csv')
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageWrapper>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <SectionCard>
          <h2 className="font-display text-base font-semibold mb-5">Weekly Task Completion</h2>
          {loadingTasks ? (
            <LoadingSpinner />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={taskChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis domain={[0, 6]} ticks={[0, 2, 4, 6]} tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip
                  formatter={(v) => [`${v} tasks`, 'Completed']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="tasks" fill="#F47920" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard>
          <h2 className="font-display text-base font-semibold mb-5">Daily Order Volume</h2>
          {loadingOrders ? (
            <LoadingSpinner />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [`${v} orders`, 'Orders']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="orders" fill="#FDB924" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Housekeeping Performance */}
      <SectionCard className="mb-5">
        <h2 className="font-display text-base font-semibold mb-5">Housekeeping Performance</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Per-housekeeper completion rate chart */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Today's Completion Rate by Housekeeper
            </p>
            {loadingHKProgress ? (
              <LoadingSpinner />
            ) : hkChartData.length === 0 ? (
              <p className="text-sm text-gray-400">No assignments today.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hkChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: '#888' }} unit="%" />
                  <Tooltip
                    formatter={(v) => [`${v}%`, 'Completion']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {hkChartData.map((_, i) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#F47920' : '#FDB924'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Floor breakdown table */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Floor Breakdown
            </p>
            {loadingAssignments ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {['Floor', 'Total', 'Assigned', 'Done', 'Pending', '%'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500 uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {floorBreakdown.map((row) => (
                      <tr key={row.floor} className="border-t border-gray-100">
                        <td className="px-3 py-2.5 font-semibold">Floor {row.floor}</td>
                        <td className="px-3 py-2.5 text-gray-500">{row.total}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.assigned}</td>
                        <td className="px-3 py-2.5 text-green font-semibold">{row.done}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.pending}</td>
                        <td className="px-3 py-2.5 font-bold text-brand-black">{row.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <h2 className="font-display text-base font-semibold mb-5">Export Data</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportTasksCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange hover:text-orange font-semibold rounded-[10px] px-5 py-3 transition-colors text-sm"
          >
            ⬇ Export Task Log (CSV)
          </button>
          <button
            onClick={exportOrdersCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange hover:text-orange font-semibold rounded-[10px] px-5 py-3 transition-colors text-sm"
          >
            ⬇ Export Order History (CSV)
          </button>
        </div>
      </SectionCard>
    </PageWrapper>
  )
}
