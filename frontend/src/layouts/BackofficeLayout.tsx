import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { ROLE_LABELS, PERMISSION_CHECKERS } from '@/app/config'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  FileText,
  PlusCircle,
  Calendar,
  Image as ImageIcon,
  MessageSquare,
  LayoutGrid,
  RotateCcw,
  Scale,
  BookMarked,
  Users,
  Settings,
  Activity,
  History,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Webhook,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Khung Backoffice dùng chung cho Tòa soạn (SV2), Tài chính (SV4), Hệ thống (SV5).
 * Shell "open plane" (taste-skill app-screens §3.1): sidebar có nhãn nằm trên nền trang,
 * mục đang mở là pill xám trung tính, không có top bar. Trên điện thoại sidebar gập thành thanh 48px.
 */
export function BackofficeLayout() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
    })
    return unsub
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const isStaff = PERMISSION_CHECKERS.canAccessBackoffice(currentUser.role)
  const canSeeEditorial = PERMISSION_CHECKERS.canAccessEditorial(currentUser.role)
    || PERMISSION_CHECKERS.canComposeArticles(currentUser.role)
  const canSeeFinance = PERMISSION_CHECKERS.canAccessFinance(currentUser.role)
  const canSeeAdmin = PERMISSION_CHECKERS.canAccessAdmin(currentUser.role)

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-ground flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <div className="font-serif text-lg font-black tracking-tight">
            Local<span className="text-crimson">Press</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold">Không có quyền vào Backoffice</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Bạn đang đăng nhập là <span className="font-medium text-slate-900">{currentUser.name}</span> ({ROLE_LABELS[currentUser.role]}).
            Khu vực nội bộ chỉ dành cho Biên tập viên, Kế toán và Quản trị viên.
          </p>
          <div className="mt-5 grid gap-2">
            <Button variant="outline" onClick={() => mockStore.setCurrentUser('user-editor')}>
              Demo: đăng nhập Biên tập viên (SV2)
            </Button>
            <Button variant="outline" onClick={() => mockStore.setCurrentUser('user-fin-staff')}>
              Demo: đăng nhập Kế toán viên (SV4)
            </Button>
            <Button variant="outline" onClick={() => mockStore.setCurrentUser('user-admin')}>
              Demo: đăng nhập Quản trị viên (SV5)
            </Button>
          </div>
          <Link to="/" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900 hover:underline">
            Quay lại trang báo
          </Link>
        </div>
        <RoleSwitcherBar />
      </div>
    )
  }

  const editorialItems: NavItem[] = [
    { label: currentUser.role === 'AUTHOR' ? 'Bài viết của tôi' : 'Bài viết', path: '/backoffice/editorial/articles', icon: FileText },
    { label: 'Soạn bài mới', path: '/backoffice/editorial/articles/new', icon: PlusCircle },
    { label: 'Booking quảng cáo', path: '/backoffice/editorial/bookings', icon: Calendar },
    { label: 'Duyệt banner', path: '/backoffice/editorial/creatives', icon: ImageIcon },
    { label: 'Kiểm duyệt bình luận', path: '/backoffice/editorial/comments', icon: MessageSquare },
  ].filter((item) => currentUser.role !== 'AUTHOR'
    || ['/backoffice/editorial/articles', '/backoffice/editorial/articles/new'].includes(item.path))

  const financeItems: NavItem[] = [
    { label: 'Tổng quan', path: '/backoffice/finance', icon: LayoutGrid },
    { label: 'Đơn thanh toán', path: '/backoffice/finance/orders', icon: DollarSign },
    { label: 'Nhật ký SePay', path: '/backoffice/finance/sepay', icon: Webhook },
    { label: 'Khiếu nại thanh toán', path: '/backoffice/finance/complaints', icon: MessageSquare },
    { label: 'Hoàn tiền', path: '/backoffice/finance/refunds', icon: RotateCcw },
    { label: 'Đối soát kỳ', path: '/backoffice/finance/reconciliation', icon: Scale },
    { label: 'Sổ quỹ', path: '/backoffice/finance/ledger', icon: BookMarked },
  ]

  const adminItems: NavItem[] = [
    { label: 'Tài khoản & phân quyền', path: '/backoffice/admin/users', icon: Users },
    { label: 'Paywall & thiết bị', path: '/backoffice/admin/paywall', icon: Settings },
    { label: 'Phân phối banner', path: '/backoffice/admin/delivery', icon: Activity },
    { label: 'Nhật ký kiểm toán', path: '/backoffice/admin/audit-logs', icon: History },
  ]

  const groups: NavGroup[] = [
    canSeeEditorial && { label: 'Tòa soạn', items: editorialItems },
    canSeeFinance && { label: 'Tài chính & đối soát', items: financeItems },
    canSeeAdmin && { label: 'Hệ thống', items: adminItems },
  ].filter(Boolean) as NavGroup[]

  const scope = canSeeAdmin ? 'Quản trị hệ thống' : canSeeFinance ? 'Phòng kế toán' : 'Tòa soạn'

  // Mục đang mở: khớp đường dẫn dài nhất để /finance/orders/12 vẫn sáng "Đơn thanh toán"
  const allPaths = groups.flatMap((g) => g.items.map((i) => i.path))
  const activePath = allPaths
    .filter((p) => location.pathname === p || location.pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0]

  const handleLogout = () => {
    mockStore.setCurrentUser('user-guest')
    navigate('/login')
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link to="/backoffice" className="font-serif text-[19px] font-black tracking-tight text-slate-900">
          Local<span className="text-crimson">Press</span>
        </Link>
        <div className="mt-0.5 text-[13px] text-slate-500">Backoffice · {scope}</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Điều hướng backoffice">
        {groups.map((group) => (
          <div key={group.label} className="mt-4 first:mt-1">
            <div className="px-2.5 pb-1.5 text-xs font-medium text-slate-500">{group.label}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.path === activePath
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-[#e3e6eb] font-medium text-slate-900'
                          : 'text-slate-700 hover:bg-[#e9ecf0] hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`h-4 w-4 flex-none ${isActive ? 'text-slate-900' : 'text-slate-500'}`} strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#e1e4e9] px-3 py-3">
        <Link
          to="/"
          className="flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-slate-700 hover:bg-[#e9ecf0] hover:text-slate-900"
        >
          <ArrowUpRight className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
          Xem trang báo
        </Link>
        <ThemeToggle withLabel className="w-full gap-2.5 px-2.5 text-sm text-slate-700 hover:bg-[#e9ecf0]" />
        <div className="mt-2 flex items-center gap-2.5 px-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#dfe7f5] text-xs font-semibold text-primary-900">
            {currentUser.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-slate-900">{currentUser.name}</div>
            <div className="truncate text-xs text-slate-500">{ROLE_LABELS[currentUser.role]}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="flex-none rounded-md p-1.5 text-slate-500 hover:bg-[#e9ecf0] hover:text-slate-900 cursor-pointer"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            <span className="sr-only">Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-ground font-sans text-slate-900">
      {/* Điện thoại & tablet: thanh 48px, menu mở thành tấm phủ toàn màn hình */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-[#e1e4e9] bg-ground px-4 lg:hidden">
        <Link to="/backoffice" className="font-serif text-base font-black tracking-tight">
          Local<span className="text-crimson">Press</span>
          <span className="ml-2 font-sans text-[13px] font-normal text-slate-500">{scope}</span>
        </Link>
        <div className="flex items-center">
        <ThemeToggle className="h-11 w-11 justify-center" />
        <button
          onClick={() => setMenuOpen(true)}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-slate-700 hover:bg-[#e9ecf0] cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ground lg:hidden">
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-md text-slate-700 hover:bg-[#e9ecf0] cursor-pointer"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebar}
        </div>
      )}

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 flex-none border-r border-[#e1e4e9] lg:block">
          {sidebar}
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-[1240px]">
            <Outlet />
          </div>
        </main>
      </div>

      <RoleSwitcherBar />
    </div>
  )
}
