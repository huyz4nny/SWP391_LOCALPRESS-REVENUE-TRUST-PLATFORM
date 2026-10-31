// Tác dụng: trang `/account/following` (UC040) — chuyên mục đang follow + feed bài của đúng chuyên mục đó.
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { readerApi, FollowedCategory } from '../api'
import { Article, Category } from '../types'
import { ArticleCard } from '../components/ArticleCard'
import { useReaderLibrary } from '../hooks/useReaderLibrary'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Plus, Rss } from 'lucide-react'

const PAGE_SIZE = 20

// UC040 trang chuyên mục đang theo dõi và feed cá nhân hóa ở màn hình II.3.8
// luồng đi là tải danh sách theo dõi + feed + toàn bộ chuyên mục để gợi ý -> bấm theo dõi hoặc bỏ theo dõi -> tải lại danh sách và feed
export function ReaderFollowingPage() {
  const library = useReaderLibrary()
  const [followed, setFollowed] = useState<FollowedCategory[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [feed, setFeed] = useState<Article[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedLoading, setFeedLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const [followedData, categoryData, feedPage] = await Promise.all([
        readerApi.getFollowedCategories(),
        readerApi.getCategories(),
        readerApi.getFollowedFeedPage(0, PAGE_SIZE),
      ])
      setFollowed(followedData)
      setAllCategories(categoryData)
      setFeed(feedPage.items)
      setPage(feedPage.page)
      setHasMore(feedPage.hasMore)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được nội dung theo dõi')
    } finally {
      setLoading(false)
    }
  }

  const loadMoreFeed = async () => {
    try {
      setFeedLoading(true)
      const res = await readerApi.getFollowedFeedPage(page + 1, PAGE_SIZE)
      setFeed((prev) => {
        const merged = [...prev, ...res.items]
        return merged.filter((a, i) => merged.findIndex((b) => b.id === a.id) === i)
      })
      setPage(res.page)
      setHasMore(res.hasMore)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không tải thêm được bài')
    } finally {
      setFeedLoading(false)
    }
  }

  const handleToggleFollow = async (categoryId: string) => {
    if (busyCategoryId) return
    setBusyCategoryId(categoryId)
    const error = await library.toggleFollow(categoryId)
    setActionError(error)
    setBusyCategoryId(null)
    if (!error) await loadAll()
  }

  const handleToggleBookmark = async (articleId: string) => {
    setActionError(await library.toggleSaved(articleId))
  }

  const followedIds = new Set(followed.map((c) => c.id))
  const suggestions = allCategories.filter((c) => !followedIds.has(c.id))

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-8 w-56 bg-stone-200 rounded" />
        <div className="h-20 bg-stone-200 rounded-lg" />
        <div className="h-28 bg-stone-200 rounded-lg" />
      </div>
    )
  }

  if (loadError) {
    return (
      <EmptyState
        title="Không tải được nội dung theo dõi"
        description={loadError}
        actionLabel="Thử lại"
        onAction={() => loadAll()}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* tieu de trang follow */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Chuyên mục theo dõi</h2>
        <p className="text-xs text-stone-500 mt-1">
          Bài mới của các chuyên mục bạn theo dõi được gom vào bảng tin bên dưới
        </p>
      </div>

      {actionError && <p className="text-xs text-red-700">{actionError}</p>}

      {/* list chuyen muc dang theo doi + nut Bo theo doi tung dong */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Đang theo dõi ({followed.length})</h3>
        {followed.length === 0 ? (
          <p className="text-sm text-slate-500">Bạn chưa theo dõi chuyên mục nào. Chọn trong danh sách gợi ý bên dưới.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {followed.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link to={`/categories/${c.slug}`} className="text-sm font-medium text-slate-900 hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-xs text-slate-500 num">{c.articleCount} bài đã xuất bản</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={busyCategoryId === c.id}
                  onClick={() => handleToggleFollow(c.id)}
                >
                  Bỏ theo dõi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {suggestions.length > 0 && (
        <section className="space-y-3">
          {/* hang chip: nut + ten chuyen muc de theo doi */}
          <h3 className="text-sm font-semibold text-slate-900">Gợi ý chuyên mục</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                isLoading={busyCategoryId === c.id}
                onClick={() => handleToggleFollow(c.id)}
              >
                <Plus className="h-3.5 w-3.5" />
                {c.name}
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* bang tin: vong lap the bai ngang + nut Xem them */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Bảng tin của bạn</h3>
        {feed.length === 0 ? (
          <EmptyState
            icon={<Rss className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
            title="Chưa có bài nào trong bảng tin"
            description="Theo dõi thêm chuyên mục để nhận bài mới tại đây."
          />
        ) : (
          <div className="space-y-3">
            {/* vong lap ve the bai trong feed */}
            {feed.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                variant="horizontal"
                isBookmarked={library.isSaved(art.id)}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
            {hasMore && (
              <div className="pt-2 text-center">
                <Button variant="outline" size="sm" isLoading={feedLoading} onClick={loadMoreFeed}>
                  Xem thêm
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
