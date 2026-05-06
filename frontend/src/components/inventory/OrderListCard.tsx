import { Printer } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { InventoryItem } from '../../types'

const VENDOR_LABELS: Record<string, string> = {
  sysco: 'Sysco',
  costco: 'Costco',
  webstaurantstore: 'WebstaurantStore',
  members_mark: "Member's Mark",
  other: 'Other',
}

const VENDOR_PILL: Record<string, string> = {
  sysco: 'bg-blue-100 text-blue-700',
  costco: 'bg-red/10 text-red',
  webstaurantstore: 'bg-purple-100 text-purple-700',
  members_mark: 'bg-green-light text-green',
  other: 'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS: Record<string, string> = {
  breakfast_food: 'Breakfast & Food',
  disposables: 'Disposables & Supplies',
  room_amenities: 'Room Amenities',
  cleaning_supplies: 'Cleaning Supplies',
  front_desk: 'Front Desk & Office',
}

const CATEGORY_BG: Record<string, string> = {
  breakfast_food: 'bg-orange-100',
  disposables: 'bg-blue-100',
  room_amenities: 'bg-purple-100',
  cleaning_supplies: 'bg-green-100',
  front_desk: 'bg-gray-100',
}

const CATEGORY_EMOJI: Record<string, string> = {
  breakfast_food: '🍳',
  disposables: '🥤',
  room_amenities: '🛁',
  cleaning_supplies: '🧹',
  front_desk: '📋',
}

function computeStatus(item: InventoryItem): 'critical' | 'low' | 'ok' {
  if (item.current_quantity <= item.min_quantity) return 'critical'
  if (item.current_quantity <= item.min_quantity * 1.2) return 'low'
  return 'ok'
}

function itemEmoji(item: InventoryItem): string {
  return item.icon && item.icon !== '📦'
    ? item.icon
    : CATEGORY_EMOJI[item.category] ?? '📦'
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
  const pillClass = VENDOR_PILL[vendor] ?? 'bg-gray-100 text-gray-600'

  function printVendor() {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const rows = items
      .map((item) => {
        const emoji =
          item.icon && item.icon !== '📦' ? item.icon : (CATEGORY_EMOJI[item.category] ?? '')
        return `<tr>
        <td>${emoji} ${item.name}</td>
        <td>${item.unit}</td>
        <td>${item.current_quantity}</td>
        <td>${item.min_quantity}</td>
        <td><strong>${item.suggested_order} ${item.unit}</strong></td>
      </tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${vendorLabel} Order List — Casco Bay Hotel</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; background: #fff; padding: 32px; }
    h1 { font-size: 20px; font-weight: bold; margin: 0 0 2px; }
    .vendor { font-size: 15px; font-weight: bold; color: #444; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #888; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 1px solid #ccc; padding: 6px 8px; }
    td { padding: 7px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
    .footer { margin-top: 20px; font-size: 11px; color: #888; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Casco Bay Hotel</h1>
  <div class="vendor">${vendorLabel}</div>
  <div class="meta">Order List — ${today}</div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Unit</th>
        <th>Current Stock</th>
        <th>Min Required</th>
        <th>Order Qty</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">${items.length} item${items.length !== 1 ? 's' : ''} — printed ${today}</div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=800,height=700')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      win.print()
    }
  }

  return (
    <div className="bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
      {/* Vendor header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-3">
          <span className={cn('text-sm font-bold px-3 py-1 rounded-full', pillClass)}>
            {vendorLabel}
          </span>
          <span className="text-sm text-gray-500 font-medium">
            {items.length} item{items.length !== 1 ? 's' : ''} to order
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={printVendor}
            className="flex items-center gap-1 border border-gray-200 text-gray-500 hover:bg-gray-100 font-semibold rounded-[10px] px-3 py-1.5 text-xs transition-colors"
          >
            <Printer size={12} />
            Print
          </button>
          <button
            onClick={() => onMarkVendorOrdered(vendor)}
            className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-3 py-1.5 text-xs transition-colors"
          >
            Mark All {vendorLabel} as Ordered
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const status = computeStatus(item)
          const isSelected = selectedIds.has(item.id)
          const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category
          const emoji = itemEmoji(item)

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
                  <span
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0',
                      CATEGORY_BG[item.category] ?? 'bg-gray-100'
                    )}
                  >
                    {emoji}
                  </span>
                  <span className="text-sm font-semibold text-brand-black">{item.name}</span>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {categoryLabel}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Current: {item.current_quantity} {item.unit}&nbsp;&nbsp;|&nbsp;&nbsp;Min:{' '}
                  {item.min_quantity}&nbsp;&nbsp;|&nbsp;&nbsp;Suggested order: {item.suggested_order}{' '}
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
