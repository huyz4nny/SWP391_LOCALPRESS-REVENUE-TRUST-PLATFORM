import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'gold' | 'info'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary-900 text-white',
    secondary: 'bg-slate-100 text-slate-800 border border-slate-200',
    outline: 'border border-slate-300 text-slate-700',
    destructive: 'bg-red-50 text-red-700 border border-red-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    gold: 'bg-amber-500 text-white font-semibold shadow-xs',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
