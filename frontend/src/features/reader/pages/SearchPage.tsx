import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Article } from '../types'
import { readerApi } from '../api'
import { ArticleCard } from '../components/ArticleCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(query)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (query) {
      handleSearch(query)
    }
  }, [query])

  const handleSearch = async (term: string) => {
    try {
      setLoading(true)
      const data = await readerApi.getArticles({ search: term })
      setArticles(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
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
            Kết quả tìm kiếm cho: <strong>"{query}"</strong> ({articles.length} bài viết)
          </p>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-stone-200 rounded-lg" />
            <div className="h-32 bg-stone-200 rounded-lg" />
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-sm text-stone-500">
            Không tìm thấy bài viết nào phù hợp với từ khóa này. Vui lòng thử từ khóa khác.
          </div>
        ) : (
          articles.map((art) => (
            <ArticleCard key={art.id} article={art} variant="horizontal" />
          ))
        )}
      </div>
    </div>
  )
}
