import React, { useState, useEffect } from 'react'
import { mockStore } from '@/mocks/store'
import { APP_CONFIG, ROLE_LABELS } from '@/app/config'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  ExternalLink,
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

  return (
    <div className="fixed bottom-3 right-3 z-50 font-sans">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center space-x-2 bg-slate-900 text-white px-3 py-2 rounded-full shadow-2xl hover:bg-slate-800 transition-all border border-slate-700 text-xs font-semibold cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Demo Role: {currentUser.name.split(' (')[0]}</span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700 p-3 max-w-md transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Bộ Điều Khiển Kịch Bản Demo (Mock Switcher)
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(true)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
                title="Thu nhỏ"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 overflow-hidden">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-slate-600"
              />
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 truncate">{ROLE_LABELS[currentUser.role]}</div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsOpen(!isOpen)}
                  className="bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700 text-xs h-7"
                >
                  <Users className="w-3.5 h-3.5 mr-1 text-sky-400" />
                  Đổi vai trò
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>

                {isOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-1.5 z-50">
                    <div className="text-[11px] font-bold text-slate-400 px-2.5 py-1.5 uppercase">
                      Chọn vai trò thử nghiệm:
                    </div>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSwitch(u.id)}
                        className={`w-full text-left px-2.5 py-2 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          u.id === currentUser.id
                            ? 'bg-primary-900 text-white font-medium'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate">{u.name}</div>
                          <div className="text-[10px] opacity-75">{ROLE_LABELS[u.role]}</div>
                        </div>
                        {u.id === currentUser.id && (
                          <span className="text-[10px] bg-primary-700 px-1.5 py-0.5 rounded text-white shrink-0">
                            Hiện tại
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                title="Khôi phục trạng thái dữ liệu gốc"
                className="bg-slate-800/80 text-amber-300 border-amber-500/30 hover:bg-amber-950/40 text-xs h-7 px-2"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* Quick Route Shortcuts for the 5 students */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-medium">Truy cập nhanh:</span>
            <button
              onClick={() => navigate('/')}
              className="text-sky-400 hover:underline px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              Trang báo (Khách)
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => navigate('/advertiser')}
              className="text-sky-400 hover:underline px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              Cổng Advertiser (SV1)
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => navigate('/backoffice/editorial')}
              className="text-sky-400 hover:underline px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              Tòa soạn (SV2)
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => navigate('/account')}
              className="text-sky-400 hover:underline px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              Độc giả (SV3)
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => navigate('/backoffice/finance')}
              className="text-amber-400 hover:underline px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer font-medium"
            >
              Tài chính (SV4)
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => navigate('/backoffice/admin')}
              className="text-emerald-400 hover:underline px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
            >
              Hệ thống (SV5)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
