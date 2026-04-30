interface AlertItemProps {
  type: 'warning' | 'error' | 'success' | 'info'
  title: string
  message: string
  icon?: string
}

const typeStyles = {
  warning: { border: 'border-l-orange',  bg: 'bg-orange-light',  text: 'text-orange-dark' },
  error:   { border: 'border-l-red',     bg: 'bg-red-light',     text: 'text-red' },
  success: { border: 'border-l-green',   bg: 'bg-green-light',   text: 'text-green' },
  info:    { border: 'border-l-blue',    bg: 'bg-blue-light',    text: 'text-blue' },
}

export default function AlertItem({ type, title, message, icon }: AlertItemProps) {
  const s = typeStyles[type]
  return (
    <div className={`flex gap-3 p-4 rounded-[10px] border-l-4 ${s.border} ${s.bg} mb-3`}>
      {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
      <div>
        <p className={`font-semibold text-sm ${s.text}`}>{title}</p>
        <p className="text-gray-500 text-sm mt-0.5">{message}</p>
      </div>
    </div>
  )
}
