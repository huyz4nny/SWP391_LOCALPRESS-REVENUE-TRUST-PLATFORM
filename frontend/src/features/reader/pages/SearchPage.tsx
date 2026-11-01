// Tác dụng: trang `/search` (UC030) — ô từ khóa, list kết quả bài PUBLISHED, Guest được tìm.
import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Article } from '../types'
import { readerApi } from '../api'
import { ArticleCard } from '../components/ArticleCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

// trang /search: o nhap tu khoa + list ket qua + nut Xem them
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(query)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (query) {
      handleSearch(query)
    }
  }, [query])

  const handleSearch = async (term: string) => {
    try {
      setLoading(true)
      setLoadError(null)
      const result = await readerApi.getArticlesPage({ search: term, page: 0 })
      setArticles(result.items)
      setPage(result.page)
      setHasMore(result.hasMore)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tìm kiếm được bài viết. Vui lòng thử lại.')
      setArticles([])
      setHasMore(false)
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true)
      const result = await readerApi.getArticlesPage({ search: query, page: page + 1 })
      setArticles((prev) => [...prev, ...result.items])
      setPage(result.page)
      setHasMore(result.hasMore)
      setTotal(result.total)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải thêm được kết quả. Vui lòng thử lại.')
    } finally {
      setLoadingMore(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() })
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
        <h1 className="font-serif text-2xl font-bold text-stone-900 mb-4">
          Tìm kiếm tin tức & bài viết
        </h1>

        {/* o nhap tu khoa + nut Tim kiem */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nhập từ khóa cần tra cứu..."
            className="flex-1"
          />
          <Button type="submit">
            <Search className="w-4 h-4 mr-1" />
            Tìm kiếm
          </Button>
        </form>

        {query && (
          <p className="mt-3 text-xs text-stone-500">
            Kết quả tìm kiếm cho: <strong>"{query}"</strong> ({total} bài viết)
          </p>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-stone-200 rounded-lg" />
            <div className="h-32 bg-stone-200 rounded-lg" />
          </div>
        ) : loadError ? (
          <EmptyState
            title="Không tải được kết quả tìm kiếm"
            description={loadError}
            actionLabel="Thử lại"
            onAction={() => handleSearch(query)}
          />
        ) : articles.length === 0 ? (
          <EmptyState
            title="Không tìm thấy bài viết"
            description="Không có bài viết nào phù hợp với từ khóa này. Vui lòng thử từ khóa khác."
          />
        ) : (
          <>
            {/* vong lap ve the ket qua tim kiem */}
            {articles.map((art) => (
              <ArticleCard key={art.id} article={art} variant="horizontal" />
            ))}
            {hasMore && (
              <div className="text-center pt-2">
                {/* nut tai them trang sau */}
                <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? 'Đang tải...' : 'Xem thêm'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
