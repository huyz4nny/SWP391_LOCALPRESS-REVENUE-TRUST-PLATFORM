import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { WalletBalanceButton } from '@/components/shared/WalletBalanceButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User as UserIcon,
  BookOpen,
  Bookmark,
  Rss,
  History,
  Crown,
  Receipt,
  Smartphone,
  HelpCircle,
  ArrowLeft,
  LogOut,
} from 'lucide-react'
import { logout } from '@/features/identity/authSession'
import { useReaderLibrary } from '@/features/reader/hooks/useReaderLibrary'

export function ReaderAccountLayout() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const location = useLocation()
  const navigate = useNavigate()
  const library = useReaderLibrary()

  useEffect(() => {
    const unsub = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
    })
    return unsub
  }, [])

  // Guard: If guest, prompt to login
  if (currentUser.role === 'GUEST') {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-4 font-sans text-slate-900">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold">Cần đăng nhập</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Đăng nhập tài khoản độc giả để xem tủ sách, bài đã lưu, lịch sử đọc và gói hội viên của bạn.
          </p>
          <div className="mt-5 grid gap-2">
            <Button onClick={() => mockStore.setCurrentUser('user-reader-free')}>
              Demo: đăng nhập độc giả miễn phí
            </Button>
            <Button variant="outline" onClick={() => mockStore.setCurrentUser('user-reader-premium')}>
              Demo: đăng nhập độc giả Premium
            </Button>
          </div>
          <Link to="/" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-900 hover:underline">
            Quay lại trang chủ
          </Link>
        </div>
        <RoleSwitcherBar />
      </div>
    )
  }

  const entitlement = mockStore.getEntitlements(currentUser.id)

  const navItems = [
    { label: 'Hồ sơ tài khoản', path: '/account', icon: UserIcon },
    { label: 'Tủ sách & bài đã mua', path: '/account/library', icon: BookOpen, badge: entitlement.purchasedArticleIds.length },
    { label: 'Bài viết đã lưu', path: '/account/bookmarks', icon: Bookmark, badge: library.savedIds.length },
    { label: 'Chuyên mục theo dõi', path: '/account/following', icon: Rss, badge: library.followedCategoryIds.length },
    { label: 'Lịch sử đọc tin', path: '/account/history', icon: History },
    { label: 'Gói hội viên', path: '/account/subscription', icon: Crown, isVip: true },
    { label: 'Giao dịch & hóa đơn', path: '/account/orders', icon: Receipt },
    { label: 'Thiết bị (tối đa 2)', path: '/account/devices', icon: Smartphone, badge: `${entitlement.activeDevices.length}/2` },
    { label: 'Hỗ trợ & hoàn tiền', path: '/account/support', icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/" className="font-serif text-lg font-black tracking-tight text-slate-900">
              Local<span className="text-crimson">Press</span>
            </Link>
            <span className="hidden text-sm text-slate-500 sm:inline">Tài khoản độc giả</span>
          </div>

          <div className="flex flex-none items-center gap-2.5">
            {entitlement.hasSubscription ? (
              <Badge variant="gold">Hội viên Premium</Badge>
            ) : (
              <Link
                to="/premium"
                className="hidden h-8 items-center rounded-md px-2.5 text-[13px] font-medium text-gold-700 hover:bg-amber-50 sm:flex"
              >
                <Crown className="mr-1.5 h-3.5 w-3.5" />
                Nâng cấp Premium
              </Link>
            )}
            <WalletBalanceButton />
            <ThemeToggle />
            <Link to="/" className="hidden h-8 items-center gap-1 rounded-md px-2.5 text-[13px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:flex">
              <ArrowLeft className="h-3.5 w-3.5" />
              Trang báo
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
          <aside>
            <div className="flex items-center gap-3 px-2.5 pb-4">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#dfe7f5] text-sm font-semibold text-primary-900">
                {currentUser.name.charAt(0)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{currentUser.name}</div>
                <div className="truncate text-xs text-slate-500">{currentUser.email}</div>
              </div>
            </div>

            <nav className="space-y-0.5" aria-label="Tài khoản độc giả">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.path === '/account'
                    ? location.pathname === '/account'
                    : location.pathname.startsWith(item.path)

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-9 items-center justify-between gap-2 rounded-md px-2.5 text-sm transition-colors ${
                      isActive ? 'bg-slate-200/70 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon className="h-4 w-4 flex-none text-slate-500" strokeWidth={1.75} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="flex-none text-xs text-slate-500 num">{item.badge}</span>
                    )}
                  </Link>
                )
              })}
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="mt-2 flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                Đăng xuất
              </button>
            </nav>
          </aside>

          <main className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      <RoleSwitcherBar />
    </div>
  )
}
