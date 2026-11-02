// Tác dụng: trang `/account/support` (UC046) — list khiếu nại của tôi, nút sang form Huy `/wallet/complaints`.
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { complaintApi } from '@/features/finance/api/payment'
import type { PaymentComplaint } from '@/features/finance/types'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HelpCircle } from 'lucide-react'

function statusLabel(status: PaymentComplaint['status']) {
  if (status === 'OPEN') return <Badge variant="warning">Chờ đối soát</Badge>
  if (status === 'RESOLVED') return <Badge variant="success">Đã ghi nhận</Badge>
  return <Badge variant="destructive">Từ chối</Badge>
}

// UC046 danh sách khiếu nại thanh toán của độc giả ở màn hình II.3.10
// form gửi khiếu nại nằm ở trang /wallet/complaints của SV4, trang này chỉ liệt kê và dẫn sang đó
export function ReaderSupportPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PaymentComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      setItems(await complaintApi.listMine())
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được danh sách khiếu nại')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-6">
      {/* tieu de ho tro thanh toan */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Hỗ trợ thanh toán</h2>
        <p className="text-xs text-stone-500 mt-1">
          Khi đã chuyển tiền mà đơn hoặc ví chưa được ghi nhận, gửi khiếu nại để kế toán đối chiếu sao kê. Không chuyển tiền lại.
        </p>
      </div>

      {/* nut Gui khieu nai (sang trang Huy) + nut Xem lich su giao dich */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => navigate('/wallet/complaints')}>
          Gửi khiếu nại thanh toán
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/account/orders')}>
          Xem lịch sử giao dịch
        </Button>
      </div>

      {loadError ? (
        <EmptyState
          title="Không tải được khiếu nại"
          description={loadError}
          actionLabel="Thử lại"
          onAction={() => load()}
        />
      ) : loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-20 bg-stone-200 rounded-lg" />
          <div className="h-20 bg-stone-200 rounded-lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Chưa có khiếu nại nào"
          description="Nếu đã chuyển tiền mà hệ thống chưa ghi nhận sau 15 phút, bấm Gửi khiếu nại thanh toán."
        />
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {/* vong lap ve tung khieu nai: so tien + badge trang thai */}
          {items.map((c) => (
            <li key={c.complaintId} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold num">{formatCurrency(c.amount)}</span>
                {statusLabel(c.status)}
              </div>
              <div className="text-xs text-slate-500">
                <span className="font-mono">{c.bankReference}</span>
                {c.orderCode ? <> · đơn <span className="font-mono">{c.orderCode}</span></> : null}
              </div>
              <div className="text-xs text-slate-500 num">Chuyển lúc {formatDateTime(c.transferredAt)}</div>
              {c.resolutionNote && (
                <p className={`text-xs ${c.status === 'REJECTED' ? 'text-red-800' : 'text-slate-700'}`}>
                  Kế toán: {c.resolutionNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
