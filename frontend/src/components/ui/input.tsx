import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:border-primary-900 focus:ring-2 focus:ring-primary-900/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
            error && 'border-negative focus:border-negative focus:ring-negative/15',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-negative">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:outline-none focus:border-primary-900 focus:ring-2 focus:ring-primary-900/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
            error && 'border-negative focus:border-negative focus:ring-negative/15',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-negative">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

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
