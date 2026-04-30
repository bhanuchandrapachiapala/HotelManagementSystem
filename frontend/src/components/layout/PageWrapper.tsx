import type { ReactNode } from 'react'

export default function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="px-8 py-7 max-w-screen-xl mx-auto">
      {children}
    </div>
  )
}
