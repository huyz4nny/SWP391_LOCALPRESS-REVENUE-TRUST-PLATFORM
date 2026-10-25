import React, { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Nút chuyển giao diện sáng / tối dùng chung cho 4 layout.
 * Lưu lựa chọn ở localStorage 'localpress-theme'; lần đầu theo cài đặt của hệ điều hành.
 * index.html gắn class 'dark' trước khi React chạy để không bị nháy trắng.
 */
export const THEME_KEY = 'localpress-theme'

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (typeof document === 'undefined' ? 'light' : currentTheme()))

  useEffect(() => {
    // Đồng bộ giữa nhiều nút trên cùng trang và nhiều tab
    const sync = () => setTheme(currentTheme())
    window.addEventListener('localpress-theme-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('localpress-theme-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    window.localStorage.setItem(THEME_KEY, next)
    setTheme(next)
    window.dispatchEvent(new Event('localpress-theme-changed'))
  }

  const label = theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'
  const Icon = theme === 'dark' ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-8 flex-none items-center gap-2 rounded-md px-2 text-[13px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 cursor-pointer',
        className
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      {withLabel && <span>{label}</span>}
    </button>
  )
}
