interface EmptyStateProps {
  icon?: string
  message: string
  subtext?: string
}

export default function EmptyState({ icon, message, subtext }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <span className="text-5xl mb-4">{icon}</span>}
      <p className="text-gray-500 font-semibold">{message}</p>
      {subtext && <p className="text-gray-400 text-sm mt-1">{subtext}</p>}
    </div>
  )
}
