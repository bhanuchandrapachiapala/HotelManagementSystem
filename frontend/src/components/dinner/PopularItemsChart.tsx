import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { PopularItem } from '../../types'

interface PopularItemsChartProps {
  entrees: PopularItem[]
  sides: PopularItem[]
  desserts: PopularItem[]
  drinks: PopularItem[]
}

type Category = 'Entrées' | 'Sides' | 'Desserts' | 'Drinks'

export default function PopularItemsChart({ entrees, sides, desserts, drinks }: PopularItemsChartProps) {
  const [tab, setTab] = useState<Category>('Entrées')

  const dataMap: Record<Category, PopularItem[]> = {
    'Entrées': entrees,
    'Sides':   sides,
    'Desserts': desserts,
    'Drinks':  drinks,
  }

  const current = dataMap[tab] ?? []
  const chartData = current.map((d) => ({ name: d.item, count: d.count }))
  const tabs: Category[] = ['Entrées', 'Sides', 'Desserts', 'Drinks']

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              tab === t ? 'bg-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {chartData.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#888' }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={index === 0 ? '#F47920' : '#FDB924'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
