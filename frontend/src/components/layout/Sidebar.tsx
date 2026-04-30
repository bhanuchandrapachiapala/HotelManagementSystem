import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, UtensilsCrossed, BarChart2, Link, LogOut, BedDouble } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useTodayTasks } from '../../hooks/useTasks'
import { useTodayOrders } from '../../hooks/useOrders'
import { useHousekeepingProgress } from '../../hooks/useHousekeeping'
import { getToday, cn } from '../../lib/utils'

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { data: todayTasks } = useTodayTasks()
  const { data: todayOrders } = useTodayOrders()
  const { data: hkProgress } = useHousekeepingProgress(getToday())

  const pendingOrders = todayOrders?.pending ?? 0
  const pendingRooms = hkProgress?.total_pending ?? 0
  const tasksIncomplete =
    new Date().getHours() >= 17 && (todayTasks?.completed_count ?? 6) < 6

  const base = 'flex items-center gap-3 px-4 py-2.5 text-sm font-semibold border-l-[3px] transition-colors'
  const active = 'border-orange bg-orange/10 text-orange'
  const inactive = 'border-transparent text-white/55 hover:text-white hover:bg-white/5'

  function copyLink(path: string) {
    const url = `${window.location.origin}${path}`
    navigator.clipboard.writeText(url)
    toast.success(`Link copied!`)
    onClose?.()
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="w-[240px] h-full bg-brand-black flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <p className="font-display text-white text-lg font-bold tracking-wide">CASCO BAY</p>
        <p className="text-white/40 text-xs tracking-widest uppercase mt-0.5">Hotel Management</p>
        <div className="mt-3 h-[3px] w-10 rounded-full bg-gradient-to-r from-orange to-yellow-hotel" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="px-5 text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-2">Main</p>

        <NavLink
          to="/admin"
          end
          onClick={onClose}
          className={({ isActive }) => cn(base, isActive ? active : inactive)}
        >
          <LayoutDashboard size={16} />
          Home
        </NavLink>

        <NavLink
          to="/admin/business"
          onClick={onClose}
          className={({ isActive }) => cn(base, isActive ? active : inactive)}
        >
          <ClipboardList size={16} />
          Business Case
          {tasksIncomplete && (
            <span className="ml-auto text-[10px] font-bold bg-orange text-white px-1.5 py-0.5 rounded-full">!</span>
          )}
        </NavLink>

        <NavLink
          to="/admin/dinner"
          onClick={onClose}
          className={({ isActive }) => cn(base, isActive ? active : inactive)}
        >
          <UtensilsCrossed size={16} />
          Dinner Menu
          {pendingOrders > 0 && (
            <span className="ml-auto text-[10px] font-bold bg-orange text-white px-1.5 py-0.5 rounded-full">
              {pendingOrders}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/admin/housekeeping"
          onClick={onClose}
          className={({ isActive }) => cn(base, isActive ? active : inactive)}
        >
          <BedDouble size={16} />
          Housekeeping
          {pendingRooms > 0 && (
            <span className="ml-auto text-[10px] font-bold bg-orange text-white px-1.5 py-0.5 rounded-full">
              {pendingRooms}
            </span>
          )}
        </NavLink>

        <p className="px-5 text-[10px] uppercase tracking-widest text-white/30 font-semibold mt-5 mb-2">Insights</p>

        <NavLink
          to="/admin/reports"
          onClick={onClose}
          className={({ isActive }) => cn(base, isActive ? active : inactive)}
        >
          <BarChart2 size={16} />
          Reports
        </NavLink>

        <p className="px-5 text-[10px] uppercase tracking-widest text-white/30 font-semibold mt-5 mb-2">Quick Links</p>

        <button
          onClick={() => copyLink('/checklist')}
          className={cn(base, inactive, 'w-full text-left')}
        >
          <Link size={16} />
          Copy Checklist Link
        </button>

        <button
          onClick={() => copyLink('/dinner')}
          className={cn(base, inactive, 'w-full text-left')}
        >
          <Link size={16} />
          Copy Dinner Menu Link
        </button>

        <button
          onClick={() => copyLink('/housekeeping')}
          className={cn(base, inactive, 'w-full text-left')}
        >
          <Link size={16} />
          Copy Housekeeping Link
        </button>
      </nav>

      {/* Sign out */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-white/55 hover:text-red transition-colors rounded-[10px] hover:bg-red-light/10"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
