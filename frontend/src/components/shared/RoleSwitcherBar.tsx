import React, { useState, useEffect } from 'react'
import { mockStore } from '@/mocks/store'
import { APP_CONFIG, ROLE_LABELS } from '@/app/config'
import { Button } from '@/components/ui/button'
import {
  Users,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function RoleSwitcherBar() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const [users, setUsers] = useState(mockStore.getState().users)
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
      setUsers(mockStore.getState().users)
    })
    return unsubscribe
  }, [])

  if (!APP_CONFIG.useMockApi) return null

  const handleSwitch = (userId: string) => {
    mockStore.setCurrentUser(userId)
    setIsOpen(false)
  }

  const handleReset = () => {
    if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu ban đầu của LocalPress?')) {
      mockStore.resetToDefaults()
      window.location.reload()
    }
  }

  const shortcuts = [
    { label: 'Trang báo', to: '/' },
    { label: 'Doanh nghiệp (SV1)', to: '/advertiser' },
    { label: 'Tòa soạn (SV2)', to: '/backoffice/editorial' },
    { label: 'Độc giả (SV3)', to: '/account' },
    { label: 'Tài chính (SV4)', to: '/backoffice/finance' },
    { label: 'Hệ thống (SV5)', to: '/backoffice/admin' },
  ]

  return (
    <div className="fixed bottom-3 right-3 z-50 font-sans text-slate-900">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-[13px] font-medium shadow-lg hover:bg-slate-50 cursor-pointer"
        >
          <Users className="h-4 w-4 text-slate-500" />
          <span>Demo: {currentUser.name.split(' (')[0]}</span>
          <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
        </button>
      ) : (
        <div className="w-[min(420px,calc(100vw-1.5rem))] rounded-lg border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold">Bộ chuyển vai trò demo</span>
            <button
              onClick={() => setIsMinimized(true)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Thu nhỏ"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {currentUser.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{currentUser.name}</div>
                <div className="truncate text-xs text-slate-500">{ROLE_LABELS[currentUser.role]}</div>
              </div>
            </div>

            <div className="flex flex-none items-center gap-1.5">
              <div className="relative">
                <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
                  Đổi vai trò
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </Button>

                {isOpen && (
                  <div className="absolute bottom-full right-0 z-50 mb-2 max-h-96 w-80 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitch(u.id)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-[13px] cursor-pointer ${
                          u.id === currentUser.id ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate">{u.name}</div>
                          <div className="truncate text-xs text-slate-500">{ROLE_LABELS[u.role]}</div>
                        </div>
                        {u.id === currentUser.id && <span className="flex-none text-xs text-slate-500">Hiện tại</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button variant="ghost" size="sm" onClick={handleReset} title="Khôi phục dữ liệu mẫu ban đầu">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5 text-xs">
            {shortcuts.map((s) => (
              <button
                key={s.to}
                onClick={() => navigate(s.to)}
                className="text-slate-600 hover:text-primary-900 hover:underline cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
