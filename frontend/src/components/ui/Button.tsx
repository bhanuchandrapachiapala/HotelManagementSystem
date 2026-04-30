import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost'
  children: ReactNode
}

const variantClasses = {
  primary: 'bg-orange hover:bg-orange-dark text-white font-semibold rounded-[10px] px-4 py-2.5 transition-colors',
  outline: 'bg-white border border-gray-200 hover:border-orange hover:text-orange font-semibold rounded-[10px] px-4 py-2.5 transition-colors',
  ghost:   'bg-transparent hover:bg-gray-100 font-semibold rounded-[10px] px-4 py-2.5 transition-colors',
}

export default function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(variantClasses[variant], 'disabled:opacity-50 disabled:cursor-not-allowed', className)}
      {...rest}
    >
      {children}
    </button>
  )
}
