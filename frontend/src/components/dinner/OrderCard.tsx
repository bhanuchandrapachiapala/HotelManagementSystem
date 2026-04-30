import { timeAgo } from '../../lib/utils'
import type { DinnerOrder } from '../../types'
import OrderStatusSelect from './OrderStatusSelect'

interface OrderCardProps {
  order: DinnerOrder
  onStatusChange: (id: number, status: string) => void
}

export default function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const summary = [order.entree, ...order.sides, order.dessert, order.drink].join(' · ')

  return (
    <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-14 h-14 bg-brand-black rounded-[10px] flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Room</span>
        <span className="text-white font-bold text-lg leading-tight">{order.room_number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-brand-black">{order.guest_initials}</p>
        <p className="text-gray-400 text-xs mt-0.5 truncate">{summary}</p>
        <p className="text-gray-300 text-xs mt-0.5">{timeAgo(order.submitted_at)}</p>
        {order.notes && (
          <p className="text-xs text-orange mt-1 italic">Note: {order.notes}</p>
        )}
      </div>
      <OrderStatusSelect
        value={order.status}
        onChange={(s) => onStatusChange(order.id, s)}
      />
    </div>
  )
}
