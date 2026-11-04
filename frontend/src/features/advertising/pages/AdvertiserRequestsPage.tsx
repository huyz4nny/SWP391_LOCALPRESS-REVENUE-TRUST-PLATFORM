import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { advertisingApi } from '../api'
import type { CancellationRequest } from '../types'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/format'

function cancellationLabel(r: CancellationRequest) {
  if (r.refundStatus === 'REFUNDED')
    return `Đã hủy – đã hoàn ${formatCurrency(r.refundedAmount)}${r.refundedAt ? ` ngày ${formatDateTime(r.refundedAt)}` : ''}`
  if (r.refundDecision === 'REJECTED') return `Đã hủy – hoàn tiền bị từ chối: ${r.reviewNotes || 'Liên hệ kế toán'}`
  if (r.refundDecision === 'NOT_APPLICABLE') return 'Đã hủy – không phát sinh hoàn tiền'
  return r.refundDecision === 'APPROVED' ? 'Đã hủy – khoản hoàn đã duyệt, đang xử lý' : 'Đã hủy – chờ duyệt hoàn tiền'
}
export function AdvertiserRequestsPage() {
  const [rows, setRows] = useState<CancellationRequest[] | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setRows(null)
    setError('')
    advertisingApi
      .getMyRequests()
      .then((r) => {
        if (active) setRows(r)
      })
      .catch((e: Error) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [revision])
  return (
    <div className="ad-page">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>Yêu cầu hủy và hoàn tiền</h1>
          <p className="mt-1 text-sm text-slate-600">
            Chiến dịch dừng ngay khi hủy. Khoản hoàn được kế toán xét riêng.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setRevision((r) => r + 1)}>
          Tải lại
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!rows && !error && <p role="status">Đang tải yêu cầu…</p>}
      {rows?.length === 0 && (
        <EmptyState
          title="Chưa có yêu cầu hủy chiến dịch"
          description="Mở chi tiết booking để xem chính sách và khoản hoàn dự kiến trước khi hủy."
        />
      )}
      {!!rows?.length && (
        <div className="ad-table-frame">
          <table className="ad-table">
            <thead>
              <tr>
                <th>Chiến dịch / lý do</th>
                <th>Hủy / hoàn tiền</th>
                <th className="ad-number">Đề xuất hoàn</th>
                <th className="ad-number">Đã hoàn</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/advertiser/bookings/${r.campaignId}`}>{r.campaignName}</Link>
                    <p className="mt-1 text-xs text-slate-600">{r.reason}</p>
                    <p className="mt-1 text-xs text-slate-600">Hủy lúc {formatDateTime(r.effectiveAt)}</p>
                  </td>
                  <td>
                    <StatusBadge type="booking" status="CANCELLED" />
                    <p className="mt-2 max-w-72 text-sm">{cancellationLabel(r)}</p>
                  </td>
                  <td className="ad-number">{formatCurrency(r.proposedAmount)}</td>
                  <td className="ad-number">{formatCurrency(r.refundedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
