import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { ROLE_LABELS, UserRole, PERMISSION_CHECKERS } from '@/app/config'
import { Badge } from '@/components/ui/badge'
import {
  Newspaper,
  DollarSign,
  ShieldCheck,
  FileText,
  PlusCircle,
  Calendar,
  Image as ImageIcon,
  MessageSquare,
  CreditCard,
  RotateCcw,
  Scale,
  BookMarked,
  Users,
  Settings,
  Activity,
  History,
  ArrowLeft,
  Lock,
} from 'lucide-react'

export function BackofficeLayout() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
    })
    return unsub
  }, [])

  const isStaff = PERMISSION_CHECKERS.canAccessBackoffice(currentUser.role)
  const canSeeEditorial = PERMISSION_CHECKERS.canAccessEditorial(currentUser.role)
  const canSeeFinance = PERMISSION_CHECKERS.canAccessFinance(currentUser.role)
  const canSeeAdmin = PERMISSION_CHECKERS.canAccessAdmin(currentUser.role)

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white font-sans">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/50 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">403 — Không có quyền truy cập Backoffice</h2>
          <p className="text-sm text-slate-400 mb-6">
            Bạn đang đăng nhập với vai trò <span className="text-white font-semibold">{currentUser.name} ({ROLE_LABELS[currentUser.role]})</span>. Khu vực quản trị nội bộ chỉ dành cho Biên tập viên, Kế toán và Quản trị viên.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => mockStore.setCurrentUser('user-editor')}
              className="w-full bg-sky-700 text-white py-2 px-4 rounded-md text-xs font-semibold hover:bg-sky-600 transition-colors cursor-pointer"
            >
              Demo: Đăng nhập Biên tập viên (SV2)
            </button>
            <button
              onClick={() => mockStore.setCurrentUser('user-fin-staff')}
              className="w-full bg-emerald-700 text-white py-2 px-4 rounded-md text-xs font-semibold hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              Demo: Đăng nhập Kế toán viên (SV4)
            </button>
            <button
              onClick={() => mockStore.setCurrentUser('user-admin')}
              className="w-full bg-purple-700 text-white py-2 px-4 rounded-md text-xs font-semibold hover:bg-purple-600 transition-colors cursor-pointer"
            >
              Demo: Đăng nhập Quản trị viên (SV5)
            </button>
            <Link to="/" className="block text-xs text-slate-400 hover:text-white pt-2">
              Quay lại Trang báo công khai
            </Link>
          </div>
        </div>
        <RoleSwitcherBar />
      </div>
    )
  }

  // Navigation structure categorized by business flows
  const editorialNav = [
    { label: 'Danh sách bài viết', path: '/backoffice/editorial/articles', icon: FileText },
    { label: 'Soạn thảo bài mới', path: '/backoffice/editorial/articles/new', icon: PlusCircle },
    { label: 'Xử lý Booking quảng cáo', path: '/backoffice/editorial/bookings', icon: Calendar },
    { label: 'Duyệt Banner Creative', path: '/backoffice/editorial/creatives', icon: ImageIcon },
    { label: 'Kiểm duyệt bình luận', path: '/backoffice/editorial/comments', icon: MessageSquare },
  ]

  const financeNav = [
    { label: 'Tổng quan tài chính', path: '/backoffice/finance', icon: CreditCard },
    { label: 'Đơn hàng & Xác nhận CK', path: '/backoffice/finance/orders', icon: DollarSign },
    { label: 'Quản lý Hoàn tiền (Refund)', path: '/backoffice/finance/refunds', icon: RotateCcw },
    { label: 'Đối soát kỳ & Chênh lệch', path: '/backoffice/finance/reconciliation', icon: Scale },
    { label: 'Sổ cái & Bút toán kế toán', path: '/backoffice/finance/ledger', icon: BookMarked },
  ]

  const adminNav = [
    { label: 'Tài khoản & Phân quyền', path: '/backoffice/admin/users', icon: Users },
    { label: 'Cấu hình Paywall & Thiết bị', path: '/backoffice/admin/paywall', icon: Settings },
    { label: 'Giám sát Phân phối Banner', path: '/backoffice/admin/delivery', icon: Activity },
    { label: 'Nhật ký kiểm toán (Audit Logs)', path: '/backoffice/admin/audit-logs', icon: History },
  ]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 rounded px-2.5 py-1.5 hover:bg-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Xem Trang Báo
            </Link>
            <span className="text-slate-700">|</span>
            <div className="flex items-center space-x-2">
              <span className="font-serif font-black text-lg tracking-tight text-white">
                Local<span className="text-red-500">Press</span>
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                Backoffice
              </span>
              {canSeeAdmin ? (
                <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-600 px-2 py-0.5 rounded font-bold uppercase">
                  Quản trị hệ thống (SV5)
                </span>
              ) : canSeeFinance ? (
                <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-600 px-2 py-0.5 rounded font-bold uppercase">
                  Tài chính & Đối soát (SV4)
                </span>
              ) : (
                <span className="text-[10px] bg-sky-900/80 text-sky-200 border border-sky-600 px-2 py-0.5 rounded font-bold uppercase">
                  Tòa soạn & Biên tập (SV2)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white">{currentUser.name}</div>
              <div className="text-[11px] text-amber-400 font-medium">{ROLE_LABELS[currentUser.role]}</div>
            </div>
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80'}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-slate-600"
            />
          </div>
        </div>
      </header>

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0 p-4 space-y-6 overflow-y-auto">
          {/* Phân hệ thông tin vai trò */}
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Phân hệ được cấp quyền:
            </div>
            {canSeeAdmin ? (
              <div className="text-xs font-semibold text-purple-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span>Toàn quyền Quản trị (Admin)</span>
              </div>
            ) : canSeeFinance ? (
              <div className="text-xs font-semibold text-emerald-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Kế toán & Tài chính (SV4)</span>
              </div>
            ) : canSeeEditorial ? (
              <div className="text-xs font-semibold text-sky-300 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span>Tòa soạn & Biên tập (SV2)</span>
              </div>
            ) : null}
          </div>

          {/* Editorial Section - Chỉ hiện cho Biên tập viên / Reviewer / Phóng viên / Admin */}
          {canSeeEditorial && (
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2 px-2">
                <Newspaper className="w-3.5 h-3.5" />
                <span>Tòa Soạn & Biên Tập (SV2)</span>
              </div>
              <div className="space-y-1">
                {editorialNav.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2.5 px-3 py-2 text-xs rounded-lg transition-colors ${
                        isActive
                          ? 'bg-sky-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Finance Section - Chỉ hiện cho Kế toán viên / Kế toán trưởng / Admin */}
          {canSeeFinance && (
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 px-2">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Tài Chính & Đối Soát (SV4)</span>
              </div>
              <div className="space-y-1">
                {financeNav.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2.5 px-3 py-2 text-xs rounded-lg transition-colors ${
                        isActive
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Admin Section - Chỉ hiện cho Quản trị viên hệ thống */}
          {canSeeAdmin && (
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-2 px-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Hệ Thống & Giám Sát (SV5)</span>
              </div>
              <div className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center space-x-2.5 px-3 py-2 text-xs rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Content View */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <RoleSwitcherBar />
    </div>
  )
}
