import React, { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { AdSlotBanner } from '@/components/shared/AdSlotBanner'
import {
  Search,
  Crown,
  Sun,
  Menu,
  X,
  ChevronRight,
  Building2,
} from 'lucide-react'

export function PublicLayout() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const [categories, setCategories] = useState(mockStore.getState().categories)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const unsub = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
      setCategories(mockStore.getState().categories)
    })
    return unsub
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  const entitlement = mockStore.getEntitlements(currentUser.id)
  const isPremiumUser = entitlement.hasSubscription

  const latestBreakingNews = {
    title: 'HĐND thành phố Hải Phòng thông qua Nghị quyết 150 tỷ đồng hỗ trợ ngư dân nâng cấp tàu cá Bạch Long Vĩ',
    slug: 'hdnd-hai-phong-thong-qua-nghi-quyet-ho-tro-ngu-dan-bach-long-vi',
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-stone-900 font-sans">
      {/* 1. Header chính tinh giản & sang trọng (Minimalist Clean Masthead) */}
      <header className="bg-white">
        {/* Top utility row */}
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between text-xs text-stone-500 border-b border-stone-100">
          {/* Trái: Ngày tháng & thời tiết 1 dòng mỏng nhẹ */}
          <div className="flex items-center space-x-2">
            <span>Hải Phòng</span>
            <span className="text-stone-300">•</span>
            <span>Thứ Hai, 28/09/2026</span>
            <span className="text-stone-300">•</span>
            <span className="flex items-center text-stone-600 font-medium">
              <Sun className="w-3.5 h-3.5 mr-1 text-amber-500" /> 28°C
            </span>
          </div>

          {/* Phải: Liên kết phụ tinh tế */}
          <div className="flex items-center space-x-3.5">
            <Link
              to="/advertiser"
              className="text-stone-500 hover:text-stone-900 font-medium transition-colors"
            >
              Đặt quảng cáo
            </Link>
            <span className="text-stone-300">|</span>
            <Link
              to="/premium"
              className="inline-flex items-center text-amber-700 hover:text-amber-800 font-semibold transition-colors"
            >
              <Crown className="w-3.5 h-3.5 mr-1 text-amber-500" />
              Gói Premium
            </Link>
            <span className="text-stone-300">|</span>
            {currentUser.role === 'GUEST' ? (
              <div className="flex items-center space-x-1.5">
                <Link to="/login" className="hover:text-stone-900 font-medium">
                  Đăng nhập
                </Link>
                <span className="text-stone-300">/</span>
                <Link to="/register" className="hover:text-stone-900 font-medium">
                  Đăng ký
                </Link>
              </div>
            ) : (
              <Link
                to="/account"
                className="flex items-center space-x-1.5 font-medium text-stone-700 hover:text-stone-950"
              >
                <img
                  src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-stone-200"
                />
                <span className="font-semibold text-xs">{currentUser.name.split(' ')[0]}</span>
                {isPremiumUser && (
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                    VIP
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Masthead Center Branding & Search */}
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="w-48 hidden md:block" />

          {/* Logo trung tâm thanh lịch */}
          <div className="text-center flex-1">
            <Link to="/" className="inline-block group">
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 uppercase">
                LOCAL<span className="text-crimson">PRESS</span>
                <span className="text-crimson inline-block ml-0.5">.</span>
              </h1>
            </Link>
            <p className="font-serif text-[11px] text-stone-400 italic tracking-wider mt-0.5">
              Báo điện tử địa phương Hải Phòng • Tiếng nói của Nhân dân thành phố Cảng
            </p>
          </div>

          {/* Search box nhỏ gọn bên phải */}
          <div className="w-48 flex justify-end">
            <form onSubmit={handleSearchSubmit} className="relative w-44 sm:w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tin tức..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-all placeholder:text-stone-400"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            </form>
          </div>
        </div>

        {/* 2. Menu chuyên mục tinh gọn (Sticky, không nút khối đen, chỉ có active underline đỏ mỏng) */}
        <nav className="border-y border-stone-200 bg-white sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <div className="hidden lg:flex items-center space-x-7 py-2.5 overflow-x-auto text-sm mx-auto">
              <Link
                to="/"
                className={`font-semibold pb-1 border-b-2 transition-colors ${
                  location.pathname === '/'
                    ? 'text-crimson border-crimson'
                    : 'text-stone-600 hover:text-stone-900 border-transparent'
                }`}
              >
                Trang chủ
              </Link>
              {categories.map((cat) => {
                const isActive =
                  location.pathname === `/categories/${cat.slug}` ||
                  location.pathname === `/category/${cat.slug}`
                return (
                  <Link
                    key={cat.id}
                    to={`/categories/${cat.slug}`}
                    className={`font-medium pb-1 border-b-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-crimson border-crimson font-semibold'
                        : 'text-stone-600 hover:text-stone-900 border-transparent'
                    }`}
                  >
                    {cat.name}
                  </Link>
                )
              })}
              <Link
                to="/premium"
                className="font-semibold text-amber-700 hover:text-amber-800 flex items-center whitespace-nowrap pb-1 border-b-2 border-transparent transition-colors"
              >
                <Crown className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Gói VIP
              </Link>
            </div>

            {/* Mobile toggle button */}
            <div className="lg:hidden flex items-center justify-between w-full py-2.5">
              <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider flex items-center">
                <Menu className="w-4 h-4 mr-1.5 text-stone-700" />
                Chuyên mục
              </span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1 rounded-md text-stone-700 hover:bg-stone-100"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden border-t border-stone-200 bg-white px-4 py-3 space-y-1">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-sm font-semibold text-crimson"
              >
                Trang chủ
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categories/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-1.5 text-sm text-stone-600 hover:text-stone-900 font-medium"
                >
                  {cat.name}
                </Link>
              ))}
              <Link
                to="/premium"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1.5 text-sm font-semibold text-amber-700"
              >
                👑 Chuyên mục VIP
              </Link>
              <Link
                to="/advertiser"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-primary-900 border-t border-stone-100 mt-2 pt-2"
              >
                🏢 Đặt Quảng Cáo
              </Link>
            </div>
          )}
        </nav>

        {/* 3. Dải tin mới siêu mỏng & trang nhã (Minimalist Breaking News Ticker) */}
        <div className="bg-stone-50 border-b border-stone-100 py-1.5 px-4 text-xs">
          <div className="max-w-7xl mx-auto flex items-center space-x-2 text-stone-600">
            <span className="font-bold text-crimson uppercase text-[10px] tracking-wider flex items-center shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-crimson mr-1.5 animate-pulse" />
              MỚI NHẤT
            </span>
            <span className="text-stone-300">•</span>
            <Link
              to={`/articles/${latestBreakingNews.slug}`}
              className="hover:text-crimson truncate font-medium text-stone-700 transition-colors flex-1"
            >
              {latestBreakingNews.title}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0 hidden sm:inline" />
          </div>
        </div>
      </header>

      {/* 4. Top Leaderboard Banner Ad */}
      <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
        <AdSlotBanner slotCode="SLOT-TOP-LEADERBOARD" />
      </div>

      {/* 5. Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <Outlet />
      </main>

      {/* 6. Comprehensive Newspaper Footer */}
      <footer className="border-t border-stone-300 bg-white mt-16 text-stone-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-3">
              <Link to="/">
                <h2 className="font-serif text-2xl font-black text-stone-900 uppercase tracking-tight">
                  LOCAL<span className="text-crimson">PRESS</span>
                  <span className="text-crimson">.</span>
                </h2>
              </Link>
              <p className="text-stone-500 leading-relaxed text-xs">
                Báo điện tử địa phương & Nền tảng Doanh thu tự chủ — Kênh truyền thông báo chí dữ liệu, phóng sự điều tra và kết nối thương mại địa phương Hải Phòng.
              </p>
              <div className="pt-1 space-y-1 text-stone-500 text-[11px]">
                <p>📍 <strong>Tòa soạn:</strong> Số 10 đường Lạch Tray, Quận Ngô Quyền, TP. Hải Phòng</p>
                <p>📞 <strong>Đường dây nóng:</strong> (0225) 3.842.123 • <strong>Hotline:</strong> 0912.345.678</p>
                <p>✉️ <strong>Tòa soạn:</strong> toasoan@localpress.vn • <strong>Quảng cáo:</strong> quangcao@localpress.vn</p>
                <p>📜 Giấy phép xuất bản báo điện tử số: 108/GP-BTTTT cấp ngày 15/01/2026</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs mb-3 pb-1 border-b border-stone-100">
                Chuyên mục
              </h3>
              <ul className="space-y-1.5 text-stone-600">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link to={`/categories/${c.slug}`} className="hover:text-stone-900 transition-colors">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs mb-3 pb-1 border-b border-stone-100">
                Độc giả
              </h3>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/premium" className="text-amber-700 font-medium hover:underline flex items-center">
                    <Crown className="w-3 h-3 mr-1 text-amber-500" />
                    Gói Premium
                  </Link>
                </li>
                <li>
                  <Link to="/account/subscription" className="hover:text-stone-900">
                    Gói đang dùng
                  </Link>
                </li>
                <li>
                  <Link to="/account/bookmarks" className="hover:text-stone-900">
                    Bài đã lưu
                  </Link>
                </li>
                <li>
                  <Link to="/account/devices" className="hover:text-stone-900">
                    Thiết bị (Tối đa 2)
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs mb-3 pb-1 border-b border-stone-100">
                Quản trị & B2B
              </h3>
              <ul className="space-y-1.5">
                <li>
                  <Link to="/advertiser" className="text-primary-900 font-medium hover:underline flex items-center">
                    <Building2 className="w-3.5 h-3.5 mr-1 text-primary-800" />
                    Đặt Quảng Cáo (B2B)
                  </Link>
                </li>
                <li>
                  <Link to="/backoffice/editorial" className="hover:text-stone-900">
                    Tòa Soạn & Biên Tập
                  </Link>
                </li>
                <li>
                  <Link to="/backoffice/finance" className="hover:text-stone-900">
                    Kế Toán & Đối Soát
                  </Link>
                </li>
                <li>
                  <Link to="/backoffice/admin" className="hover:text-stone-900">
                    Quản Trị Hệ Thống
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-stone-200 mt-8 pt-4 flex flex-col md:flex-row items-center justify-between text-stone-400 text-[11px] gap-2">
            <p>© 2026 Báo điện tử LocalPress. Bản quyền thuộc về Tòa soạn.</p>
            <p className="font-mono text-stone-400">SWP391 — Nhóm 2 FPTU</p>
          </div>
        </div>
      </footer>

      {/* Floating Demo Role Switcher */}
      <RoleSwitcherBar />
    </div>
  )
}
