import { useState } from 'react'
import toast from 'react-hot-toast'
import { MENU_SECTIONS } from '../../lib/constants'
import { useCreateOrder } from '../../hooks/useOrders'
import type { CreateOrderRequest } from '../../types'

interface Selections {
  entree: string
  sides: string[]
  dessert: string
  drink: string
}

const LABEL_MAP: Record<string, string> = {
  chicken_fingers: 'Chicken Fingers',
  crispy_chicken_sandwich: 'Crispy Chicken Sandwich',
  crispy_chicken_salad: 'Crispy Chicken Salad',
  cheeseburger: 'Cheeseburger',
  veggie_burger: 'Veggie Burger',
  tater_tots: 'Tater Tots / Fries',
  steamed_veggies: 'Steamed Veggies',
  side_salad: 'Side Salad',
  potato_chips: 'Potato Chips',
  mac_cheese: 'Mac & Cheese',
  cookie_pastry: 'Cookie / Pastry',
  fresh_fruits: 'Fresh Fruits',
  yogurt: 'Yogurt',
  water: 'Water',
  soda: 'Soda',
  juice: 'Juice',
}

export default function DinnerMenuPage() {
  const [room, setRoom] = useState('')
  const [initials, setInitials] = useState('')
  const [selections, setSelections] = useState<Selections>({ entree: '', sides: [], dessert: '', drink: '' })
  const [validationError, setValidationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submittedRoom, setSubmittedRoom] = useState('')
  const [submittedInitials, setSubmittedInitials] = useState('')
  const createOrder = useCreateOrder()

  function selectRadio(key: keyof Selections, id: string) {
    setSelections((prev) => ({ ...prev, [key]: id }))
  }

  function toggleSide(id: string) {
    setSelections((prev) => {
      const current = prev.sides
      if (current.includes(id)) {
        return { ...prev, sides: current.filter((s) => s !== id) }
      }
      if (current.length >= 2) {
        toast.error('You can only choose 2 sides')
        return prev
      }
      return { ...prev, sides: [...current, id] }
    })
  }

  async function handleSubmit() {
    setValidationError(null)
    if (!room.trim()) return setValidationError('Please enter your room number.')
    if (!initials.trim()) return setValidationError('Please enter your guest initials.')
    if (!selections.entree) return setValidationError('Please select an entrée.')
    if (selections.sides.length !== 2) return setValidationError('Please select exactly 2 sides.')
    if (!selections.dessert) return setValidationError('Please select a dessert.')
    if (!selections.drink) return setValidationError('Please select a drink.')

    const payload: CreateOrderRequest = {
      room_number: room.trim(),
      guest_initials: initials.trim(),
      entree: LABEL_MAP[selections.entree],
      sides: selections.sides.map((s) => LABEL_MAP[s]),
      dessert: LABEL_MAP[selections.dessert],
      drink: LABEL_MAP[selections.drink],
    }

    try {
      await createOrder.mutateAsync(payload)
      setSubmittedRoom(room.trim())
      setSubmittedInitials(initials.trim())
      setSuccess(true)
    } catch (e: unknown) {
      setValidationError(e instanceof Error ? e.message : 'Failed to place order. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8F7F5] flex items-center justify-center px-4">
        <div className="bg-white rounded-card shadow-sm max-w-sm w-full p-10 text-center">
          <div
            className="mx-auto mb-5 flex items-center justify-center rounded-full bg-orange"
            style={{ width: 72, height: 72 }}
          >
            <span className="text-3xl">🍽️</span>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">Order Placed!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Room {submittedRoom} · {submittedInitials}
          </p>
          <p className="text-gray-500 text-sm">
            Your dinner order has been sent to the kitchen. Enjoy your evening at Casco Bay Hotel!
          </p>
          <div className="mt-5 bg-gray-50 rounded-[10px] px-4 py-3 text-xs text-gray-400">
            Questions? Contact the front desk.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] py-10 px-5">
      <div className="max-w-[640px] mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-brand-black">
            Casco Bay Hotel
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mt-1">Dinner Menu</p>
          <div className="mx-auto mt-4 h-[3px] w-16 rounded-full bg-gradient-to-r from-orange to-yellow-hotel" />
        </div>

        {/* Guest info */}
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                Room Number
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. 204"
                className="w-full border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-3 outline-none font-body text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                Guest Initials
              </label>
              <input
                type="text"
                value={initials}
                onChange={(e) => setInitials(e.target.value)}
                placeholder="e.g. J.S."
                className="w-full border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-3 outline-none font-body text-sm"
              />
            </div>
          </div>
        </div>

        {/* Menu sections */}
        {MENU_SECTIONS.map((section) => (
          <div key={section.key} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold">{section.label}</h3>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                section.type === 'checkbox'
                  ? 'bg-orange-light text-orange'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {section.rule}
              </span>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => {
                const isSelected =
                  section.type === 'radio'
                    ? selections[section.key as keyof Selections] === item.id
                    : (selections.sides as string[]).includes(item.id)

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (section.type === 'radio') {
                        selectRadio(section.key as keyof Selections, item.id)
                      } else {
                        toggleSide(item.id)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-[10px] border-2 transition-all text-left ${
                      isSelected
                        ? 'border-orange bg-orange-light'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-${section.type === 'radio' ? 'full' : 'sm'} border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'border-orange bg-orange' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm font-semibold text-brand-black flex-1">{item.label}</span>
                    {item.tag === 'V' && (
                      <span className="text-[10px] font-bold bg-green text-white px-1.5 py-0.5 rounded-full">V</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        {/* Validation error */}
        {validationError && (
          <div className="bg-red-light text-red text-sm px-4 py-3 rounded-[10px] mb-4">
            {validationError}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={createOrder.isPending}
          className="w-full py-4 text-sm font-bold text-white rounded-[10px] bg-gradient-to-r from-orange to-yellow-hotel hover:opacity-90 transition-opacity shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createOrder.isPending ? 'Placing Order…' : 'Place My Order'}
        </button>
      </div>
    </div>
  )
}
