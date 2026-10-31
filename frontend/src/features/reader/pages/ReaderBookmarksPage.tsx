// Tác dụng: trang `/account/bookmarks` (UC038) — list bài đã lưu, bỏ lưu tại chỗ.
import React, { useState, useEffect } from 'react'
import { readerApi } from '../api'
import { Article } from '../types'
import { ArticleCard } from '../components/ArticleCard'
import { useReaderLibrary } from '../hooks/useReaderLibrary'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Bookmark } from 'lucide-react'

const PAGE_SIZE = 20

// UC038 trang bài viết đã lưu ở màn hình II.3.6
// luồng đi là tải trang đầu từ GET /reader/saved-articles -> bấm bỏ lưu thì gọi DELETE qua useReaderLibrary -> thẻ bài biến khỏi danh sách
export function ReaderBookmarksPage() {
  const library = useReaderLibrary()
  const [articles, setArticles] = useState<Article[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    loadPage(0)
  }, [])

  const loadPage = async (nextPage: number) => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await readerApi.getSavedArticlesPage(nextPage, PAGE_SIZE)
      setArticles((prev) => {
        const merged = nextPage === 0 ? res.items : [...prev, ...res.items]
        return merged.filter((a, i) => merged.findIndex((b) => b.id === a.id) === i)
      })
      setPage(res.page)
      setHasMore(res.hasMore)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách bài đã lưu')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (articleId: string) => {
    setActionError(await library.toggleSaved(articleId))
  }

  // ẩn ngay bài vừa bỏ lưu, chỉ lọc khi đã tải xong danh sách id để tránh nháy trống lúc đầu
  const visible = library.loaded ? articles.filter((a) => library.isSaved(a.id)) : articles

  return (
    <div className="space-y-6">
      {/* tieu de trang bai da luu */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Bài viết đã đánh dấu</h2>
        <p className="text-xs text-stone-500 mt-1">
          Các bài viết bạn đã lưu để đọc lại sau
        </p>
      </div>

      {actionError && <p className="text-xs text-red-700">{actionError}</p>}

      {loadError ? (
        <EmptyState
          title="Không tải được bài đã lưu"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => loadPage(0)}
        />
      ) : loading && articles.length === 0 ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-28 bg-stone-200 rounded-lg" />
          <div className="h-28 bg-stone-200 rounded-lg" />
        </div>
      ) : visible.length === 0 && !hasMore ? (
        <EmptyState
          icon={<Bookmark className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Chưa có bài viết nào được đánh dấu"
          description="Bấm vào biểu tượng bookmark trên bất kỳ bài báo nào để lưu vào danh sách này."
        />
      ) : (
        <div className="space-y-3">
          {/* vong lap ve the bai da luu, bam bookmark lan nua thi DROP khoi list */}
          {visible.map((art) => (
            <ArticleCard
              key={art.id}
              article={art}
              variant="horizontal"
              isBookmarked={true}
              onToggleBookmark={handleToggle}
            />
          ))}
          {hasMore && (
            <div className="pt-2 text-center">
              {/* nut tai them bai da luu */}
              <Button variant="outline" size="sm" isLoading={loading} onClick={() => loadPage(page + 1)}>
                Xem thêm
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
