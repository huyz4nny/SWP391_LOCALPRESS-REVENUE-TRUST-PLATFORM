import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Article, Category } from '../types'
import { readerApi } from '../api'
import { mockStore } from '@/mocks/store'
import { ArticleCard, getCategoryBadgeStyle } from '../components/ArticleCard'
import { AdSlotBanner } from '@/components/shared/AdSlotBanner'
import {
  Crown,
  TrendingUp,
  Flame,
  ArrowRight,
  Clock,
  Sparkles,
  Mail,
  CheckCircle2,
  Newspaper,
  Compass,
} from 'lucide-react'

export function HomePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [entitlements, setEntitlements] = useState(mockStore.getEntitlements(mockStore.getCurrentUser().id))
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)

  useEffect(() => {
    loadData()
    const unsub = mockStore.subscribe(() => {
      setEntitlements(mockStore.getEntitlements(mockStore.getCurrentUser().id))
    })
    return unsub
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [artData, catData] = await Promise.all([
        readerApi.getArticles(),
        readerApi.getCategories(),
      ])
      setArticles(artData)
      setCategories(catData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBookmark = async (articleId: string) => {
    try {
      await readerApi.toggleBookmark(articleId)
      setEntitlements(mockStore.getEntitlements(mockStore.getCurrentUser().id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newsletterEmail) {
      setNewsletterSubscribed(true)
      setTimeout(() => setNewsletterSubscribed(false), 5000)
      setNewsletterEmail('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse py-8">
        <div className="h-96 bg-stone-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-stone-200 rounded-xl" />
          <div className="h-64 bg-stone-200 rounded-xl" />
          <div className="h-64 bg-stone-200 rounded-xl" />
        </div>
      </div>
    )
  }

  const featuredArticle = articles[0]
  const secondaryArticles = articles.slice(1, 4)
  const premiumArticles = articles.filter((a) => a.isPremium).slice(0, 3)
  const trendingArticles = [...articles].sort((a, b) => b.views - a.views).slice(0, 5)

  // Fast live timeline items (latest 4 published articles)
  const liveTimelineArticles = [...articles].slice(0, 4)

  return (
    <div className="space-y-12">
      {/* 1. Hero Showcase: 1 Big Main Lead + 3 Secondary Top Stories */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Feature Story (7 cols) */}
        <div className="lg:col-span-7">
          {featuredArticle && (
            <ArticleCard
              article={featuredArticle}
              variant="featured"
              isBookmarked={entitlements.bookmarkedArticleIds.includes(featuredArticle.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          )}
        </div>

        {/* Secondary Stories Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-stone-900 text-stone-900">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-crimson" />
              <h2 className="font-serif font-black text-xs uppercase tracking-wider">
                Tiêu điểm nóng trong ngày
              </h2>
            </div>
            <span className="text-[11px] font-medium text-stone-500">Cập nhật liên tục</span>
          </div>

          <div className="space-y-3">
            {secondaryArticles.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                variant="horizontal"
                isBookmarked={entitlements.bookmarkedArticleIds.includes(art.id)}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Fast Editorial Timeline (Dòng sự kiện 24/7) */}
      <section className="bg-white rounded-xl border border-stone-200/90 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center space-x-2 mb-3.5 pb-2 border-b border-stone-100 text-xs font-bold text-stone-900 uppercase tracking-wider">
          <Compass className="w-4 h-4 text-primary-900" />
          <span>Dòng sự kiện nhanh trong ngày</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {liveTimelineArticles.map((art, idx) => (
            <div
              key={art.id}
              className="flex flex-col justify-between p-3 rounded-lg bg-stone-50/70 hover:bg-stone-100/80 transition-colors border border-stone-200/60 group"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className={`font-bold px-1.5 py-0.5 rounded border uppercase ${getCategoryBadgeStyle(art.categorySlug)}`}>
                    {art.categoryName}
                  </span>
                  <span className="text-stone-400 flex items-center">
                    <Clock className="w-2.5 h-2.5 mr-0.5" />
                    {idx === 0 ? '13:15' : idx === 1 ? '11:45' : idx === 2 ? '09:20' : '07:30'}
                  </span>
                </div>
                <Link to={`/articles/${art.slug}`}>
                  <h4 className="font-serif text-xs font-bold text-stone-900 group-hover:text-primary-900 transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h4>
                </Link>
              </div>
              <div className="mt-2 text-[10px] text-stone-400 flex items-center justify-between">
                <span>{art.readTimeMinutes} phút đọc</span>
                <span className="text-primary-900 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
                  Xem <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Luxury Premium VIP Showcase Box */}
      <section className="bg-gradient-to-br from-stone-950 via-slate-950 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-amber-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-5 border-b border-stone-800 gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-amber-400 font-black text-xs uppercase tracking-widest mb-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>ĐẶC QUYỀN HỘI VIÊN LOCALPRESS PREMIUM</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black mt-2 tracking-tight">
              Báo chí Dữ liệu & Phóng sự Điều tra Độc quyền
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-2 max-w-2xl leading-relaxed">
              Những bài phân tích kinh tế chuyên sâu, hồ sơ điều tra pháp luật độc quyền và cơ hội đầu tư địa phương được bảo vệ bởi cơ chế Paywall máy chủ, đọc mượt mà không quảng cáo xen kẽ.
            </p>
          </div>

          <Link
            to="/premium"
            className="inline-flex items-center bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 shrink-0 cursor-pointer"
          >
            <Crown className="w-4 h-4 mr-2 text-stone-950" />
            <span>Khám phá các gói hội viên</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {premiumArticles.map((art) => (
            <div
              key={art.id}
              className="bg-stone-900/80 rounded-xl p-5 border border-stone-800 flex flex-col justify-between hover:border-amber-500/50 hover:bg-stone-900 transition-all duration-300 group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-2.5">
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                    {art.categoryName}
                  </span>
                  <span className="bg-amber-500/15 text-amber-300 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-amber-500/30">
                    {art.price ? `${(art.price / 1000).toFixed(0)}k ₫ / bài` : 'GÓI VIP'}
                  </span>
                </div>
                <Link to={`/articles/${art.slug}`}>
                  <h3 className="font-serif text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {art.title}
                  </h3>
                </Link>
                <p className="mt-2.5 text-xs text-stone-400 line-clamp-2 leading-relaxed">
                  {art.sapo}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                <span>{art.authorName}</span>
                <Link
                  to={`/articles/${art.slug}`}
                  className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center group-hover:translate-x-1 transition-transform"
                >
                  Đọc thử nội dung <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Inline Banner Placement */}
      <div className="w-full">
        <AdSlotBanner slotCode="SLOT-ARTICLE-INLINE" />
      </div>

      {/* 5. Magazine Category Sections + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: All 6 Categories with Editorial Asymmetric Layout (8 cols) */}
        <div className="lg:col-span-8 space-y-12">
          {categories.map((cat) => {
            const catArticles = articles.filter(
              (a) => a.categoryId === cat.id || a.categorySlug === cat.slug
            )
            if (catArticles.length === 0) return null

            const leadStory = catArticles[0]
            const subStories = catArticles.slice(1, 4)

            return (
              <section key={cat.id} className="space-y-5">
                {/* Editorial Section Header */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-stone-900">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full bg-crimson" />
                    <h2 className="font-serif text-xl sm:text-2xl font-black text-stone-950 uppercase tracking-tight">
                      {cat.name}
                    </h2>
                  </div>
                  <Link
                    to={`/categories/${cat.slug}`}
                    className="text-xs font-bold text-stone-700 hover:text-primary-950 hover:underline flex items-center group"
                  >
                    Xem tất cả ({catArticles.length} bài)
                    <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Asymmetric Content Layout: 1 Lead (Left) + 2-3 Sub-cards (Right) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
                  {/* Lead Article (7 cols) */}
                  <div className="sm:col-span-7">
                    {leadStory && (
                      <ArticleCard
                        article={leadStory}
                        variant="lead"
                        isBookmarked={entitlements.bookmarkedArticleIds.includes(leadStory.id)}
                        onToggleBookmark={handleToggleBookmark}
                      />
                    )}
                  </div>

                  {/* Sub Stories List (5 cols) */}
                  <div className="sm:col-span-5 space-y-3">
                    {subStories.map((art) => (
                      <ArticleCard
                        key={art.id}
                        article={art}
                        variant="compact"
                        isBookmarked={entitlements.bookmarkedArticleIds.includes(art.id)}
                        onToggleBookmark={handleToggleBookmark}
                      />
                    ))}
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        {/* Right Column: Sticky Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-8 sticky top-20">
          {/* 1. Trending Top 5 Stories */}
          <div className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-2xs">
            <div className="flex items-center space-x-2 pb-3.5 border-b border-stone-200 text-stone-950 font-black text-xs uppercase tracking-wider mb-4">
              <TrendingUp className="w-4 h-4 text-crimson" />
              <span>ĐỌC NHIỀU NHẤT TRONG TUẦN</span>
            </div>

            <div className="space-y-3">
              {trendingArticles.map((art, idx) => (
                <div
                  key={art.id}
                  className="flex items-start space-x-3.5 py-2.5 border-b border-stone-100 last:border-0 group"
                >
                  <span className="font-serif text-3xl font-black text-stone-300 group-hover:text-crimson transition-colors shrink-0 w-8 text-center">
                    {`0${idx + 1}`}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${getCategoryBadgeStyle(art.categorySlug)}`}>
                        {art.categoryName}
                      </span>
                    </div>
                    <Link to={`/articles/${art.slug}`}>
                      <h4 className="font-serif text-xs sm:text-sm font-bold text-stone-900 group-hover:text-primary-900 transition-colors line-clamp-2 leading-snug">
                        {art.title}
                      </h4>
                    </Link>
                    <div className="flex items-center space-x-2 text-[10px] text-stone-400 mt-1">
                      <span>{art.views.toLocaleString()} lượt đọc</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Newsletter Signup Box */}
          <div className="bg-gradient-to-br from-primary-950 to-stone-900 text-white rounded-2xl p-6 shadow-sm border border-stone-800">
            <div className="w-10 h-10 rounded-xl bg-primary-800/50 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="font-serif text-lg font-bold text-white">
              Bản tin Kinh tế - Logistics Hải Phòng
            </h3>
            <p className="text-xs text-stone-300 mt-1 leading-relaxed">
              Nhận tóm tắt tin tức thời sự cảng biển, quy hoạch đô thị Thủy Nguyên và cơ hội đầu tư FDI địa phương qua email vào 6h30 mỗi sáng.
            </p>

            {newsletterSubscribed ? (
              <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                Cảm ơn bạn! Chúng tôi đã lưu địa chỉ email của bạn.
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="mt-4 space-y-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Nhập email của bạn..."
                  className="w-full px-3.5 py-2 text-xs bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-400 focus:outline-none focus:border-amber-400 transition-colors"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Đăng ký miễn phí
                </button>
              </form>
            )}
          </div>

          {/* 3. B2B Advertiser Direct Callout */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-stone-800">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-xs uppercase mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>DÀNH CHO DOANH NGHIỆP</span>
            </div>
            <h4 className="font-serif text-sm font-bold text-stone-950 mt-1">
              Quảng bá thương hiệu tới 650.000+ độc giả Hải Phòng
            </h4>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Đặt banner vị trí kim cương, đo lường lượt hiển thị thực tế (Impression & CTR), xuất hóa đơn tài chính tự động.
            </p>
            <Link
              to="/advertiser"
              className="mt-3 inline-flex items-center text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline"
            >
              Khám phá các vị trí quảng cáo →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
