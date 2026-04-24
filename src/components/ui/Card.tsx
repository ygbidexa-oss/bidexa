import clsx from 'clsx'
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={clsx('bg-white rounded-xl border border-slate-200 shadow-sm', padding && 'p-5', className)}>
      {children}
    </div>
  )
}
