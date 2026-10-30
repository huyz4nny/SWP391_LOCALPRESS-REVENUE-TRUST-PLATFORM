import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { readerApi } from '../api'
import { Article } from '../types'
import { ArticleCard } from '../components/ArticleCard'
import { useReaderLibrary } from '../hooks/useReaderLibrary'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

const PAGE_SIZE = 20

// UC037 tủ sách bài đã mua lẻ ở màn hình II.3.6
// luồng đi là GET /reader/purchased-articles -> chỉ bài ACTIVE và đang xuất bản
export function ReaderLibraryPage() {
  const navigate = useNavigate()
  const library = useReaderLibrary()
  const [articles, setArticles] = useState<Article[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadPage(0)
  }, [])

  const loadPage = async (nextPage: number) => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await readerApi.getPurchasedArticlesPage(nextPage, PAGE_SIZE)
      // trang 0 thi thay ds, bam Xem them thi noi vao cuoi
      setArticles((prev) => (nextPage === 0 ? res.items : [...prev, ...res.items]))
      setPage(res.page)
      setHasMore(res.hasMore)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được tủ sách')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Tủ sách & Phóng sự đã mua</h2>
        <p className="text-xs text-stone-500 mt-1">
          Bài mua lẻ còn hiệu lực. Hoàn toàn bộ thì bài biến khỏi tủ sách.
        </p>
      </div>

      {loadError ? (
        <EmptyState
          title="Không tải được tủ sách"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => loadPage(0)}
        />
      ) : loading && articles.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-pulse">
          <div className="h-40 rounded-lg bg-stone-200" />
          <div className="h-40 rounded-lg bg-stone-200" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Tủ sách của bạn đang trống"
          description="Bạn chưa mua lẻ bài phóng sự nào đang được phát hành."
          actionLabel="Khám phá bài viết Premium"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* vong lap ve the tung bai da mua le */}
            {articles.map((art) => (
              <ArticleCard
                key={art.id}
                article={art}
                variant="standard"
                isBookmarked={library.isSaved(art.id)}
                onToggleBookmark={(id) => { void library.toggleSaved(id) }}
              />
            ))}
          </div>
          {hasMore && (
            <div className="text-center">
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
