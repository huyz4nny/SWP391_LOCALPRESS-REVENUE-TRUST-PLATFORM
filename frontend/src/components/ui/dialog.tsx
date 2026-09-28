import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: DialogProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={cn(
          'relative z-50 w-full rounded-xl bg-white p-6 shadow-2xl transition-all animate-in zoom-in-95',
          maxWidthClasses[maxWidth]
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none cursor-pointer"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Đóng</span>
        </button>

        {title && <h3 className="text-lg font-bold text-slate-900 pr-6">{title}</h3>}
        {description && <p className="mt-1 text-sm text-slate-500 mb-4">{description}</p>}

        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
