import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TaskHistoryDay } from '../../types'

interface HistoryChartProps {
  data: TaskHistoryDay[]
}

export default function HistoryChart({ data }: HistoryChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    tasks: d.completed_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#888' }} />
        <YAxis domain={[0, 6]} ticks={[0, 2, 4, 6]} tick={{ fontSize: 11, fill: '#888' }} />
        <Tooltip
          formatter={(value) => [`${value} tasks`, 'Completed']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="tasks" fill="#F47920" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
