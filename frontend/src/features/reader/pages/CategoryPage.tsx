import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Article, Category } from '../types'
import { readerApi } from '../api'
import { ArticleCard } from '../components/ArticleCard'
import { AdSlotBanner } from '@/components/shared/AdSlotBanner'
import { mockStore } from '@/mocks/store'
import { ChevronRight, Filter } from 'lucide-react'

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [articles, setArticles] = useState<Article[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'free' | 'premium'>('all')

  const entitlements = mockStore.getEntitlements(mockStore.getCurrentUser().id)

  useEffect(() => {
    if (slug) loadCategoryArticles(slug)
  }, [slug])

  const loadCategoryArticles = async (categorySlug: string) => {
    try {
      setLoading(true)
      const [artData, catData] = await Promise.all([
        readerApi.getArticles({ category: categorySlug }),
        readerApi.getCategories(),
      ])
      setArticles(artData)
      const foundCat = catData.find((c) => c.slug === categorySlug)
      setCategory(foundCat || null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredArticles = articles.filter((a) => {
    if (filterType === 'free') return !a.isPremium
    if (filterType === 'premium') return a.isPremium
    return true
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-stone-500">
        <Link to="/" className="hover:text-primary-900">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-stone-900">{category?.name || 'Chuyên mục'}</span>
      </nav>

      {/* Category Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
        <h1 className="font-serif text-3xl font-black text-primary-950 uppercase tracking-tight">
          {category?.name || 'Chuyên mục'}
        </h1>
        {category?.description && (
          <p className="mt-2 text-sm text-stone-600 max-w-2xl leading-relaxed">
            {category.description}
          </p>
        )}

        {/* Filter buttons */}
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
            Tất cả ({articles.length})
          </button>
          <button
            onClick={() => setFilterType('free')}
            className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
              filterType === 'free'
                ? 'bg-primary-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Tin tức Miễn phí ({articles.filter((a) => !a.isPremium).length})
          </button>
          <button
            onClick={() => setFilterType('premium')}
            className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
              filterType === 'premium'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            👑 Premium ({articles.filter((a) => a.isPremium).length})
          </button>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-40 bg-stone-200 rounded-lg" />
              <div className="h-40 bg-stone-200 rounded-lg" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-sm text-stone-500">
              Không có bài viết nào thuộc chuyên mục này với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((art) => (
                <ArticleCard
                  key={art.id}
                  article={art}
                  variant="horizontal"
                  isBookmarked={entitlements.bookmarkedArticleIds.includes(art.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 sticky top-20">
          <AdSlotBanner slotCode="SLOT-SIDEBAR-STICKY" />
        </aside>
      </div>
    </div>
  )
}
