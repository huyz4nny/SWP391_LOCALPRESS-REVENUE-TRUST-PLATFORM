// Tác dụng: trang `/account/notifications` — thông báo bài mới (UC040) và kết quả hoàn tiền (UC046).
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, Newspaper, XCircle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { useReaderNotifications } from '../hooks/useReaderNotifications'
import type { ReaderNotification } from '../api'

function NotificationIcon({ type }: { type: ReaderNotification['type'] }) {
  if (type === 'REFUND_COMPLETED') return <CheckCircle2 className="h-5 w-5 text-emerald-600" />
  if (type === 'REFUND_REJECTED') return <XCircle className="h-5 w-5 text-crimson" />
  return <Newspaper className="h-5 w-5 text-primary-900" />
}

// trang /account/notifications: mới nhất lên đầu, chấm xanh là chưa đọc, bấm để xem và đánh dấu đã đọc
export function ReaderNotificationsPage() {
  const notifications = useReaderNotifications()
  const { reload } = notifications
  const [error, setError] = useState('')

  // mở trang thì tải lại để thấy ngay kết quả hoàn tiền vừa được duyệt
  useEffect(() => {
    reload()
  }, [reload])

  const open = async (item: ReaderNotification) => {
    if (item.read) return
    try {
      await notifications.markRead(item.id)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Không cập nhật được thông báo')
    }
  }

  const markAll = async () => {
    setError('')
    try {
      await notifications.markAllRead()
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Không cập nhật được thông báo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Thông báo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bài mới trong chuyên mục bạn theo dõi và kết quả hoàn tiền.
          </p>
        </div>
        {notifications.unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-crimson">{error}</p>}

      {!notifications.loaded ? (
        <p className="text-sm text-slate-500">Đang tải thông báo...</p>
      ) : notifications.error ? (
        <div className="space-y-3">
          <p className="text-sm text-crimson">{notifications.error}</p>
          <Button variant="outline" size="sm" onClick={notifications.reload}>Tải lại</Button>
        </div>
      ) : notifications.items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="Chưa có thông báo"
          description="Theo dõi chuyên mục để nhận tin khi có bài mới."
        />
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {notifications.items.map((item) => {
            const body = (
              <div className="flex gap-3 p-4">
                <NotificationIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn('text-sm text-slate-900', !item.read && 'font-semibold')}>{item.title}</p>
                    {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-900" aria-label="Chưa đọc" />}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.content}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(item.createdAt)}</p>
                </div>
              </div>
            )
            return (
              <li key={item.id} className={cn(!item.read && 'bg-slate-50')}>
                {item.linkUrl ? (
                  <Link to={item.linkUrl} onClick={() => void open(item)} className="block hover:bg-slate-100">
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => void open(item)} className="block w-full text-left hover:bg-slate-100">
                    {body}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
