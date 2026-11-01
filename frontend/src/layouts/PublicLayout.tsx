// Tác dụng: khung trang báo công khai (masthead, tìm kiếm, badge VIP, ví). Ẩn ticker/banner trên /login /register.
import React, { useState, useEffect } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { RoleSwitcherBar } from '@/components/shared/RoleSwitcherBar'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { AdSlotBanner } from '@/components/shared/AdSlotBanner'
import { WalletBalanceButton } from '@/components/shared/WalletBalanceButton'
import {
  Search,
  Crown,
  Sun,
  Menu,
  X,
  ChevronRight,
  Building2,
} from 'lucide-react'
import { logout } from '@/features/identity/authSession'
import { useReaderSubscription } from '@/features/reader/hooks/useReaderSubscription'

export function PublicLayout() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const [categories, setCategories] = useState(mockStore.getState().categories)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  // login/register: bo banner va dai tin de nut submit khong bi day xuong duoi man hinh
  const isAuthScreen = ['/login', '/register', '/forgot-password'].includes(location.pathname)

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

  const subscription = useReaderSubscription()
  const isPremiumUser = subscription.hasInEffect

  const latestBreakingNews = {
    title: 'HĐND thành phố Hải Phòng thông qua Nghị quyết 150 tỷ đồng hỗ trợ ngư dân nâng cấp tàu cá Bạch Long Vĩ',
    slug: 'hdnd-hai-phong-thong-qua-nghi-quyet-ho-tro-ngu-dan-bach-long-vi',
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-stone-900 font-sans">
      {/* khung bao toan trang bao: header + banner + noi dung + footer */}
      <header className="bg-white">
        {/* thanh ngang tren cung: ngay/thoi tiet ben trai, link dang nhap ben phai */}
        <div className="max-w-7xl mx-auto px-4 pt-3 pb-2 flex items-center justify-between text-xs text-stone-500 border-b border-stone-100">
          {/* chu Hai Phong + ngay + nhiet do */}
          <div className="flex items-center space-x-2">
            <span>Hải Phòng</span>
            <span className="text-stone-300">•</span>
            <span>Thứ Hai, 28/09/2026</span>
            <span className="text-stone-300">•</span>
            <span className="flex items-center text-stone-600 font-medium">
              <Sun className="w-3.5 h-3.5 mr-1 text-amber-500" /> 28°C
            </span>
          </div>

          {/* nut dark mode + link Dat quang cao + Goi Premium + Dang nhap/Dang ky */}
          <div className="flex items-center space-x-3.5">
            <ThemeToggle className="h-7 px-1.5 text-stone-600 hover:bg-stone-100" />
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
              <div className="flex items-center space-x-2.5">
                {/* nut so du vi cua Huy */}
                <WalletBalanceButton />
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
                  {subscription.loaded && isPremiumUser && (
                    <span className="bg-amber-100 text-amber-900 text-[11px] font-semibold px-1.5 rounded">
                      VIP
                    </span>
                  )}
                </Link>
                <span className="text-stone-300">|</span>
                {/* nut Dang xuat, bam thi ve trang chu */}
                <button
                    onClick={() => {
                      logout()
                      navigate('/')
                    }}
                  className="text-xs text-stone-400 hover:text-red-600 transition-colors font-medium cursor-pointer"
                  title="Đăng xuất"
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>

        {/* hang giua header: logo LOCALPRESS + o tim kiem */}
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="w-48 hidden md:block" />

          {/* chu LOCALPRESS bam ve trang chu */}
          <div className="text-center flex-1">
            <Link to="/" className="inline-block group">
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-stone-900 uppercase">
                LOCAL<span className="text-crimson">PRESS</span>
                <span className="text-crimson inline-block ml-0.5">.</span>
              </h1>
            </Link>
            <p className="font-serif text-[13px] text-stone-600 mt-1">
              Báo điện tử địa phương Hải Phòng
            </p>
          </div>

          {/* o nhap tim tin, enter thi sang /search */}
          <div className="w-48 flex justify-end">
            <form onSubmit={handleSearchSubmit} className="relative w-44 sm:w-48">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tin tức..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-full focus:outline-none focus:ring-1 focus:ring-stone-400 focus:bg-white transition-colors placeholder:text-stone-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            </form>
          </div>
        </div>

        {/* thanh ngang menu chuyen muc: Trang chu, vong lap ten chuyen muc, Goi VIP */}
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

            {/* man dien thoai: nut mo/dong menu chuyen muc */}
            <div className="lg:hidden flex items-center justify-between w-full py-2.5">
              <span className="text-sm font-medium text-stone-700 flex items-center">
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

          {/* list chuyen muc xoe xuong khi bam nut menu */}
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
                Gói Premium
              </Link>
              <Link
                to="/advertiser"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-semibold text-primary-900 border-t border-stone-100 mt-2 pt-2"
              >
                Đặt quảng cáo
              </Link>
            </div>
          )}
        </nav>

        {!isAuthScreen && (
          <div className="bg-stone-50 py-2 px-4 text-[13px]">
            <div className="max-w-7xl mx-auto flex items-center space-x-2 text-stone-600">
              <span className="font-semibold text-crimson text-xs shrink-0">
                Mới nhất
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
        )}
      </header>

      {!isAuthScreen && (
        <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
          <AdSlotBanner slotCode="SLOT-TOP-LEADERBOARD" />
        </div>
      )}

      {/* cho trang con: trang chu, bai viet, search... */}
      <main className={`flex-1 max-w-7xl mx-auto px-4 w-full ${isAuthScreen ? 'py-4' : 'py-6'}`}>
        <Outlet />
      </main>

      {/* footer: logo, list chuyen muc, link doc gia, link B2B */}
      <footer className="bg-white mt-24 text-stone-700 text-[13px]">
        <div className="max-w-7xl mx-auto px-4 py-14">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2 space-y-3">
              <Link to="/">
                <h2 className="font-serif text-4xl font-black text-stone-900 uppercase tracking-tight">
                  LOCAL<span className="text-crimson">PRESS</span>
                  <span className="text-crimson">.</span>
                </h2>
              </Link>
              <p className="text-stone-700 leading-6 text-[13px] max-w-md">
                Báo điện tử địa phương & Nền tảng Doanh thu tự chủ — Kênh truyền thông báo chí dữ liệu, phóng sự điều tra và kết nối thương mại địa phương Hải Phòng.
              </p>
              <div className="pt-1 space-y-1 text-stone-700 text-[13px] leading-6">
                <p><span className="text-stone-500">Tòa soạn:</span> Số 10 đường Lạch Tray, Quận Ngô Quyền, TP. Hải Phòng</p>
                <p><span className="text-stone-500">Đường dây nóng:</span> (0225) 3.842.123 · 0912.345.678</p>
                <p><span className="text-stone-500">Thư điện tử:</span> toasoan@localpress.vn · quangcao@localpress.vn</p>
                <p><span className="text-stone-500">Giấy phép:</span> 108/GP-BTTTT, cấp ngày 15/01/2026</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-stone-900 text-sm mb-3">
                Chuyên mục
              </h3>
              <ul className="space-y-2 text-stone-700">
                {/* vong lap link chuyen muc o footer */}
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
              <h3 className="font-semibold text-stone-900 text-sm mb-3">
                Độc giả
              </h3>
              <ul className="space-y-2">
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
              <h3 className="font-semibold text-stone-900 text-sm mb-3">
                Quản trị & B2B
              </h3>
              <ul className="space-y-2">
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

          <div className="mt-10 pt-4 flex flex-col md:flex-row items-center justify-between text-stone-600 text-xs gap-2">
            <p>© 2026 Báo điện tử LocalPress. Bản quyền thuộc về Tòa soạn.</p>
            <p>SWP391, Nhóm 2, Đại học FPT</p>
          </div>
        </div>
      </footer>

      {/* thanh doi role demo o goc man hinh */}
      <RoleSwitcherBar />
    </div>
  )
}
