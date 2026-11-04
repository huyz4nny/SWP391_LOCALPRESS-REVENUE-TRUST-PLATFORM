import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { advertisingApi } from '../api'
import type { BusinessNotification, NotificationPage } from '../types'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateTime } from '@/lib/format'

export function AdvertiserNotificationsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [data, setData] = useState<NotificationPage | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setData(null)
    setError('')
    advertisingApi
      .getNotifications(page)
      .then((r) => {
        if (active) setData(r)
      })
      .catch((e: Error) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [page, revision])
  const read = async (n?: BusinessNotification) => {
    setBusy(true)
    setError('')
    try {
      if (n) {
        await advertisingApi.markNotificationRead(n.id)
        navigate(n.link)
      } else {
        await advertisingApi.markAllNotificationsRead()
        setRevision((r) => r + 1)
      }
      window.dispatchEvent(new Event('advertiser-notifications-changed'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không cập nhật được thông báo')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="ad-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Thông báo doanh nghiệp</h1>
          <p className="mt-1 text-sm text-slate-600">Báo giá, banner và các mốc thanh toán, vận hành chiến dịch.</p>
        </div>
        <Button size="sm" variant="outline" disabled={busy || !data?.items.length} onClick={() => read()}>
          Đánh dấu đã đọc tất cả
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Đang tải thông báo…</p>}
      {data?.items.length === 0 && <EmptyState title="Chưa có thông báo doanh nghiệp" />}
      {data && (
        <>
          <ul className="divide-y divide-slate-200">
            {data.items.map((n) => (
              <li key={n.id}>
                <button
                  disabled={busy}
                  onClick={() => read(n)}
                  className="w-full py-4 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary-900"
                >
                  <span
                    className={`block text-sm ${n.read ? 'font-normal text-slate-700' : 'font-semibold text-slate-900'}`}
                  >
                    {!n.read && <span className="sr-only">Chưa đọc: </span>}
                    {n.title}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">{n.content}</span>
                  <time className="mt-1 block text-xs text-slate-500">{formatDateTime(n.createdAt)}</time>
                </button>
              </li>
            ))}
          </ul>
          {data.total > data.size && (
            <div className="flex items-center justify-end gap-3 text-sm">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Trước
              </Button>
              <span>
                Trang {page + 1} / {Math.ceil(data.total / data.size)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={(page + 1) * data.size >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
