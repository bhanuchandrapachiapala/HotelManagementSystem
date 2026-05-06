import { useState } from 'react'
import { cn } from '../../lib/utils'
import type { InventoryItem } from '../../types'

const VENDOR_COLORS: Record<string, string> = {
  sysco: 'bg-blue-100 text-blue-700',
  costco: 'bg-red/10 text-red',
  webstaurantstore: 'bg-purple-100 text-purple-700',
  members_mark: 'bg-green-light text-green',
  other: 'bg-gray-100 text-gray-500',
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

const VENDOR_LABELS: Record<string, string> = {
  sysco: 'Sysco',
  costco: 'Costco',
  webstaurantstore: 'WebstaurantStore',
  members_mark: "Member's Mark",
  other: 'Other',
}

interface Props {
  item: InventoryItem
  value: number
  onChange: (id: number, value: number) => void
}

export default function StockCheckItem({ item, value, onChange }: Props) {
  const [inputMode, setInputMode] = useState(false)
  const [inputValue, setInputValue] = useState(String(value))

  const vendorColor = VENDOR_COLORS[item.vendor] ?? 'bg-gray-100 text-gray-500'
  const vendorLabel = VENDOR_LABELS[item.vendor] ?? item.vendor

  function decrement() {
    const next = Math.max(0, value - 1)
    onChange(item.id, next)
    setInputValue(String(next))
  }

  function increment() {
    const next = value + 1
    onChange(item.id, next)
    setInputValue(String(next))
  }

  function handleInputBlur() {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(item.id, parsed)
      setInputValue(String(parsed))
    } else {
      setInputValue(String(value))
    }
    setInputMode(false)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    }
    if (e.key === 'Escape') {
      setInputValue(String(value))
      setInputMode(false)
    }
  }

  function getStatusTag() {
    if (value <= item.min_quantity) {
      return (
        <span className="text-xs font-bold bg-red/10 text-red px-3 py-1 rounded-full">
          Below Minimum
        </span>
      )
    }
    if (value <= item.min_quantity * 1.2) {
      return (
        <span className="text-xs font-bold bg-yellow-hotel/20 text-yellow-hotel px-3 py-1 rounded-full">
          Running Low
        </span>
      )
    }
    return (
      <span className="text-xs font-bold bg-green-light text-green px-3 py-1 rounded-full">
        OK
      </span>
    )
  }

  return (
    <div className="pb-4 border-b border-gray-100 last:border-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0', CATEGORY_BG[item.category] ?? 'bg-gray-100')}>
          {item.icon && item.icon !== '📦' ? item.icon : (CATEGORY_EMOJI[item.category] ?? '📦')}
        </span>
        <h3 className="text-lg font-bold text-brand-black">{item.name}</h3>
        <span
          className={cn(
            'text-[10px] font-bold px-2.5 py-0.5 rounded-full flex-shrink-0',
            vendorColor
          )}
        >
          {vendorLabel}
        </span>
      </div>

      <p className="text-sm text-gray-400 mb-3">
        Current minimum: {item.min_quantity} {item.unit}
      </p>

      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={decrement}
          className="h-12 w-12 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border-2 border-orange text-orange text-xl font-bold transition-colors hover:bg-orange hover:text-white active:scale-95"
          aria-label="Decrease quantity"
        >
          −
        </button>

        <div
          className="flex-1 flex items-center justify-center cursor-pointer"
          onClick={() => {
            setInputMode(true)
            setInputValue(String(value))
          }}
        >
          {inputMode ? (
            <input
              type="number"
              value={inputValue}
              autoFocus
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="text-3xl font-bold text-brand-black text-center w-28 border-b-2 border-orange outline-none bg-transparent"
              style={{ fontSize: '1.875rem', minHeight: '44px' }}
            />
          ) : (
            <span className="text-3xl font-bold text-brand-black px-6 select-none">
              {value}
            </span>
          )}
        </div>

        <button
          onClick={increment}
          className="h-12 w-12 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border-2 border-orange text-orange text-xl font-bold transition-colors hover:bg-orange hover:text-white active:scale-95"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className="mb-3">{getStatusTag()}</div>

      <textarea
        placeholder="Any notes..."
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-[10px] px-3 py-2 mt-1 outline-none focus:border-orange focus:ring-1 focus:ring-orange/20 resize-none"
        style={{ fontSize: '16px' }}
      />
    </div>
  )
}
