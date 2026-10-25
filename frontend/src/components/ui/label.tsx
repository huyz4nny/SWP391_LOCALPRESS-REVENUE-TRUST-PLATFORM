import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label className={cn('mb-1.5 block select-none text-sm font-medium text-slate-900', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-negative">*</span>}
    </label>
  )
}
