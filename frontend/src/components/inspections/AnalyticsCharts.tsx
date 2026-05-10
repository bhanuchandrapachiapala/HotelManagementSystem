import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '../../lib/utils'
import type { AnalyticsResponse } from '../../types'

interface AnalyticsChartsProps {
  data: AnalyticsResponse
}

const SEVERITY_COLORS: Record<string, string> = {
  urgent: '#dc2626',
  standard: '#eab308',
  minor: '#3b82f6',
  note: '#9ca3af',
}

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const categoryData = data.issues_by_category.map((c) => ({
    name: `${c.emoji} ${c.label}`,
    count: c.count,
  }))

  const severityData = data.issues_by_severity.map((s) => ({
    name: s.severity.charAt(0).toUpperCase() + s.severity.slice(1),
    count: s.count,
    resolved: s.resolved,
    sla_met: s.sla_met,
  }))

  const trendData = data.monthly_trend.map((m) => ({
    month: m.month,
    inspections: m.inspections,
    issues: m.issues,
  }))

  return (
    <>
      {/* Row 2 — two side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="font-display text-base font-semibold mb-4">Issues by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryData} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#F47920" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="font-display text-base font-semibold mb-4">Issues by Severity</h3>
          {severityData.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={severityData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" fill="#9ca3af" radius={[6, 6, 0, 0]} name="Total" />
                <Bar dataKey="resolved" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Resolved" />
                <Bar dataKey="sla_met" fill="#10b981" radius={[6, 6, 0, 0]} name="SLA Met" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3 — trend + SLA compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="font-display text-base font-semibold mb-4">Monthly Trend</h3>
          {trendData.length === 0 ? (
            <p className="text-sm text-gray-400">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="inspections" stroke="#F47920" strokeWidth={2.5} dot={{ r: 4 }} name="Inspections" />
                <Line type="monotone" dataKey="issues" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} name="Issues" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6">
          <h3 className="font-display text-base font-semibold mb-4">SLA Compliance by Severity</h3>
          <div className="space-y-4">
            {(['urgent', 'standard', 'minor'] as const).map((sev) => {
              const stats = data.sla_compliance[sev] ?? { total: 0, within_sla: 0, compliance_rate: 0 }
              const rate = stats.compliance_rate
              let barColor = 'bg-green'
              if (rate < 60) barColor = 'bg-red'
              else if (rate < 80) barColor = 'bg-yellow-500'
              return (
                <div key={sev}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold capitalize" style={{ color: SEVERITY_COLORS[sev] }}>
                      {sev}
                    </span>
                    <span className="text-xs text-gray-500">
                      {stats.within_sla}/{stats.total} · {rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all', barColor)}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {(!data.sla_compliance.urgent && !data.sla_compliance.standard && !data.sla_compliance.minor) && (
              <p className="text-sm text-gray-400">No data for this period.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
