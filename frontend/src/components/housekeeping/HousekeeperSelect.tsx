import type { Housekeeper } from '../../types'

interface HousekeeperSelectProps {
  housekeepers: Housekeeper[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  className?: string
}

export default function HousekeeperSelect({
  housekeepers,
  value,
  onChange,
  placeholder = 'Select housekeeper',
  className = '',
}: HousekeeperSelectProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className={`border border-gray-200 focus:border-orange focus:ring-2 focus:ring-orange/10 rounded-[10px] px-4 py-2.5 outline-none font-body text-sm bg-white ${className}`}
    >
      <option value="">{placeholder}</option>
      {housekeepers.map((hk) => (
        <option key={hk.id} value={hk.id}>
          {hk.name}
        </option>
      ))}
    </select>
  )
}
