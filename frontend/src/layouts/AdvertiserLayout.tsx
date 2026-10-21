import React, { useState, useEffect } from 'react'
import { Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { WalletBalanceButton } from '@/components/shared/WalletBalanceButton'
import { Button } from '@/components/ui/button'
import {
  Building2,
  LayoutDashboard,
  CalendarCheck,
  PlusCircle,
  Image as ImageIcon,
  BarChart3,
  Receipt,
  ArrowLeft,
  LogOut,
} from 'lucide-react'

export function AdvertiserLayout() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
    })
    return unsub
  }, [])

  // Guard: Must have role ADVERTISER, or SYSTEM_ADMIN
  if (!APP_CONFIG.useMockApi && !httpClient.hasBasicAuth()) return <Navigate to="/login" replace />
  const isAdvertiser = currentUser.role === 'ADVERTISER' || currentUser.role === 'SYSTEM_ADMIN'

  if (!isAdvertiser) {
    return (
      <div className="min-h-screen bg-ground flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Cổng doanh nghiệp quảng cáo</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Khu vực dành cho doanh nghiệp đặt quảng cáo trên LocalPress. Bạn đang đăng nhập là{' '}
            <span className="font-medium text-slate-900">{currentUser.name}</span>.
          </p>
          <div className="mt-5 grid gap-2">
            <Button onClick={() => mockStore.setCurrentUser('user-adv-1')}>
              Demo: Logistics Cảng Hải Phòng
            </Button>
            <Button variant="outline" onClick={() => mockStore.setCurrentUser('user-adv-2')}>
              Demo: BĐS Đất Cảng Hải Phòng
            </Button>
          </div>
          <Link to="/" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900 hover:underline">
            Quay lại trang báo
          </Link>
        </div>
        {APP_CONFIG.useMockApi && <RoleSwitcherBar />}
      </div>
    )
  }

  const navItems = [
    { label: 'Tổng quan', path: '/advertiser', icon: LayoutDashboard },
    { label: 'Hồ sơ doanh nghiệp', path: '/advertiser/profile', icon: Building2 },
    { label: 'Đặt vị trí mới', path: '/advertiser/bookings/new', icon: PlusCircle, isAction: true },
    { label: 'Booking & báo giá', path: '/advertiser/bookings', icon: CalendarCheck },
    { label: 'Vị trí & bảng giá', path: '/advertiser/slots', icon: Building2 },
    { label: 'Hóa đơn & thanh toán', path: '/advertiser/billing', icon: Receipt },
  ]

  // Mục đang mở: khớp đường dẫn dài nhất (/advertiser/bookings/new không làm sáng "Booking & báo giá")
  const activePath = navItems
    .map((i) => i.path)
    .filter((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]

  return (
    <div className="min-h-screen bg-ground font-sans text-slate-900">
      <header className="sticky top-0 z-40 border-b border-[#e1e4e9] bg-ground">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/" className="font-serif text-lg font-black tracking-tight text-slate-900">
              Local<span className="text-crimson">Press</span>
            </Link>
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-sm font-medium">{currentUser.companyName || 'Cổng doanh nghiệp'}</div>
              <div className="truncate text-xs text-slate-500">Mã đối tác {currentUser.companyId || 'ADV-PARTNER'}</div>
            </div>
          </div>

          <div className="flex flex-none items-center gap-2.5">
            <WalletBalanceButton />
            <ThemeToggle />
            <span className="hidden h-8 w-8 items-center justify-center rounded-full bg-[#dfe7f5] text-xs font-semibold text-primary-900 sm:flex" title={currentUser.email}>
              {currentUser.name.charAt(0)}
            </span>
            <button
              onClick={() => {
                mockStore.setCurrentUser('user-guest')
                navigate('/login')
              }}
              title="Đăng xuất"
              className="flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-slate-600 hover:bg-[#e9ecf0] hover:text-slate-900 cursor-pointer"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside>
            <nav className="space-y-0.5" aria-label="Cổng doanh nghiệp">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = item.path === activePath

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-[#e3e6eb] font-medium text-slate-900'
                        : item.isAction
                        ? 'font-medium text-primary-900 hover:bg-[#e9ecf0]'
                        : 'text-slate-700 hover:bg-[#e9ecf0] hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-none ${item.isAction && !isActive ? 'text-primary-900' : 'text-slate-500'}`} strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
              <Link
                to="/"
                className="mt-2 flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-slate-700 hover:bg-[#e9ecf0] hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                Xem trang báo
              </Link>
            </nav>
          </aside>

          <main className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {APP_CONFIG.useMockApi && <RoleSwitcherBar />}
    </div>
  )
}
