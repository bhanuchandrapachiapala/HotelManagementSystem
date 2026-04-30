interface OrderStatusSelectProps {
  value: string
  onChange: (status: string) => void
}

const statusBorder: Record<string, string> = {
  pending:   'border-yellow-hotel text-yellow-900',
  preparing: 'border-orange text-orange-dark',
  delivered: 'border-green text-green',
}

export default function OrderStatusSelect({ value, onChange }: OrderStatusSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border-2 rounded-[10px] px-3 py-1.5 text-sm font-semibold outline-none cursor-pointer bg-white transition-colors ${statusBorder[value] ?? ''}`}
    >
      <option value="pending">Pending</option>
      <option value="preparing">Preparing</option>
      <option value="delivered">Delivered</option>
    </select>
  )
}
