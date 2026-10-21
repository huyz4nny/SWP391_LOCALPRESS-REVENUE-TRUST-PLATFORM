import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'gold' | 'info'
}

// Pill trạng thái: nền nhạt + chữ đậm cùng sắc độ, không viền, không shadow, không bị co.
export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-900 text-white',
    secondary: 'bg-slate-100 text-slate-700',
    outline: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300',
    destructive: 'bg-[#ffedea] text-[#831c1e]',
    success: 'bg-[#dcfae5] text-[#04250e]',
    warning: 'bg-[#fffbeb] text-[#92400e] ring-1 ring-inset ring-[#fde68a]',
    gold: 'bg-[#fef3c7] text-[#78350f]',
    info: 'bg-[#e8effc] text-[#1e3a8a]',
  }

  return (
    <div
      className={cn(
        'inline-flex flex-none items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium leading-5',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
