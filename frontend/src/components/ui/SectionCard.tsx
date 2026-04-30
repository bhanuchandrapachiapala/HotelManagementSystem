import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SectionCardProps {
  children: ReactNode
  className?: string
}

export default function SectionCard({ children, className }: SectionCardProps) {
  return (
    <div className={cn('bg-white rounded-card shadow-sm border border-gray-100 p-6', className)}>
      {children}
    </div>
  )
}
