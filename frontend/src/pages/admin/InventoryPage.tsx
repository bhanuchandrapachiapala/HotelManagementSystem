import { useState, useMemo } from 'react'
import { Printer, CheckCircle, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import PageWrapper from '../../components/layout/PageWrapper'
import SectionCard from '../../components/ui/SectionCard'
import TabNav from '../../components/ui/TabNav'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  useInventoryItems,
  useInventoryAlerts,
  useInventoryHistory,
  useMarkOrdered,
  useAddInventoryItem,
  useUpdateInventoryItem,
} from '../../hooks/useInventory'
import InventoryItemRow from '../../components/inventory/InventoryItemRow'
import OrderListCard from '../../components/inventory/OrderListCard'
import { cn, timeAgo } from '../../lib/utils'
import type { InventoryItem, InventoryLog } from '../../types'

const TABS = ['Stock Status', 'Order List', 'History & Analysis']

const CATEGORY_LABELS: Record<string, string> = {
  breakfast_food: 'Breakfast & Food',
  disposables: 'Disposables & Supplies',
  room_amenities: 'Room Amenities',
  cleaning_supplies: 'Cleaning Supplies',
  front_desk: 'Front Desk & Office',
}

const VENDOR_LABELS: Record<string, string> = {
  sysco: 'Sysco',
  costco: 'Costco',
  webstaurantstore: 'WebstaurantStore',
  members_mark: "Member's Mark",
  other: 'Other',
}

const CHANGE_TYPE_BADGE: Record<string, string> = {
  stock_check: 'bg-gray-100 text-gray-500',
  restock: 'bg-green-light text-green',
  order_placed: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-yellow-hotel/20 text-yellow-hotel',
}

const CHANGE_TYPE_LABEL: Record<string, string> = {
  stock_check: 'Stock Check',
  restock: 'Restock',
  order_placed: 'Order Placed',
  adjustment: 'Adjustment',
}

function computeStatus(item: InventoryItem): 'critical' | 'low' | 'ok' {
  if (item.current_quantity <= item.min_quantity) return 'critical'
  if (item.current_quantity <= item.min_quantity * 1.2) return 'low'
  return 'ok'
}

const STATUS_ORDER: Record<string, number> = { critical: 0, low: 1, ok: 2 }

const CATEGORY_FILTER_BUTTONS = [
  { key: 'all', label: 'All' },
  { key: 'breakfast_food', label: 'Breakfast & Food' },
  { key: 'disposables', label: 'Disposables' },
  { key: 'room_amenities', label: 'Room Amenities' },
  { key: 'cleaning_supplies', label: 'Cleaning Supplies' },
  { key: 'front_desk', label: 'Front Desk' },
]

const STATUS_FILTER_BUTTONS = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'low', label: 'Low' },
  { key: 'ok', label: 'OK' },
]

const EMPTY_ADD_FORM = {
  name: '',
  category: 'breakfast_food',
  vendor: 'sysco',
  unit: '',
  min_quantity: 0,
  current_quantity: 0,
  notes: '',
}

// ─── Stock Status Tab ─────────────────────────────────────────────────────────

function StockStatusTab() {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM)

  const { data: itemsData, isLoading } = useInventoryItems()
  const addItem = useAddInventoryItem()
  const updateItem = useUpdateInventoryItem()

  const allItems: InventoryItem[] = useMemo(
    () => (itemsData?.items ?? []).filter((i: InventoryItem) => i.is_active),
    [itemsData]
  )

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      const status = computeStatus(item)
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (vendorFilter !== 'all' && item.vendor !== vendorFilter) return false
      if (statusFilter !== 'all' && status !== statusFilter) return false
      return true
    })
  }, [allItems, categoryFilter, vendorFilter, statusFilter])

  const criticalCount = useMemo(
    () => allItems.filter((i) => computeStatus(i) === 'critical').length,
    [allItems]
  )
  const lowCount = useMemo(
    () => allItems.filter((i) => computeStatus(i) === 'low').length,
    [allItems]
  )
  const okCount = useMemo(
    () => allItems.filter((i) => computeStatus(i) === 'ok').length,
    [allItems]
  )

  const groupedByCategory = useMemo(() => {
    const cats =
      categoryFilter === 'all'
        ? Object.keys(CATEGORY_LABELS)
        : [categoryFilter]
    return cats
      .map((cat) => ({
        cat,
        items: filtered
          .filter((i) => i.category === cat)
          .sort((a, b) => {
            const sa = STATUS_ORDER[computeStatus(a)] ?? 3
            const sb = STATUS_ORDER[computeStatus(b)] ?? 3
            if (sa !== sb) return sa - sb
            return a.name.localeCompare(b.name)
          }),
      }))
      .filter((g) => g.items.length > 0)
  }, [filtered, categoryFilter])

  function setAddField(field: string, value: string | number) {
    setAddForm((f) => ({ ...f, [field]: value }))
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      await addItem.mutateAsync({
        name: addForm.name.trim(),
        category: addForm.category,
        vendor: addForm.vendor,
        unit: addForm.unit.trim(),
        min_quantity: Number(addForm.min_quantity),
        current_quantity: Number(addForm.current_quantity),
        notes: addForm.notes.trim() || undefined,
      })
      toast.success('Item added')
      setAddForm(EMPTY_ADD_FORM)
      setShowAddForm(false)
    } catch {
      toast.error('Failed to add item')
    }
  }

  function handleUpdate(
    itemId: number,
    data: {
      name?: string
      min_quantity?: number
      vendor?: string
      unit?: string
      notes?: string
      is_active?: boolean
    }
  ) {
    updateItem.mutateAsync({ itemId, data }).catch(() => toast.error('Update failed'))
  }

  const inputCls =
    'w-full border border-gray-200 focus:border-orange focus:ring-1 focus:ring-orange/20 rounded-[10px] px-3 py-2 text-sm outline-none bg-white'

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {CATEGORY_FILTER_BUTTONS.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setCategoryFilter(btn.key)}
            className={cn(
              'text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
              categoryFilter === btn.key
                ? 'bg-orange text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="border border-gray-200 focus:border-orange rounded-[10px] px-3 py-1.5 text-sm outline-none bg-white"
        >
          <option value="all">All Vendors</option>
          {Object.entries(VENDOR_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={cn(
                'text-xs font-semibold px-3 py-1.5 rounded-full transition-colors',
                statusFilter === btn.key
                  ? 'bg-orange text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="ml-auto flex items-center gap-1.5 bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2 text-sm transition-colors"
        >
          <Plus size={14} />
          Add Item
        </button>
      </div>

      {/* Summary mini-stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-brand-black">{criticalCount}</p>
            <p className="text-xs text-gray-400">Critical</p>
          </div>
        </div>
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-hotel flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-brand-black">{lowCount}</p>
            <p className="text-xs text-gray-400">Low</p>
          </div>
        </div>
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-green flex-shrink-0" />
          <div>
            <p className="text-xl font-bold text-brand-black">{okCount}</p>
            <p className="text-xs text-gray-400">OK</p>
          </div>
        </div>
      </div>

      {/* Add item form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="border border-gray-100 rounded-card bg-gray-50/40 p-5 mb-5 space-y-4"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display text-base font-semibold">Add Inventory Item</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Name *
              </label>
              <input
                type="text"
                className={inputCls}
                value={addForm.name}
                onChange={(e) => setAddField('name', e.target.value)}
                placeholder="Item name"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Category
              </label>
              <select
                className={inputCls}
                value={addForm.category}
                onChange={(e) => setAddField('category', e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Vendor
              </label>
              <select
                className={inputCls}
                value={addForm.vendor}
                onChange={(e) => setAddField('vendor', e.target.value)}
              >
                {Object.entries(VENDOR_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Unit
              </label>
              <input
                type="text"
                className={inputCls}
                value={addForm.unit}
                onChange={(e) => setAddField('unit', e.target.value)}
                placeholder="e.g. cases, packs, boxes"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Min Quantity
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                className={inputCls}
                value={addForm.min_quantity}
                onChange={(e) => setAddField('min_quantity', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Current Quantity
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                className={inputCls}
                value={addForm.current_quantity}
                onChange={(e) => setAddField('current_quantity', e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">
                Notes
              </label>
              <input
                type="text"
                className={inputCls}
                value={addForm.notes}
                onChange={(e) => setAddField('notes', e.target.value)}
                placeholder="Optional notes…"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={addItem.isPending}
              className="bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-6 py-2.5 text-sm transition-colors disabled:opacity-40"
            >
              {addItem.isPending ? 'Adding…' : 'Add Item'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Item list */}
      {isLoading ? (
        <LoadingSpinner />
      ) : groupedByCategory.length === 0 ? (
        <EmptyState
          icon="📦"
          message="No items match your filters"
          subtext="Try adjusting the category, vendor, or status filter."
        />
      ) : (
        <div className="space-y-5">
          {groupedByCategory.map(({ cat, items }) => {
            const critInCat = items.filter((i) => computeStatus(i) === 'critical').length
            return (
              <SectionCard key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-display text-base font-semibold text-brand-black">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h2>
                  {critInCat > 0 && (
                    <span className="text-[10px] font-bold bg-red text-white px-2 py-0.5 rounded-full">
                      {critInCat} critical
                    </span>
                  )}
                </div>
                <div>
                  {items.map((item) => (
                    <InventoryItemRow
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdate}
                      isUpdating={updateItem.isPending}
                    />
                  ))}
                </div>
              </SectionCard>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Vendor display order for Order List
const VENDOR_ORDER = ['sysco', 'costco', 'webstaurantstore', 'members_mark', 'other']

const CATEGORY_EMOJI_PRINT: Record<string, string> = {
  breakfast_food: '🍳',
  disposables: '🥤',
  room_amenities: '🛁',
  cleaning_supplies: '🧹',
  front_desk: '📋',
}

// ─── Order List Tab ───────────────────────────────────────────────────────────

function OrderListTab() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const { data: alertsData, isLoading } = useInventoryAlerts()
  const markOrdered = useMarkOrdered()

  const byVendor: Record<string, InventoryItem[]> = alertsData?.by_vendor ?? {}
  // Ordered: Sysco → Costco → WebstaurantStore → Member's Mark → Other
  const vendorKeys = VENDOR_ORDER.filter((v) => (byVendor[v]?.length ?? 0) > 0)

  function toggleId(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleMarkSelected() {
    const ids =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : vendorKeys.flatMap((v) => byVendor[v].map((i) => i.id))
    if (ids.length === 0) return
    try {
      await markOrdered.mutateAsync({ itemIds: ids, updatedBy: 'Admin' })
      setSelectedIds(new Set())
      toast.success('Marked as ordered')
    } catch {
      toast.error('Failed to mark ordered')
    }
  }

  async function handleMarkVendorOrdered(vendor: string) {
    const ids = (byVendor[vendor] ?? []).map((i) => i.id)
    if (ids.length === 0) return
    try {
      await markOrdered.mutateAsync({ itemIds: ids, updatedBy: 'Admin' })
      toast.success(`${VENDOR_LABELS[vendor] ?? vendor} items marked as ordered`)
    } catch {
      toast.error('Failed to mark ordered')
    }
  }

  function handlePrint() {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    let body = ''
    VENDOR_ORDER.forEach((vendor) => {
      const items = byVendor[vendor]
      if (!items || items.length === 0) return
      const vendorLabel = VENDOR_LABELS[vendor] ?? vendor
      body += `<div class="vendor-section">
  <div class="vendor-header">${vendorLabel} — ${items.length} item${items.length !== 1 ? 's' : ''}</div>`
      items.forEach((item) => {
        const emoji =
          item.icon && item.icon !== '📦'
            ? item.icon
            : (CATEGORY_EMOJI_PRINT[item.category] ?? '')
        body += `
  <div class="item-row">
    <span class="item-name">${emoji} ${item.name}</span>
    <span class="item-info">Current: ${item.current_quantity} ${item.unit} &nbsp;|&nbsp; Min: ${item.min_quantity} &nbsp;|&nbsp; Order: ${item.suggested_order} ${item.unit}</span>
  </div>`
      })
      body += `\n</div>`
    })

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Order List — Casco Bay Hotel</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: bold; margin: 0 0 4px; }
    .subtitle { font-size: 14px; color: #555; margin-bottom: 28px; border-bottom: 2px solid #000; padding-bottom: 12px; }
    .vendor-section { margin-bottom: 28px; page-break-inside: avoid; }
    .vendor-header { font-size: 15px; font-weight: bold; text-decoration: underline; margin-bottom: 10px; padding-bottom: 4px; }
    .item-row { display: flex; justify-content: space-between; align-items: baseline; padding: 5px 0; border-bottom: 1px solid #e5e5e5; gap: 16px; }
    .item-name { font-weight: 500; flex: 1; }
    .item-info { color: #555; font-size: 12px; white-space: nowrap; }
    @media print { body { padding: 16px; } button { display: none !important; } }
  </style>
</head>
<body>
  <h1>Casco Bay Hotel</h1>
  <div class="subtitle">Order List — ${today}</div>
  ${body}
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

  const allAlertItems = vendorKeys.flatMap((v) => byVendor[v])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-base font-semibold text-brand-black">
          Items Needing Reorder
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={vendorKeys.length === 0}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold rounded-[10px] px-4 py-2 text-sm transition-colors disabled:opacity-40"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={handleMarkSelected}
            disabled={markOrdered.isPending || allAlertItems.length === 0}
            className="flex items-center gap-1.5 bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2 text-sm transition-colors disabled:opacity-40"
          >
            <CheckCircle size={14} />
            Mark All Ordered
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : vendorKeys.length === 0 ? (
        <EmptyState
          icon="✅"
          message="All Stocked Up!"
          subtext="No items are currently below their minimum quantities."
        />
      ) : (
        <div className="space-y-4">
          {vendorKeys.map((vendor) => (
            <OrderListCard
              key={vendor}
              vendor={vendor}
              items={byVendor[vendor]}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onMarkVendorOrdered={handleMarkVendorOrdered}
            />
          ))}

          {selectedIds.size > 0 && (
            <div className="sticky bottom-4 flex justify-center">
              <button
                onClick={handleMarkSelected}
                disabled={markOrdered.isPending}
                className="flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-semibold rounded-full px-6 py-3 text-sm shadow-lg transition-colors disabled:opacity-40"
              >
                <CheckCircle size={15} />
                Mark {selectedIds.size} selected as ordered
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── History & Analysis Tab ───────────────────────────────────────────────────

function HistoryTab() {
  const { data: historyData, isLoading: loadingHistory } = useInventoryHistory()
  const { data: itemsData, isLoading: loadingItems } = useInventoryItems()

  const logs: InventoryLog[] = historyData?.logs ?? []
  const items: InventoryItem[] = itemsData?.items ?? []

  const chartData = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {}
    logs.forEach((log) => {
      const name = log.item_name ?? `Item ${log.item_id}`
      if (!counts[name]) counts[name] = { name, count: 0 }
      counts[name].count++
    })
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [logs])

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (!a.last_checked_at && !b.last_checked_at) return a.name.localeCompare(b.name)
      if (!a.last_checked_at) return -1
      if (!b.last_checked_at) return 1
      return new Date(a.last_checked_at).getTime() - new Date(b.last_checked_at).getTime()
    })
  }, [items])

  return (
    <div className="space-y-6">
      {/* Section 1: Recent stock updates */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold text-brand-black mb-4">
          Recent Stock Updates
        </h2>
        {loadingHistory ? (
          <LoadingSpinner />
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-400">No history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Item', 'Category', 'Changed By', 'Change', 'Type', 'Time'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 50).map((log) => {
                  const changeType = log.change_type ?? ''
                  const badgeCls = CHANGE_TYPE_BADGE[changeType] ?? 'bg-gray-100 text-gray-500'
                  const badgeLabel = CHANGE_TYPE_LABEL[changeType] ?? changeType
                  return (
                    <tr
                      key={log.id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-brand-black whitespace-nowrap">
                        {log.item_name ?? `Item ${log.item_id}`}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {CATEGORY_LABELS[log.category ?? ''] ?? log.category ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {log.updated_by ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-gray-500">{log.previous_qty}</span>
                        <span className="text-gray-300 mx-1.5">→</span>
                        <span
                          className={cn(
                            'font-semibold',
                            log.new_qty > log.previous_qty
                              ? 'text-green'
                              : log.new_qty < log.previous_qty
                              ? 'text-red'
                              : 'text-gray-500'
                          )}
                        >
                          {log.new_qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 rounded-full',
                            badgeCls
                          )}
                        >
                          {badgeLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                        {timeAgo(log.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Section 2: Bar chart — most often running low */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold text-brand-black mb-4">
          Items Most Often Running Low
        </h2>
        {loadingHistory ? (
          <LoadingSpinner />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#888' }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [`${v} entries`, 'Log count']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill="#F47920" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Section 3: Last check summary */}
      <SectionCard>
        <h2 className="font-display text-base font-semibold text-brand-black mb-4">
          Last Check Summary
        </h2>
        {loadingItems ? (
          <LoadingSpinner />
        ) : sortedItems.length === 0 ? (
          <p className="text-sm text-gray-400">No items yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {['Item', 'Category', 'Last Checked By', 'Last Checked At'].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => {
                  const neverChecked = !item.last_checked_at
                  return (
                    <tr
                      key={item.id}
                      className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'font-semibold',
                            neverChecked ? 'text-red' : 'text-brand-black'
                          )}
                        >
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {item.last_checked_by ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {neverChecked ? (
                          <span className="text-red font-semibold text-xs">Never checked</span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            {timeAgo(item.last_checked_at!)}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const [tab, setTab] = useState(TABS[0])

  return (
    <PageWrapper>
      <TabNav tabs={TABS} activeTab={tab} onChange={setTab} />
      {tab === 'Stock Status' && <StockStatusTab />}
      {tab === 'Order List' && <OrderListTab />}
      {tab === 'History & Analysis' && <HistoryTab />}
    </PageWrapper>
  )
}
