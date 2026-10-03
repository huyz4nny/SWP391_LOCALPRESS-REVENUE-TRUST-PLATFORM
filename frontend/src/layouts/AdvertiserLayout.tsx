import React, { useState, useEffect } from 'react'
import { Outlet, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  LayoutDashboard,
  CalendarCheck,
  PlusCircle,
  Image as ImageIcon,
  BarChart3,
  Receipt,
  ArrowLeft,
  ShieldAlert,
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
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-stone-200 text-center">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Cổng thông tin Doanh nghiệp B2B</h2>
          <p className="text-sm text-stone-600 mb-6">
            Khu vực này dành riêng cho các Doanh nghiệp đặt quảng cáo trên hệ thống LocalPress. Bạn đang đăng nhập với vai trò <span className="font-semibold text-primary-900">{currentUser.name}</span>.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => mockStore.setCurrentUser('user-adv-1')}
              className="w-full bg-primary-900 text-white py-2 px-4 rounded-md font-medium text-sm hover:bg-primary-800 transition-colors cursor-pointer"
            >
              Demo: Đăng nhập Nhà quảng cáo 1 (Logistics Cảng Hải Phòng)
            </button>
            <button
              onClick={() => mockStore.setCurrentUser('user-adv-2')}
              className="w-full bg-slate-800 text-white py-2 px-4 rounded-md font-medium text-sm hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Demo: Đăng nhập Nhà quảng cáo 2 (BĐS Đất Cảng Hải Phòng)
            </button>
            <Link to="/" className="text-sm text-stone-500 hover:underline mt-2">
              Quay lại Trang tin tức chính
            </Link>
          </div>
        </div>
        {APP_CONFIG.useMockApi && <RoleSwitcherBar />}
      </div>
    )
  }

  const navItems = [
    { label: 'Tổng quan Doanh nghiệp', path: '/advertiser', icon: LayoutDashboard },
    { label: 'Hồ sơ doanh nghiệp', path: '/advertiser/profile', icon: Building2 },
    { label: 'Đặt vị trí mới (Booking)', path: '/advertiser/bookings/new', icon: PlusCircle, isAction: true },
    { label: 'Danh sách Booking & Báo giá', path: '/advertiser/bookings', icon: CalendarCheck },
    { label: 'Vị trí quảng cáo & Bảng giá', path: '/advertiser/slots', icon: Building2 },
    { label: 'Hóa đơn & Thanh toán B2B', path: '/advertiser/billing', icon: Receipt },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded px-2.5 py-1.5 hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Xem Trang Báo
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-primary-900" />
              <div>
                <span className="font-bold text-sm text-slate-900">
                  {currentUser.companyName || 'Cổng Doanh nghiệp B2B'}
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  Mã đối tác: {currentUser.companyId || 'ADV-PARTNER'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500">{currentUser.email}</div>
            </div>
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&auto=format&fit=crop&q=80'}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-slate-300"
            />
            <button
              onClick={() => {
                mockStore.setCurrentUser('user-guest')
                navigate('/login')
              }}
              title="Đăng xuất"
              className="flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 rounded px-2.5 py-1.5 transition-colors cursor-pointer ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <aside className="md:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.path === '/advertiser'
                    ? location.pathname === '/advertiser'
                    : location.pathname.startsWith(item.path)

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-900 text-white font-semibold shadow-2xs'
                        : item.isAction
                        ? 'text-primary-800 bg-primary-50 hover:bg-primary-100 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </aside>

          <main className="md:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs min-h-[550px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {APP_CONFIG.useMockApi && <RoleSwitcherBar />}
    </div>
  )
}
