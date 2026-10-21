import React, { useEffect, useState } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { complaintApi } from '../api/payment'
import type { PaymentComplaint } from '../types'
import { PageHeader, Panel, Segmented, Notice, tableCls } from '../components/LedgerUI'

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
  if (status === 'OPEN') return <Badge variant="warning">Chờ đối soát</Badge>
  if (status === 'RESOLVED') return <Badge variant="success">Đã ghi nhận</Badge>
  return <Badge variant="destructive">Từ chối</Badge>
}

const FILTERS: { value: PaymentComplaint['status'] | undefined; label: string }[] = [
  { value: 'OPEN', label: 'Chờ đối soát' },
  { value: 'RESOLVED', label: 'Đã ghi nhận' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: undefined, label: 'Tất cả' },
]

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

  const total = items.reduce((acc, c) => acc + c.amount, 0)

  return (
    <div>
      <PageHeader
        title="Khiếu nại thanh toán"
        sub="Khách báo đã chuyển tiền nhưng chưa được ghi nhận. Tìm đúng mã giao dịch và số tiền trên sao kê trước khi ghi nhận; ghi nhận vào đơn chạy lại luồng webhook nên không cộng trùng."
      />

      <div className="mb-3">
        <Segmented label="Lọc khiếu nại" value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}

      <Panel
        title={<span className="num">{items.length} khiếu nại</span>}
        aside={items.length > 0 && <span>Tổng <span className="font-semibold text-slate-900 num">{formatCurrency(total)}</span></span>}
        bodyClassName="px-0 pb-1"
      >
        {items.length === 0 ? (
          <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">
            {filter === 'OPEN' ? 'Không có khiếu nại nào chờ đối soát. Mọi khoản tiền đã được webhook SePay ghi nhận.' : 'Không có khiếu nại nào.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Khiếu nại</th>
                  <th className={tableCls.th}>Mã GD ngân hàng</th>
                  <th className={tableCls.th}>Chuyển lúc</th>
                  <th className={tableCls.th}>Trạng thái</th>
                  <th className={tableCls.thNum}>Số tiền</th>
                  <th className={tableCls.th}><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.complaintId} className={`${tableCls.tr} align-top`}>
                    <td className={`${tableCls.td} align-top`}>
                      <div className="text-slate-900">#{c.complaintId} · khách #{c.userId}</div>
                      <div className="font-mono text-xs text-slate-500">{c.orderCode || 'Không có mã đơn'}</div>
                      {c.note && <div className="mt-0.5 max-w-[260px] text-xs text-slate-500">{c.note}</div>}
                    </td>
                    <td className={`${tableCls.td} align-top`}><span className={tableCls.code}>{c.bankReference}</span></td>
                    <td className={`${tableCls.td} whitespace-nowrap align-top num`}>{formatDateTime(c.transferredAt)}</td>
                    <td className={`${tableCls.td} align-top`}>
                      <ComplaintStatusBadge status={c.status} />
                      {c.resolution && <div className="mt-1 text-xs text-slate-500">{RESOLUTION_LABELS[c.resolution] ?? c.resolution}</div>}
                      {c.status === 'REJECTED' && c.resolutionNote && <div className="mt-1 max-w-[220px] text-xs text-[#831c1e]">{c.resolutionNote}</div>}
                    </td>
                    <td className={`${tableCls.tdNum} align-top font-semibold`}>{formatCurrency(c.amount)}</td>
                    <td className={`${tableCls.td} align-top text-right`}>
                      {c.status === 'OPEN' &&
                        (rejecting === c.complaintId ? (
                          <div className="ml-auto w-60 space-y-1.5">
                            <Input
                              placeholder="Lý do từ chối, khách sẽ thấy"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              className="h-8 text-[13px]"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
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
                                Từ chối
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5">
                            {c.orderCode && (
                              <Button size="sm" disabled={busyId === c.complaintId} onClick={() => setConfirm({ c, target: 'ORDER' })}>
                                Ghi nhận vào đơn
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === c.complaintId}
                              onClick={() => setConfirm({ c, target: 'WALLET' })}
                            >
                              Cộng vào ví
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-negative hover:text-negative"
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
          </div>
        )}
      </Panel>

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
