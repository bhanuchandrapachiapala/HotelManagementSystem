import { cn } from '../../lib/utils'

interface TabNavProps {
  tabs: string[]
  activeTab: string
  onChange: (tab: string) => void
}

export default function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            'px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px',
            activeTab === tab
              ? 'border-orange text-orange'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
