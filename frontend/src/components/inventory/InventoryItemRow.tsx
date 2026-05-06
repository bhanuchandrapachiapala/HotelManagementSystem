import { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { timeAgo } from '../../lib/utils'
import { cn } from '../../lib/utils'
import type { InventoryItem } from '../../types'

const VENDOR_LABELS: Record<string, string> = {
  sysco: 'Sysco',
  costco: 'Costco',
  webstaurantstore: 'WebstaurantStore',
  members_mark: "Member's Mark",
  other: 'Other',
}

const VENDOR_COLORS: Record<string, string> = {
  sysco: 'bg-blue-100 text-blue-700',
  costco: 'bg-red/10 text-red',
  webstaurantstore: 'bg-purple-100 text-purple-700',
  members_mark: 'bg-green-light text-green',
  other: 'bg-gray-100 text-gray-500',
}

const STATUS_TEXT: Record<string, string> = {
  critical: 'text-red',
  low: 'text-yellow-hotel',
  ok: 'text-gray-400',
}

const STATUS_DOT: Record<string, string> = {
  critical: 'bg-red',
  low: 'bg-yellow-hotel',
  ok: 'bg-green',
}

function computeStatus(item: InventoryItem): 'critical' | 'low' | 'ok' {
  if (item.current_quantity <= item.min_quantity) return 'critical'
  if (item.current_quantity <= item.min_quantity * 1.2) return 'low'
  return 'ok'
}

interface Props {
  item: InventoryItem
  onUpdate: (
    itemId: number,
    data: {
      name?: string
      min_quantity?: number
      vendor?: string
      unit?: string
      notes?: string
      is_active?: boolean
    }
  ) => void
  isUpdating: boolean
}

export default function InventoryItemRow({ item, onUpdate, isUpdating }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [form, setForm] = useState({
    name: item.name,
    min_quantity: item.min_quantity,
    vendor: item.vendor,
    unit: item.unit,
    notes: item.notes ?? '',
  })

  const status = computeStatus(item)
  const dotClass = STATUS_DOT[status]
  const textClass = STATUS_TEXT[status]
  const vendorLabel = VENDOR_LABELS[item.vendor] ?? item.vendor
  const vendorColor = VENDOR_COLORS[item.vendor] ?? 'bg-gray-100 text-gray-500'

  function handleSave() {
    onUpdate(item.id, {
      name: form.name.trim() || undefined,
      min_quantity: form.min_quantity,
      vendor: form.vendor,
      unit: form.unit.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
    setEditing(false)
  }

  function handleDeactivate() {
    onUpdate(item.id, { is_active: false })
    setConfirmDeactivate(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 py-4 border-b border-gray-100 bg-orange/5 px-3 rounded-[10px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20 rounded-[10px] px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Min Qty
            </label>
            <input
              type="number"
              step="0.1"
              value={form.min_quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, min_quantity: parseFloat(e.target.value) || 0 }))
              }
              className="w-full border border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20 rounded-[10px] px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Unit
            </label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="w-full border border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20 rounded-[10px] px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Vendor
            </label>
            <select
              value={form.vendor}
              onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              className="w-full border border-gray-200 focus:border-orange rounded-[10px] px-3 py-2 text-sm outline-none bg-white"
            >
              <option value="sysco">Sysco</option>
              <option value="costco">Costco</option>
              <option value="webstaurantstore">WebstaurantStore</option>
              <option value="members_mark">Member's Mark</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Notes
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes…"
              className="w-full border border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20 rounded-[10px] px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isUpdating}
            className="flex items-center gap-1.5 bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2 text-sm transition-colors disabled:opacity-40"
          >
            <Check size={14} />
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3.5 border-b border-gray-100 last:border-0">
      {/* Left: status dot + name + vendor badge */}
      <div className="flex items-center gap-2.5 min-w-[200px] flex-1">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dotClass)} />
        <span className="font-semibold text-brand-black text-sm">{item.name}</span>
        <span
          className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0',
            vendorColor
          )}
        >
          {vendorLabel}
        </span>
      </div>

      {/* Middle: quantity */}
      <div className="flex flex-col items-start min-w-[90px]">
        <span className={cn('text-sm font-bold', textClass)}>
          {item.current_quantity} {item.unit}
        </span>
        <span className="text-[11px] text-gray-400">min: {item.min_quantity}</span>
      </div>

      {/* Right: last checked + actions */}
      <div className="flex items-center gap-3 ml-auto">
        <span className="text-xs text-gray-400 hidden sm:block">
          {item.last_checked_by && item.last_checked_at
            ? `Checked by ${item.last_checked_by} ${timeAgo(item.last_checked_at)}`
            : 'Never checked'}
        </span>

        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-[8px] text-gray-400 hover:text-orange hover:bg-orange/10 transition-colors"
          title="Edit item"
        >
          <Pencil size={14} />
        </button>

        {confirmDeactivate ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500">Deactivate?</span>
            <button
              onClick={handleDeactivate}
              disabled={isUpdating}
              className="font-semibold text-red hover:underline disabled:opacity-40"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDeactivate(false)}
              className="font-semibold text-gray-400 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeactivate(true)}
            className="p-1.5 rounded-[8px] text-gray-400 hover:text-red hover:bg-red/10 transition-colors"
            title="Deactivate item"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
