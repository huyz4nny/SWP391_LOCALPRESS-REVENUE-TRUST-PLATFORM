import React, { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Wallet, XCircle } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { complaintApi } from '../api/payment'
import type { PaymentComplaint } from '../types'

/**
 * ==============================================================================
 * HÀNG CHỜ KHIẾU NẠI THANH TOÁN /backoffice/finance/complaints (SV4 - UC051, phía kế toán)
 * ==============================================================================
 * Thay cho "duyệt chuyển khoản thủ công". Kế toán mở sao kê ngân hàng, tìm theo mã giao dịch & số tiền:
 *  - Thấy tiền + có đơn  -> "Ghi nhận vào đơn": chạy đúng luồng webhook (đủ/thiếu/thừa/muộn, chống trùng).
 *  - Thấy tiền, không rõ đơn / đơn đã trả -> "Cộng vào ví" khách.
 *  - Không thấy tiền     -> "Từ chối" (bắt buộc lý do, khách nhìn thấy).
 */

const RESOLUTION_LABELS: Record<string, string> = {
  SUCCESS: 'Đã ghi nhận đơn thành công',
  EXCESS: 'Đơn thành công, phần dư vào ví',
  UNDERPAID_CREDITED_TO_WALLET: 'Chuyển thiếu, tiền vào ví',
  LATE_PAYMENT_CREDITED_TO_WALLET: 'Đơn hết hiệu lực, tiền vào ví',
  CREDITED_WALLET: 'Đã cộng vào ví',
}

export function ComplaintStatusBadge({ status }: { status: PaymentComplaint['status'] }) {
  if (status === 'OPEN')
    return (
      <Badge variant="warning">
        <Clock className="w-3 h-3 mr-1" /> Chờ đối soát
      </Badge>
    )
  if (status === 'RESOLVED')
    return (
      <Badge variant="success">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Đã ghi nhận
      </Badge>
    )
  return (
    <Badge variant="destructive">
      <XCircle className="w-3 h-3 mr-1" /> Từ chối
    </Badge>
  )
}

export function ComplaintQueuePage() {
  const [filter, setFilter] = useState<PaymentComplaint['status'] | undefined>('OPEN')
  const [items, setItems] = useState<PaymentComplaint[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [confirm, setConfirm] = useState<{ c: PaymentComplaint; target: 'ORDER' | 'WALLET' } | null>(null)

  const load = () => complaintApi.listForAccountant(filter).then(setItems).catch((e) => setError(e?.message || 'Không tải được hàng chờ'))

  useEffect(() => {
    load()
  }, [filter])

  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id)
    setError('')
    try {
      await fn()
      await load()
    } catch (e: any) {
      setError(e?.message || 'Xử lý thất bại')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Khiếu nại thanh toán chưa ghi nhận (UC051)</h1>
        <p className="text-xs text-slate-500 mt-1">
          Đối chiếu sao kê ngân hàng theo mã giao dịch và số tiền trước khi ghi nhận. Ghi nhận vào đơn đi qua đúng luồng
          xử lý webhook, nên webhook thật về sau sẽ không cộng trùng.
        </p>
      </div>

      <div className="flex gap-2">
        {([['OPEN', 'Chờ đối soát'], ['RESOLVED', 'Đã ghi nhận'], ['REJECTED', 'Từ chối'], [undefined, 'Tất cả']] as const).map(
          ([value, label]) => (
            <Button key={label} size="sm" variant={filter === value ? 'primary' : 'outline'} onClick={() => setFilter(value)}>
              {label}
            </Button>
          )
        )}
      </div>

      {error && <div className="text-sm text-crimson bg-red-50 border border-red-200 rounded p-3">{error}</div>}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{items.length} khiếu nại</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="Không có khiếu nại nào" description="Mọi khoản tiền đã được webhook SePay ghi nhận tự động." />
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2">#</th>
                  <th className="py-2">Khách / Đơn</th>
                  <th className="py-2">Mã GD ngân hàng</th>
                  <th className="py-2 text-right">Số tiền</th>
                  <th className="py-2">Chuyển lúc</th>
                  <th className="py-2">Trạng thái</th>
                  <th className="py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.complaintId} className="border-b border-slate-100 align-top">
                    <td className="py-2 font-semibold">{c.complaintId}</td>
                    <td className="py-2">
                      <div>User #{c.userId}</div>
                      <div className="font-mono text-slate-500">{c.orderCode || 'Không có mã đơn'}</div>
                      {c.note && <div className="text-slate-500 italic">{c.note}</div>}
                    </td>
                    <td className="py-2 font-mono font-bold">{c.bankReference}</td>
                    <td className="py-2 text-right font-bold">{formatCurrency(c.amount)}</td>
                    <td className="py-2">{formatDateTime(c.transferredAt)}</td>
                    <td className="py-2 space-y-1">
                      <ComplaintStatusBadge status={c.status} />
                      {c.resolution && <div className="text-slate-500">{RESOLUTION_LABELS[c.resolution] ?? c.resolution}</div>}
                      {c.status === 'REJECTED' && c.resolutionNote && <div className="text-crimson">{c.resolutionNote}</div>}
                    </td>
                    <td className="py-2 text-right">
                      {c.status === 'OPEN' &&
                        (rejecting === c.complaintId ? (
                          <div className="space-y-1.5 min-w-[220px]">
                            <Input
                              placeholder="Lý do (khách sẽ thấy)"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="h-8 text-xs"
                            />
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setRejecting(null)}>
                                Hủy
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={!reason.trim() || busyId === c.complaintId}
                                onClick={() =>
                                  run(c.complaintId, () => complaintApi.reject(c.complaintId, reason)).then(() => setRejecting(null))
                                }
                              >
                                Xác nhận từ chối
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            {c.orderCode && (
                              <Button size="sm" disabled={busyId === c.complaintId} onClick={() => setConfirm({ c, target: 'ORDER' })}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ghi nhận vào đơn
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === c.complaintId}
                              onClick={() => setConfirm({ c, target: 'WALLET' })}
                            >
                              <Wallet className="w-3.5 h-3.5 mr-1" /> Cộng vào ví
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-crimson"
                              onClick={() => {
                                setReason('')
                                setRejecting(c.complaintId)
                              }}
                            >
                              Từ chối
                            </Button>
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {confirm && (
        <ConfirmDialog
          open
          title={confirm.target === 'ORDER' ? 'Ghi nhận khoản tiền vào đơn?' : 'Cộng khoản tiền vào ví khách?'}
          message={`Xác nhận đã thấy ${formatCurrency(confirm.c.amount)} với mã giao dịch ${confirm.c.bankReference} trên sao kê ngân hàng.`}
          confirmText="Đã khớp sao kê, ghi nhận"
          onConfirm={() => {
            const { c, target } = confirm
            setConfirm(null)
            run(c.complaintId, () => complaintApi.resolve(c.complaintId, target))
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
