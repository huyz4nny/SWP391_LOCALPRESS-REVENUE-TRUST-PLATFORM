import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { readerApi, ReadingHistoryItem } from '../api'
import { useReaderLibrary } from '../hooks/useReaderLibrary'
import { formatRelativeTime } from '@/lib/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { History, ArrowRight } from 'lucide-react'

const PAGE_SIZE = 20

// UC039 trang lịch sử đọc tin ở màn hình II.3.6
// luồng đi là GET /reader/reading-history -> bấm Đọc lại sang bài -> bấm Xóa thì DELETE rồi ẩn dòng
export function ReaderHistoryPage() {
  const library = useReaderLibrary()
  const [items, setItems] = useState<ReadingHistoryItem[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    loadPage(0)
  }, [])

  const loadPage = async (nextPage: number) => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await readerApi.getReadingHistoryPage(nextPage, PAGE_SIZE)
      // trang dau thay list, Xem them thi append
      setItems((prev) => (nextPage === 0 ? res.items : [...prev, ...res.items]))
      setPage(res.page)
      setHasMore(res.hasMore)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được lịch sử đọc')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (articleId: string) => {
    if (busyId) return
    setBusyId(articleId)
    try {
      await readerApi.removeReadingHistory(articleId)
      // xoa xong an dung dong do, khong reload ca trang
      setItems((prev) => prev.filter((item) => item.articleId !== articleId))
      library.refresh()
      setActionError(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không xóa được dòng lịch sử')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Lịch sử đọc tin</h2>
        <p className="text-xs text-stone-500 mt-1">
          Theo dõi các bài viết bạn đã xem gần đây trên LocalPress
        </p>
      </div>

      {actionError && <p className="text-xs text-red-700">{actionError}</p>}

      {loadError ? (
        <EmptyState
          title="Không tải được lịch sử đọc"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => loadPage(0)}
        />
      ) : loading && items.length === 0 ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-16 bg-stone-200 rounded-lg" />
          <div className="h-16 bg-stone-200 rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Chưa có lịch sử đọc tin"
          description="Lịch sử đọc sẽ tự động ghi nhận khi bạn truy cập các bài báo."
        />
      ) : (
        <div className="space-y-2">
          {/* vong lap for lay tung dong de display ls doc tin */}
          {items.map((item) => (
            <div
              key={item.articleId}
              className="p-3.5 rounded-lg border border-stone-200 bg-white hover:border-stone-300 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="min-w-0">
                <Link
                  to={`/articles/${item.slug}`}
                  className="font-serif text-sm font-bold text-stone-900 hover:text-primary-900 line-clamp-1"
                >
                  {item.title}
                </Link>
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  {item.lastReadAt ? `Đã đọc ${formatRelativeTime(item.lastReadAt)}` : 'Đã đọc gần đây'}
                  {item.categoryName ? ` · ${item.categoryName}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/articles/${item.slug}`}
                  className="text-xs font-semibold text-primary-900 hover:underline flex items-center"
                >
                  Đọc lại <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={busyId === item.articleId}
                  onClick={() => handleRemove(item.articleId)}
                >
                  Xóa
                </Button>
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="pt-2 text-center">
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
