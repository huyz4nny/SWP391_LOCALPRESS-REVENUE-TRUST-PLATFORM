import React, { useState, useEffect } from 'react'
import { mockStore } from '@/mocks/store'
import { readerApi } from '../api'
import { Article } from '../types'
import { ArticleCard } from '../components/ArticleCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Bookmark } from 'lucide-react'

export function ReaderBookmarksPage() {
  const currentUser = mockStore.getCurrentUser()
  const [entitlements, setEntitlements] = useState(mockStore.getEntitlements(currentUser.id))
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    loadBookmarkedArticles()
  }, [entitlements.bookmarkedArticleIds])

  const loadBookmarkedArticles = async () => {
    const all = mockStore.getState().articles
    const bookmarked = all.filter((a) => entitlements.bookmarkedArticleIds.includes(a.id))
    setArticles(bookmarked)
  }

  const handleToggle = async (articleId: string) => {
    await readerApi.toggleBookmark(articleId)
    setEntitlements(mockStore.getEntitlements(currentUser.id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Bài viết đã đánh dấu</h2>
        <p className="text-xs text-stone-500 mt-1">
          Các bài viết bạn đã lưu để đọc lại sau
        </p>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Chưa có bài viết nào được đánh dấu"
          description="Bấm vào biểu tượng bookmark trên bất kỳ bài báo nào để lưu vào danh sách này."
        />
      ) : (
        <div className="space-y-3">
          {articles.map((art) => (
            <ArticleCard
              key={art.id}
              article={art}
              variant="horizontal"
              isBookmarked={true}
              onToggleBookmark={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}
