import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { Article } from '../types'
import { ArticleCard } from '../components/ArticleCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { BookOpen } from 'lucide-react'

export function ReaderLibraryPage() {
  const currentUser = mockStore.getCurrentUser()
  const entitlement = mockStore.getEntitlements(currentUser.id)
  const allArticles = mockStore.getState().articles

  const purchasedArticles = allArticles.filter((a) =>
    entitlement.purchasedArticleIds.includes(a.id)
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Tủ sách & Phóng sự đã mua</h2>
        <p className="text-xs text-stone-500 mt-1">
          Danh sách các bài viết điều tra bạn đã mua lẻ với quyền sở hữu và đọc toàn văn vĩnh viễn
        </p>
      </div>

      {purchasedArticles.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Tủ sách của bạn đang trống"
          description="Bạn chưa mua lẻ bài phóng sự nào. Hãy khám phá các bài điều tra chuyên sâu của tòa soạn."
          actionLabel="Khám phá bài viết Premium"
          onAction={() => (window.location.href = '/')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {purchasedArticles.map((art) => (
            <ArticleCard key={art.id} article={art} variant="standard" />
          ))}
        </div>
      )}
    </div>
  )
}
