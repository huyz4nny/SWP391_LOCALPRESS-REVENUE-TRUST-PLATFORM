import React from 'react'
import { Link } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { formatRelativeTime } from '@/lib/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { History, ArrowRight } from 'lucide-react'

export function ReaderHistoryPage() {
  const currentUser = mockStore.getCurrentUser()
  const entitlement = mockStore.getEntitlements(currentUser.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Lịch sử đọc tin</h2>
        <p className="text-xs text-stone-500 mt-1">
          Theo dõi các bài viết bạn đã xem gần đây trên LocalPress
        </p>
      </div>

      {entitlement.readingHistory.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Chưa có lịch sử đọc tin"
          description="Lịch sử đọc sẽ tự động ghi nhận khi bạn truy cập các bài báo."
        />
      ) : (
        <div className="space-y-2">
          {entitlement.readingHistory.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-stone-200 bg-white hover:border-stone-300 flex items-center justify-between transition-colors"
            >
              <div>
                <Link
                  to={`/articles/${item.slug}`}
                  className="font-serif text-sm font-bold text-stone-900 hover:text-primary-900 line-clamp-1"
                >
                  {item.articleTitle}
                </Link>
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  Đã đọc {formatRelativeTime(item.readAt)}
                </span>
              </div>

              <Link
                to={`/articles/${item.slug}`}
                className="text-xs font-semibold text-primary-900 hover:underline flex items-center shrink-0 ml-4"
              >
                Đọc lại <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
