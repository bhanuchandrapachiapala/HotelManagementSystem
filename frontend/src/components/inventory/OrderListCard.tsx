import { cn } from '../../lib/utils'
import type { InventoryItem } from '../../types'

const VENDOR_LABELS: Record<string, string> = {
  sysco: 'Sysco',
  costco: 'Costco',
  webstaurantstore: 'WebstaurantStore',
  members_mark: "Member's Mark",
  other: 'Other',
}

const CATEGORY_LABELS: Record<string, string> = {
  breakfast_food: 'Breakfast & Food',
  disposables: 'Disposables & Supplies',
  room_amenities: 'Room Amenities',
  cleaning_supplies: 'Cleaning Supplies',
  front_desk: 'Front Desk & Office',
}

function computeStatus(item: InventoryItem): 'critical' | 'low' | 'ok' {
  if (item.current_quantity <= item.min_quantity) return 'critical'
  if (item.current_quantity <= item.min_quantity * 1.2) return 'low'
  return 'ok'
}

interface Props {
  vendor: string
  items: InventoryItem[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
  onMarkVendorOrdered: (vendor: string) => void
}

export default function OrderListCard({
  vendor,
  items,
  selectedIds,
  onToggle,
  onMarkVendorOrdered,
}: Props) {
  const vendorLabel = VENDOR_LABELS[vendor] ?? vendor

  return (
    <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
      {/* Vendor header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-base font-bold text-brand-black">
            {vendorLabel}
          </h3>
          <span className="text-sm text-gray-500 font-medium">
            {items.length} item{items.length !== 1 ? 's' : ''} to order
          </span>
        </div>
        <button
          onClick={() => onMarkVendorOrdered(vendor)}
          className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-3 py-1.5 text-xs transition-colors"
        >
          Mark All {vendorLabel} as Ordered
        </button>
      </div>

      {/* Item list */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const status = computeStatus(item)
          const isSelected = selectedIds.has(item.id)
          const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 px-5 py-3.5 transition-colors',
                isSelected ? 'bg-orange/5' : 'hover:bg-gray-50/60'
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(item.id)}
                className="mt-1 h-4 w-4 rounded accent-orange flex-shrink-0 cursor-pointer"
              />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-brand-black">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {categoryLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Current: {item.current_quantity} {item.unit} &nbsp;|&nbsp; Min:{' '}
                  {item.min_quantity} &nbsp;|&nbsp; Suggested order: {item.suggested_order}{' '}
                  {item.unit}
                </p>
              </div>

              <span
                className={cn(
                  'flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full text-white',
                  status === 'critical' ? 'bg-red' : 'bg-yellow-hotel'
                )}
              >
                {status === 'critical' ? 'Critical' : 'Low'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
