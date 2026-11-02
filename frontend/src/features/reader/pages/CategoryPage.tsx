// Tác dụng: trang chuyên mục `/categories/:slug` (UC029, UC040) — list bài + nút theo dõi.
import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Article, Category } from '../types'
import { readerApi } from '../api'
import { ArticleCard } from '../components/ArticleCard'
import { AdSlotBanner } from '@/components/shared/AdSlotBanner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { useReaderLibrary } from '../hooks/useReaderLibrary'
import { Check, ChevronRight, Filter, Plus } from 'lucide-react'

// trang /categories/:slug: thanh loc + list the bai ngang + nut theo doi
export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [articles, setArticles] = useState<Article[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'free' | 'premium'>('all')

  const library = useReaderLibrary()
  const [followBusy, setFollowBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // UC040 theo dõi hoặc bỏ theo dõi chuyên mục đang xem
  const handleToggleFollow = async () => {
    if (!category || followBusy) return
    setFollowBusy(true)
    setActionError(await library.toggleFollow(category.id))
    setFollowBusy(false)
  }

  // UC038 lưu hoặc bỏ lưu bài ngay trên danh sách chuyên mục
  const handleToggleBookmark = async (articleId: string) => {
    setActionError(await library.toggleSaved(articleId))
  }

  useEffect(() => {
    if (slug) loadCategoryArticles(slug, filterType)
  }, [slug, filterType])

  const loadCategoryArticles = async (categorySlug: string, accessFilter: 'all' | 'free' | 'premium') => {
    try {
      setLoading(true)
      setLoadError(null)
      const [artData, catData] = await Promise.all([
        readerApi.getArticles({
          category: categorySlug,
          isPremium: accessFilter === 'all' ? undefined : accessFilter === 'premium',
        }),
        readerApi.getCategories(),
      ])
      setArticles(artData)
      const foundCat = catData.find((c) => c.slug === categorySlug)
      setCategory(foundCat || null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được chuyên mục. Vui lòng thử lại.')
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  const filteredArticles = articles

  return (
    <div className="space-y-6">
      {/* thanh breadcrumb: Trang chu > ten chuyen muc */}
      <nav className="flex items-center space-x-2 text-xs text-stone-500">
        <Link to="/" className="hover:text-primary-900">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-stone-900">{category?.name || 'Chuyên mục'}</span>
      </nav>

      {/* hop dau trang: ten chuyen muc + nut Theo doi / Dang theo doi */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-serif text-3xl font-black text-primary-950 uppercase tracking-tight">
            {category?.name || 'Chuyên mục'}
          </h1>
          {category && (
            <Button
              size="sm"
              variant={library.isFollowing(category.id) ? 'outline' : 'primary'}
              onClick={handleToggleFollow}
              isLoading={followBusy}
              aria-pressed={library.isFollowing(category.id)}
            >
              {library.isFollowing(category.id) ? (
                <><Check className="h-3.5 w-3.5" /> Đang theo dõi</>
              ) : (
                <><Plus className="h-3.5 w-3.5" /> Theo dõi chuyên mục</>
              )}
            </Button>
          )}
        </div>
        {actionError && <p className="mt-2 text-xs text-red-700">{actionError}</p>}
        {category?.description && (
          <p className="mt-2 text-sm text-stone-600 max-w-2xl leading-relaxed">
            {category.description}
          </p>
        )}

        {/* hang nut loc: Tat ca / Mien phi / Premium */}
        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center space-x-2 text-xs">
          <span className="text-stone-500 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Bộ lọc:
          </span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-primary-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterType('free')}
            className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
              filterType === 'free'
                ? 'bg-primary-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Tin tức Miễn phí
          </button>
          <button
            onClick={() => setFilterType('premium')}
            className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
              filterType === 'premium'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Premium
          </button>
        </div>
      </div>

      {/* cot trai list bai, cot phai banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-40 bg-stone-200 rounded-lg" />
              <div className="h-40 bg-stone-200 rounded-lg" />
            </div>
          ) : loadError ? (
            <EmptyState
              title="Không tải được chuyên mục"
              description={loadError}
              actionLabel="Thử lại"
              onAction={() => slug && loadCategoryArticles(slug, filterType)}
            />
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-sm text-stone-500">
              Không có bài viết nào thuộc chuyên mục này với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="space-y-4">
              {/* vong lap ve the bai ngang + nut bookmark tren the */}
              {filteredArticles.map((art) => (
                <ArticleCard
                  key={art.id}
                  article={art}
                  variant="horizontal"
                  isBookmarked={library.isSaved(art.id)}
                  onToggleBookmark={handleToggleBookmark}
                />
              ))}
            </div>
          )}
        </div>

        {/* banner sticky ben phai */}
        <aside className="lg:col-span-4 sticky top-20">
          <AdSlotBanner slotCode="SLOT-SIDEBAR-STICKY" />
        </aside>
      </div>
    </div>
  )
}
