import React, { useEffect, useState } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { complaintApi } from '../api/payment'
import type { ComplaintTarget, PaymentComplaint } from '../types'
import { PageHeader, Panel, Segmented, Notice, tableCls } from '../components/LedgerUI'

/**
 * ==============================================================================
 * HÀNG CHỜ KHIẾU NẠI THANH TOÁN /backoffice/finance/complaints (SV4 - UC051, phía kế toán)
 * ==============================================================================
 * Thay cho "duyệt chuyển khoản thủ công". Kế toán mở sao kê ngân hàng, tìm theo mã giao dịch & số tiền:
 *  - Thấy tiền + có đơn đúng số tiền -> "Ghi nhận vào đơn": chạy đúng luồng webhook (chống trùng).
 *  - Khách chuyển THỪA cho đơn còn chờ -> "Ghi đơn + trả phần thừa": đơn ghi đúng số tiền đơn,
 *    kế toán chuyển trả phần thừa rồi nhập mã GD trả. Không phải hoàn tiền (không 4 mắt, không thu hồi quyền).
 *  - Thấy tiền nhưng không gán được vào đơn (sai số tiền, đơn hết hạn / đã trả, không có mã đơn)
 *    -> kế toán chuyển trả lại tài khoản khách rồi bấm "Đã chuyển trả khách" kèm mã GD chuyển trả.
 *    LocalPress không giữ tiền khách, không có ví.
 *  - Không thấy tiền     -> "Từ chối" (bắt buộc lý do, khách nhìn thấy).
 */

const RESOLUTION_LABELS: Record<string, string> = {
  SUCCESS: 'Đã ghi nhận đơn thành công',
  EXCESS_RETURNED: 'Đã ghi đơn, trả lại phần thừa',
  RETURNED_TO_CUSTOMER: 'Đã chuyển trả lại khách',
}

/** Chênh lệch số khách chuyển so với số tiền đơn: > 0 thừa, < 0 thiếu, null nếu không biết đơn. */
export function complaintDiff(c: PaymentComplaint): number | null {
  return c.orderAmount == null ? null : c.amount - c.orderAmount
}

export function ComplaintStatusBadge({ status }: { status: PaymentComplaint['status'] }) {
  if (status === 'OPEN') return <Badge variant="warning">Chờ đối soát</Badge>
  if (status === 'RESOLVED') return <Badge variant="success">Đã xử lý</Badge>
  return <Badge variant="destructive">Từ chối</Badge>
}

const FILTERS: { value: PaymentComplaint['status'] | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'OPEN', label: 'Chờ đối soát' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'REJECTED', label: 'Từ chối' },
]

export function ComplaintQueuePage() {
  const [filter, setFilter] = useState<PaymentComplaint['status'] | undefined>('OPEN')
  const [items, setItems] = useState<PaymentComplaint[]>([])
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [returning, setReturning] = useState<{ id: string; target: Exclude<ComplaintTarget, 'ORDER'> } | null>(null)
  const [payoutRef, setPayoutRef] = useState('')
  const [confirm, setConfirm] = useState<PaymentComplaint | null>(null)

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
        sub="Khách báo đã chuyển tiền nhưng chưa được ghi nhận. Tìm đúng mã giao dịch và số tiền trên sao kê. Đúng đơn, đúng số tiền thì ghi nhận vào đơn (chạy lại luồng webhook, không ghi trùng); chuyển thừa cho đơn còn chờ thì ghi đơn và trả lại phần thừa; không gán được vào đơn thì chuyển trả lại khách, LocalPress không giữ tiền."
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
                      {(c.resolution === 'RETURNED_TO_CUSTOMER' || c.resolution === 'EXCESS_RETURNED') && c.resolutionNote && <div className="mt-1 max-w-[220px] text-xs text-slate-500">{c.resolutionNote}</div>}
                    </td>
                    <td className={`${tableCls.tdNum} align-top`}>
                      <div className="font-semibold">{formatCurrency(c.amount)}</div>
                      {c.orderAmount != null && (
                        <div className="text-xs text-slate-500">Đơn cần {formatCurrency(c.orderAmount)}</div>
                      )}
                      {(() => {
                        const diff = complaintDiff(c)
                        if (!diff) return null
                        return (
                          <div className={`text-xs font-medium ${diff > 0 ? 'text-amber-700' : 'text-[#831c1e]'}`}>
                            {diff > 0 ? 'Thừa' : 'Thiếu'} {formatCurrency(Math.abs(diff))}
                          </div>
                        )
                      })()}
                      {c.returnedAmount != null && (
                        <div className="text-xs text-slate-500">Đã trả lại {formatCurrency(c.returnedAmount)}</div>
                      )}
                    </td>
                    <td className={`${tableCls.td} align-top text-right`}>
                      {c.status === 'OPEN' &&
                        (returning?.id === c.complaintId ? (
                          <div className="ml-auto w-60 space-y-1.5">
                            {returning.target === 'ORDER_RETURN_EXCESS' && (
                              <p className="text-left text-xs text-slate-500">
                                Ghi đơn {formatCurrency(c.orderAmount ?? 0)}, chuyển trả khách {formatCurrency(complaintDiff(c) ?? 0)}
                              </p>
                            )}
                            <Input
                              placeholder={returning.target === 'ORDER_RETURN_EXCESS' ? 'Mã GD chuyển trả phần thừa' : 'Mã GD chuyển trả lại khách'}
                              value={payoutRef}
                              onChange={(e) => setPayoutRef(e.target.value)}
                              className="h-8 text-[13px]"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="ghost" onClick={() => setReturning(null)}>
                                Hủy
                              </Button>
                              <Button
                                size="sm"
                                disabled={!payoutRef.trim() || busyId === c.complaintId}
                                onClick={() =>
                                  run(c.complaintId, () =>
                                    complaintApi.resolve(
                                      c.complaintId,
                                      returning.target,
                                      returning.target === 'ORDER_RETURN_EXCESS'
                                        ? `Đã ghi đơn, chuyển trả phần thừa ${formatCurrency(complaintDiff(c) ?? 0)}, mã GD ${payoutRef.trim()}`
                                        : `Đã chuyển trả khách, mã GD ${payoutRef.trim()}`
                                    )
                                  ).then(() => setReturning(null))
                                }
                              >
                                Xác nhận đã trả
                              </Button>
                            </div>
                          </div>
                        ) : rejecting === c.complaintId ? (
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
                            {c.orderCode && (complaintDiff(c) ?? 0) > 0 ? (
                              <Button
                                size="sm"
                                disabled={busyId === c.complaintId}
                                onClick={() => {
                                  setPayoutRef('')
                                  setReturning({ id: c.complaintId, target: 'ORDER_RETURN_EXCESS' })
                                }}
                              >
                                Ghi đơn + trả phần thừa
                              </Button>
                            ) : (
                              c.orderCode && (complaintDiff(c) ?? 0) === 0 && (
                                <Button size="sm" disabled={busyId === c.complaintId} onClick={() => setConfirm(c)}>
                                  Ghi nhận vào đơn
                                </Button>
                              )
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === c.complaintId}
                              onClick={() => {
                                setPayoutRef('')
                                setReturning({ id: c.complaintId, target: 'RETURNED' })
                              }}
                            >
                              {(complaintDiff(c) ?? 0) > 0 ? 'Trả lại toàn bộ' : 'Đã chuyển trả khách'}
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
          title="Ghi nhận khoản tiền vào đơn?"
          message={`Xác nhận đã thấy ${formatCurrency(confirm.amount)} với mã giao dịch ${confirm.bankReference} trên sao kê ngân hàng.`}
          confirmText="Đã khớp sao kê, ghi nhận"
          onConfirm={() => {
            const c = confirm
            setConfirm(null)
            run(c.complaintId, () => complaintApi.resolve(c.complaintId, 'ORDER'))
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
