import { format } from 'date-fns'
import { Menu } from 'lucide-react'

interface TopbarProps {
  title: string
  onMenuClick: () => void
}

export default function Topbar({ title, onMenuClick }: TopbarProps) {
  const today = format(new Date(), 'EEE, MMM d, yyyy')

  return (
    <header className="h-[60px] bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-gray-600" />
        </button>
        <h1 className="font-display text-xl font-semibold text-brand-black">{title}</h1>
      </div>
      <div className="text-xs font-semibold bg-orange-light text-orange px-3 py-1.5 rounded-full">
        {today}
      </div>
    </header>
  )
}
