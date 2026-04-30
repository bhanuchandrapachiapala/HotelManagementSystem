import { getDaysInMonth, getFirstDayOfMonth, formatShortDate } from '../../lib/utils'
import type { TaskRangeDay } from '../../types'

interface HeatmapGridProps {
  year: number
  month: number
  data: TaskRangeDay[]
}

function getCellColor(rate: number | undefined, hasDayData: boolean): string {
  if (!hasDayData) return '#E8E8E8'
  if (rate === undefined || rate === 0) return '#E8E8E8'
  if (rate < 50) return '#FFE4C8'
  if (rate < 75) return '#FFBA7A'
  if (rate < 100) return '#F47920'
  return '#C95E10'
}

export default function HeatmapGrid({ year, month, data }: HeatmapGridProps) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const today = new Date()
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const dataMap = new Map(data.map((d) => [d.date, d]))

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="aspect-square" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const cellDate = new Date(year, month, day)
          const isFuture = cellDate > today
          const dayData = dataMap.get(dateStr)
          const hasDayData = !!dayData && dayData.completed_count > 0
          const color = isFuture ? 'transparent' : getCellColor(dayData?.completion_rate, hasDayData)
          const tooltip = dayData
            ? `${formatShortDate(dateStr)}: ${dayData.completed_count}/6 tasks`
            : `${formatShortDate(dateStr)}: No data`

          return (
            <div
              key={idx}
              title={tooltip}
              className="aspect-square rounded-[4px] cursor-default"
              style={{
                backgroundColor: isFuture ? '#F3F4F6' : color,
                opacity: isFuture ? 0.4 : 1,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
