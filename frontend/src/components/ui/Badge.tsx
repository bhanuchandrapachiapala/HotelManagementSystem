import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  variant: 'orange' | 'yellow' | 'green' | 'red' | 'gray'
  children: ReactNode
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  orange: 'bg-orange-light text-orange-dark',
  yellow: 'bg-yellow-light text-yellow-900',
  green:  'bg-green-light text-green',
  red:    'bg-red-light text-red',
  gray:   'bg-gray-100 text-gray-600',
}

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', variantClasses[variant])}>
      {children}
    </span>
  )
}
