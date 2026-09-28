import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Article } from '../types'
import { readerApi } from '../api'
import { mockStore } from '@/mocks/store'
import { PaywallPrompt } from '../components/PaywallPrompt'
import { CommentSection } from '../components/CommentSection'
import { AdSlotBanner } from '@/components/shared/AdSlotBanner'
import { ArticleCard } from '../components/ArticleCard'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format'
import {
  Clock,
  Bookmark,
  Share2,
  Crown,
  CheckCircle2,
  Lock,
  ChevronRight,
  Eye,
  Volume2,
} from 'lucide-react'

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<Article | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const currentUser = mockStore.getCurrentUser()
  const entitlements = mockStore.getEntitlements(currentUser.id)

  useEffect(() => {
    if (slug) {
      loadArticle(slug)
    }
  }, [slug, currentUser.id])

  const loadArticle = async (articleSlug: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await readerApi.getArticleBySlug(articleSlug)
      setArticle(data)
      setIsBookmarked(entitlements.bookmarkedArticleIds.includes(data.id))

      // Load related in same category
      const allArticles = await readerApi.getArticles({ category: data.categorySlug })
      setRelatedArticles(allArticles.filter((a) => a.id !== data.id).slice(0, 3))
    } catch (err: any) {
      setError(err.message || 'Không tìm thấy bài viết')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBookmark = async () => {
    if (!article) return
    try {
      const res = await readerApi.toggleBookmark(article.id)
      setIsBookmarked(res.bookmarked)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-pulse space-y-6">
        <div className="h-6 w-32 bg-stone-200 rounded" />
        <div className="h-12 w-full bg-stone-200 rounded" />
        <div className="h-96 w-full bg-stone-200 rounded" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">Không tìm thấy bài viết</h2>
        <p className="text-sm text-stone-500 mb-6">{error || 'Bài viết có thể đã bị gỡ hoặc đường dẫn không đúng.'}</p>
        <Link to="/" className="text-primary-900 font-semibold hover:underline text-sm">
          Quay lại Trang chủ
        </Link>
      </div>
    )
  }

  const isUnlocked = !article.isPremium || !!article.content

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-stone-500 mb-4">
        <Link to="/" className="hover:text-primary-900">
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/categories/${article.categorySlug}`} className="hover:text-primary-900 font-medium">
          {article.categoryName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="truncate max-w-xs">{article.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Article Content */}
        <article className="lg:col-span-8 bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-2xs">
          {/* Header */}
          <div className="space-y-3 pb-6 border-b border-stone-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-primary-900 uppercase tracking-wider bg-stone-100 px-2.5 py-0.5 rounded">
                {article.categoryName}
              </span>
              {article.isPremium && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center shadow-xs">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </span>
              )}
              {article.isPremium && isUnlocked && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded flex items-center border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Đã mở khóa toàn văn
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-bold text-stone-950 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500 pt-2">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-stone-800">{article.authorName}</span>
                <span>•</span>
                <span>{formatDateTime(article.publishedAt || article.createdAt)}</span>
                <span>•</span>
                <span className="flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1" /> {article.readTimeMinutes} phút đọc
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleToggleBookmark}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded border text-xs cursor-pointer transition-colors ${
                    isBookmarked
                      ? 'bg-primary-900 text-white border-primary-900'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                  title="Lưu vào bài viết đã đánh dấu"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span>{isBookmarked ? 'Đã lưu' : 'Lưu bài'}</span>
                </button>

                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded border text-xs cursor-pointer transition-colors ${
                    isPlayingAudio
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                  title="Nghe đọc bài báo"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPlayingAudio ? 'Đang đọc...' : 'Nghe báo (AI)'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sapo Lead */}
          <div className="my-6 p-4 rounded-lg bg-stone-50 border-l-4 border-primary-900 text-stone-800 font-serif text-sm sm:text-base leading-relaxed italic">
            {article.sapo}
          </div>

          {/* Cover image */}
          <div className="my-6 overflow-hidden rounded-lg">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-auto object-cover max-h-[480px]"
            />
            <p className="text-[11px] text-stone-500 italic text-center mt-2">
              Ảnh tư liệu phóng sự thực hiện bởi Tòa soạn LocalPress.
            </p>
          </div>

          {/* Article Body Content */}
          <div className="font-serif text-stone-800 text-sm sm:text-base leading-relaxed space-y-4">
            {isUnlocked ? (
              // Full content
              article.content?.split('\n\n').map((paragraph, idx) => {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={idx} className="font-sans text-lg font-bold text-stone-900 pt-4 pb-1">
                      {paragraph.replace('### ', '')}
                    </h3>
                  )
                }
                return <p key={idx}>{paragraph}</p>
              })
            ) : (
              // Preview only with Paywall callout
              <div>
                <p className="text-stone-700 leading-relaxed">{article.previewContent}</p>
                <div className="h-12 bg-gradient-to-b from-transparent to-white" />
                <PaywallPrompt article={article} />
              </div>
            )}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-4 border-t border-stone-200 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-stone-400 font-medium">Từ khóa:</span>
              {article.tags.map((tag, idx) => (
                <Link
                  key={idx}
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-0.5 rounded transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Comments section */}
          <CommentSection articleId={article.id} />
        </article>

        {/* Right Sidebar: Sticky Ads and Related Articles */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="sticky top-20 space-y-6">
            <AdSlotBanner slotCode="SLOT-SIDEBAR-STICKY" />

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
                <h3 className="font-serif text-sm font-bold text-stone-900 pb-2 border-b border-stone-200 mb-3">
                  Cùng chuyên mục {article.categoryName}
                </h3>
                <div className="space-y-3">
                  {relatedArticles.map((art) => (
                    <ArticleCard key={art.id} article={art} variant="compact" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
