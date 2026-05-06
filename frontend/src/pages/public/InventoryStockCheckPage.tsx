import { useState } from 'react'
import toast from 'react-hot-toast'
import { getToday } from '../../lib/utils'
import { useInventoryItems, useBulkUpdate } from '../../hooks/useInventory'
import StockCheckItem from '../../components/inventory/StockCheckItem'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import type { InventoryItem } from '../../types'

const CATEGORIES = [
  { key: 'breakfast_food', label: 'Breakfast & Food', icon: '🍳' },
  { key: 'disposables', label: 'Disposables & Supplies', icon: '🥤' },
  { key: 'room_amenities', label: 'Room Amenities', icon: '🛁' },
  { key: 'cleaning_supplies', label: 'Cleaning Supplies', icon: '🧹' },
  { key: 'front_desk', label: 'Front Desk & Office', icon: '📋' },
]

const todayDisplay = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

export default function InventoryStockCheckPage() {
  const today = getToday()

  const [name, setName] = useState('')
  const [committedName, setCommittedName] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<number, number>>({})

  const { data, isLoading } = useInventoryItems()
  const bulkUpdate = useBulkUpdate()

  const allItems: InventoryItem[] = data?.items ?? []

  function isCategoryCheckedToday(catKey: string): boolean {
    const catItems = allItems.filter((i) => i.category === catKey && i.is_active)
    if (catItems.length === 0) return false
    return catItems.every(
      (i) => i.last_checked_at && i.last_checked_at.slice(0, 10) === today
    )
  }

  const checkedToday = new Set(
    CATEGORIES.filter((c) => isCategoryCheckedToday(c.key)).map((c) => c.key)
  )

  const allDone = checkedToday.size === CATEGORIES.length

  function handleStartStockCheck() {
    if (name.trim().length === 0) return
    setCommittedName(name.trim())
  }

  function handleSelectCategory(catKey: string) {
    const catItems = allItems.filter((i) => i.category === catKey && i.is_active)
    const initial: Record<number, number> = {}
    catItems.forEach((i) => {
      initial[i.id] = i.current_quantity
    })
    setQuantities(initial)
    setSelectedCategory(catKey)
  }

  function handleBack() {
    setSelectedCategory(null)
    setQuantities({})
  }

  async function handleSave() {
    if (!selectedCategory) return
    const catItems = allItems.filter((i) => i.category === selectedCategory && i.is_active)
    const updates = catItems
      .filter((i) => quantities[i.id] !== undefined && quantities[i.id] !== i.current_quantity)
      .map((i) => ({
        item_id: i.id,
        current_quantity: quantities[i.id],
        updated_by: committedName,
        change_type: 'stock_check',
      }))

    if (updates.length === 0) return

    const catLabel = CATEGORIES.find((c) => c.key === selectedCategory)?.label ?? selectedCategory

    try {
      await bulkUpdate.mutateAsync({ updates, updatedBy: committedName })
      toast.success(`✓ ${updates.length} item${updates.length !== 1 ? 's' : ''} saved for ${catLabel}`)
      handleBack()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Save failed. Please try again.')
    }
  }

  const selectedCatItems = selectedCategory
    ? allItems.filter((i) => i.category === selectedCategory && i.is_active)
    : []

  const hasChanges = selectedCatItems.some(
    (i) => quantities[i.id] !== undefined && quantities[i.id] !== i.current_quantity
  )

  const selectedCatMeta = CATEGORIES.find((c) => c.key === selectedCategory)

  return (
    <div className="min-h-screen bg-[#F8F7F5] pb-32 overflow-x-hidden">
      <div className="max-w-lg mx-auto px-4 pt-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold text-brand-black">CASCO BAY HOTEL</h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase mt-1">Stock Check</p>
          <div className="mt-3 inline-block bg-gradient-to-r from-orange to-yellow-hotel text-white text-sm px-4 py-1 rounded-full">
            {todayDisplay}
          </div>
        </div>

        {/* Step 1 — Name Entry */}
        {!committedName && (
          <div className="bg-white rounded-card shadow-sm border border-gray-100 p-6 max-w-md mx-auto mt-8">
            <label className="block text-sm font-semibold text-brand-black mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStartStockCheck()}
              placeholder="Enter your name…"
              className="border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-3 w-full outline-none text-brand-black"
              style={{ fontSize: '16px' }}
            />
            <button
              type="button"
              disabled={name.trim().length === 0}
              onClick={handleStartStockCheck}
              className="mt-4 w-full bg-orange text-white rounded-[10px] py-3 text-base font-semibold h-12 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dark transition-colors"
            >
              Start Stock Check
            </button>
          </div>
        )}

        {/* Step 2 — Category Selection */}
        {committedName && !selectedCategory && (
          <>
            {isLoading ? (
              <LoadingSpinner />
            ) : allDone ? (
              <div className="bg-white rounded-card shadow-sm border border-gray-100 p-8 text-center max-w-md mx-auto">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="font-display text-xl font-bold text-brand-black mb-2">
                  All done! Stock check complete.
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                  Great work today, {committedName}!
                </p>
                <button
                  type="button"
                  onClick={() => { setCommittedName(''); setName('') }}
                  className="w-full bg-orange text-white rounded-[10px] py-3 text-base font-semibold h-12 hover:bg-orange-dark transition-colors"
                >
                  Start Over
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-xl font-bold text-brand-black mb-1">
                  Good morning, {committedName}!
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  {checkedToday.size} of 5 categories checked today
                </p>

                <div className="flex flex-col gap-3">
                  {CATEGORIES.map((cat) => {
                    const catItems = allItems.filter((i) => i.category === cat.key && i.is_active)
                    const criticalCount = catItems.filter(
                      (i) => (i.status === 'critical') || (!i.status && i.current_quantity <= i.min_quantity)
                    ).length
                    const isChecked = checkedToday.has(cat.key)

                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => handleSelectCategory(cat.key)}
                        className="bg-white rounded-[16px] shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4 h-16 text-left hover:border-orange/40 hover:shadow-md transition-all active:scale-[0.98]"
                      >
                        <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-brand-black leading-snug">
                            {cat.label}
                          </p>
                          <p className="text-sm text-gray-400">
                            {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {isChecked ? (
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-light flex items-center justify-center text-green font-bold text-base">
                            ✓
                          </span>
                        ) : criticalCount > 0 ? (
                          <span className="flex-shrink-0 min-w-[28px] h-7 px-2 rounded-full bg-red text-white text-xs font-bold flex items-center justify-center">
                            {criticalCount}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* Step 3 — Category Stock Check */}
        {committedName && selectedCategory && selectedCatMeta && (
          <>
            <button
              type="button"
              onClick={handleBack}
              className="text-orange text-sm font-semibold mb-4 h-11 flex items-center"
            >
              ← All Categories
            </button>

            <h2 className="font-display text-xl font-bold text-brand-black mb-4">
              {selectedCatMeta.icon} {selectedCatMeta.label}
            </h2>

            {isLoading ? (
              <LoadingSpinner />
            ) : selectedCatItems.length === 0 ? (
              <p className="text-gray-400 text-sm">No active items in this category.</p>
            ) : (
              <div className="pb-24">
                {selectedCatItems.map((item) => (
                  <StockCheckItem
                    key={item.id}
                    item={item}
                    value={quantities[item.id] ?? item.current_quantity}
                    onChange={(id, val) =>
                      setQuantities((prev) => ({ ...prev, [id]: val }))
                    }
                  />
                ))}
              </div>
            )}

            {/* Sticky Save Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
              <button
                type="button"
                disabled={!hasChanges || bulkUpdate.isPending}
                onClick={handleSave}
                className="w-full bg-orange text-white rounded-[10px] py-4 text-base font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-dark transition-colors"
              >
                {bulkUpdate.isPending
                  ? 'Saving…'
                  : `Save ${selectedCatMeta.label} Updates`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
