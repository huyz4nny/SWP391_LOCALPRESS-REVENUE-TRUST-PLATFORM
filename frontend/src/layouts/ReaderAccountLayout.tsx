import React, { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { Badge } from '@/components/ui/badge'
import {
  User as UserIcon,
  BookOpen,
  Bookmark,
  History,
  Crown,
  Receipt,
  Smartphone,
  HelpCircle,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react'

export function ReaderAccountLayout() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
    })
    return unsub
  }, [])

  // Guard: If guest, prompt to login
  if (currentUser.role === 'GUEST') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-stone-200 text-center">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-stone-900 mb-2">Yêu cầu đăng nhập</h2>
          <p className="text-sm text-stone-600 mb-6">
            Bạn cần đăng nhập tài khoản Độc giả để truy cập trang quản lý cá nhân, tủ sách và lịch sử đọc tin.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                mockStore.setCurrentUser('user-reader-free')
              }}
              className="w-full bg-primary-900 text-white py-2 px-4 rounded-md font-medium text-sm hover:bg-primary-800 transition-colors cursor-pointer"
            >
              Demo: Đăng nhập vai trò Độc giả Miễn phí
            </button>
            <button
              onClick={() => {
                mockStore.setCurrentUser('user-reader-premium')
              }}
              className="w-full bg-amber-600 text-white py-2 px-4 rounded-md font-medium text-sm hover:bg-amber-700 transition-colors cursor-pointer"
            >
              Demo: Đăng nhập vai trò Độc giả VIP (Premium)
            </button>
            <Link to="/" className="text-sm text-stone-500 hover:underline mt-2">
              Quay lại Trang chủ Báo
            </Link>
          </div>
        </div>
        <RoleSwitcherBar />
      </div>
    )
  }

  const entitlement = mockStore.getEntitlements(currentUser.id)

  const navItems = [
    { label: 'Hồ sơ tài khoản', path: '/account', icon: UserIcon },
    { label: 'Tủ sách & Bài đã mua', path: '/account/library', icon: BookOpen, badge: entitlement.purchasedArticleIds.length },
    { label: 'Bài viết đã lưu', path: '/account/bookmarks', icon: Bookmark, badge: entitlement.bookmarkedArticleIds.length },
    { label: 'Lịch sử đọc tin', path: '/account/history', icon: History },
    { label: 'Gói đọc & Đặc quyền VIP', path: '/account/subscription', icon: Crown, isVip: true },
    { label: 'Lịch sử giao dịch & Hóa đơn', path: '/account/orders', icon: Receipt },
    { label: 'Quản lý thiết bị (Tối đa 2)', path: '/account/devices', icon: Smartphone, badge: `${entitlement.activeDevices.length}/2` },
    { label: 'Yêu cầu hỗ trợ & Hoàn tiền', path: '/account/support', icon: HelpCircle },
  ]

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              to="/"
              className="flex items-center text-xs font-semibold text-stone-600 hover:text-stone-900 border border-stone-300 rounded px-2.5 py-1.5 hover:bg-stone-50"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Về Trang Báo Chính
            </Link>
            <span className="text-stone-300">|</span>
            <span className="font-serif font-black text-lg text-primary-950">
              Local<span className="text-crimson">Press</span> Độc Giả
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {entitlement.hasSubscription ? (
              <Badge variant="gold" className="px-2.5 py-1 text-xs">
                👑 Hội viên VIP Premium
              </Badge>
            ) : (
              <Link
                to="/premium"
                className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded font-semibold hover:bg-amber-100 flex items-center"
              >
                <Crown className="w-3 h-3 mr-1 text-amber-600" />
                Nâng cấp VIP
              </Link>
            )}
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
              alt=""
              className="w-7 h-7 rounded-full object-cover border border-stone-300"
            />
          </div>
        </div>
      </header>

      {/* Main container with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
              <div className="flex items-center space-x-3 pb-4 border-b border-stone-100">
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-stone-200"
                />
                <div className="truncate">
                  <h3 className="font-bold text-sm text-stone-900 truncate">{currentUser.name}</h3>
                  <p className="text-xs text-stone-500 truncate">{currentUser.email}</p>
                </div>
              </div>

              <nav className="mt-4 space-y-1">
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
                      className={`flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-900 text-white font-semibold'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.isVip ? 'text-amber-600' : 'text-stone-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-primary-800 text-white' : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Account Detail Panel */}
          <main className="md:col-span-3">
            <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs min-h-[500px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <RoleSwitcherBar />
    </div>
  )
}
