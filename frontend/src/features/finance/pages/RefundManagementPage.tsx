import React, { useState, useEffect } from 'react'
import { RefundRequest, Order } from '../types'
import { financeApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { PlusCircle } from 'lucide-react'
import { PageHeader, Panel, KeyValue, Notice, tableCls, LoadingBlock } from '../components/LedgerUI'

/** Đề xuất không có người lập là do module khác tự lập khi tiền về mà không kích hoạt được (vd SV1). */
const proposerLabel = (r: RefundRequest) => r.proposedByName || r.proposedBy || 'Hệ thống'

export function RefundManagementPage() {
  const currentUser = mockStore.getCurrentUser()
  // Mắt 2 là Kế toán trưởng (API thật: SYSTEM_ADMIN); backend trả 403 cho vai trò khác
  const isManager = currentUser.role === 'FINANCE_MANAGER' || currentUser.role === 'SYSTEM_ADMIN'

  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [paidOrders, setPaidOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Lập đề xuất (nhân viên kế toán)
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [affectedBenefit, setAffectedBenefit] = useState('')
  const [isSubmittingPropose, setIsSubmittingPropose] = useState(false)

  // Xét duyệt (kế toán trưởng)
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [rData, oData] = await Promise.all([financeApi.getRefunds(), financeApi.getOrders()])
      setRefunds(rData)
      const paid = oData.filter((o) => o.paymentStatus === 'PAID')
      setPaidOrders(paid)
      if (paid.length > 0) {
        setSelectedOrderId(paid[0].id)
        setRefundAmount(paid[0].finalAmount)
        setAffectedBenefit(`Hủy quyền truy cập ${paid[0].targetTitle}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const oId = e.target.value
    setSelectedOrderId(oId)
    const o = paidOrders.find((x) => x.id === oId)
    if (o) {
      setRefundAmount(o.finalAmount)
      setAffectedBenefit(`Thu hồi quyền lợi của đơn ${o.orderCode}: ${o.targetTitle}`)
    }
  }

  const handleProposeRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderId || !reason.trim()) return

    const order = paidOrders.find((o) => o.id === selectedOrderId)
    if (order && refundAmount > order.finalAmount) {
      alert('Số tiền hoàn không thể lớn hơn số tiền khách đã thanh toán!')
      return
    }

    setIsSubmittingPropose(true)
    try {
      await financeApi.proposeRefund({
        orderId: selectedOrderId,
        refundAmount: Number(refundAmount),
        reason,
        affectedBenefit,
      })
      setShowProposeModal(false)
      setReason('')
      loadData()
      alert('Đã lập đề xuất hoàn tiền thành công! Đang chờ Kế toán trưởng phê duyệt.')
    } catch (err: any) {
      alert(err.message || 'Lỗi lập đề xuất hoàn tiền')
    } finally {
      setIsSubmittingPropose(false)
    }
  }

  const handleReviewRefund = async (approved: boolean) => {
    if (!selectedRefund) return

    // Tách bạch nhiệm vụ: người lập không được tự duyệt
    if (selectedRefund.proposedBy === currentUser.id) {
      alert('Nguyên tắc kiểm soát tài chính: Người lập đề xuất không được tự phê duyệt yêu cầu của chính mình! Vui lòng đổi sang vai trò Kế toán trưởng (Phạm Trưởng Phòng).')
      return
    }

    setIsSubmittingReview(true)
    try {
      await financeApi.reviewRefund(selectedRefund.id, approved, reviewNotes)
      setSelectedRefund(null)
      loadData()
      alert(approved ? 'Phê duyệt hoàn tiền thành công! Tiền đã được ghi nợ vào sổ quỹ và thu hồi quyền lợi tương ứng.' : 'Đã từ chối yêu cầu hoàn tiền.')
    } catch (err: any) {
      alert(err.message || 'Lỗi phê duyệt hoàn tiền')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const isWaiting = (r: RefundRequest) => r.status === 'UNDER_REVIEW' || (r.status as string) === 'PENDING'
  const pending = refunds.filter(isWaiting)
  const pendingAmount = pending.reduce((acc, r) => acc + r.refundAmount, 0)
  const selectedOrder = paidOrders.find((x) => x.id === selectedOrderId)

  if (loading && refunds.length === 0) return <LoadingBlock rows={6} />

  return (
    <div>
      <PageHeader
        title="Hoàn tiền"
        sub={
          pending.length > 0 ? (
            <span className="num">
              {pending.length} đề xuất chờ kế toán trưởng duyệt, tổng {formatCurrency(pendingAmount)}. Người lập đề xuất không được tự duyệt.
            </span>
          ) : (
            'Không có đề xuất nào chờ duyệt. Nhân viên kế toán lập đề xuất, kế toán trưởng duyệt độc lập.'
          )
        }
        actions={
          <Button size="sm" onClick={() => setShowProposeModal(true)} disabled={paidOrders.length === 0}>
            <PlusCircle className="h-3.5 w-3.5" />
            Lập đề xuất hoàn tiền
          </Button>
        }
      />

      <Panel title="Đề xuất hoàn tiền" aside={<span className="num">{refunds.length} đề xuất</span>} bodyClassName="px-0 pb-1">
        {refunds.length === 0 ? (
          <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Chưa có đề xuất hoàn tiền nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Mã yêu cầu</th>
                  <th className={tableCls.th}>Khách hàng</th>
                  <th className={tableCls.th}>Quyền lợi bị thu hồi</th>
                  <th className={tableCls.th}>Người lập</th>
                  <th className={tableCls.th}>Trạng thái</th>
                  <th className={tableCls.thNum}>Số tiền hoàn</th>
                  <th className={tableCls.th}><span className="sr-only">Phê duyệt</span></th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((r) => {
                  const isCreator = r.proposedBy === currentUser.id
                  return (
                    <tr key={r.id} className={tableCls.tr}>
                      <td className={tableCls.td}>
                        <div className={tableCls.code}>{r.id}</div>
                        <div className="whitespace-nowrap font-mono text-xs text-slate-500">{r.orderCode}</div>
                      </td>
                      <td className={`${tableCls.td} whitespace-nowrap text-slate-900`}>{r.userName}</td>
                      <td className={`${tableCls.td} max-w-[220px]`}>
                        <div className="truncate" title={r.affectedBenefit}>{r.affectedBenefit}</div>
                      </td>
                      <td className={`${tableCls.td} whitespace-nowrap`}>
                        <div className="max-w-[170px] truncate text-slate-900" title={proposerLabel(r)}>{proposerLabel(r).replace(/\s*\(.*\)$/, '')}</div>
                        <div className="text-xs text-slate-500 num">{formatDateTime(r.requestedAt)}</div>
                      </td>
                      <td className={tableCls.td}>
                        <StatusBadge type="refund" status={r.status} />
                      </td>
                      <td className={tableCls.tdNum}>
                        <div className="font-semibold">{formatCurrency(r.refundAmount)}</div>
                        <div className="text-xs text-slate-500">
                          {r.isPartial ? `một phần của ${formatCurrency(r.originalAmount)}` : 'toàn bộ'}
                        </div>
                      </td>
                      <td className={`${tableCls.td} text-right`}>
                        {isWaiting(r) ? (
                          isCreator ? (
                            <span className="whitespace-nowrap text-xs text-slate-500" title="Người lập không được tự duyệt đề xuất của chính mình">
                              Bạn lập, chờ người khác duyệt
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRefund(r)
                                setReviewNotes('')
                              }}
                            >
                              Xét duyệt
                            </Button>
                          )
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedRefund(r)
                              setReviewNotes(r.reviewNotes || '')
                            }}
                            className="text-[13px] font-medium text-primary-900 hover:underline cursor-pointer"
                          >
                            Chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Dialog open={showProposeModal} onClose={() => setShowProposeModal(false)} title="Lập đề xuất hoàn tiền">
        <form onSubmit={handleProposeRefund} className="space-y-4">
          <div>
            <Label htmlFor="orderSel" required>Đơn đã thanh toán</Label>
            <select
              id="orderSel"
              value={selectedOrderId}
              onChange={handleOrderChange}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 hover:border-slate-400 focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/15"
            >
              {paidOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderCode}, {o.userName}, {formatCurrency(o.finalAmount)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="rfAmount" required>Số tiền hoàn (VND)</Label>
            <Input
              id="rfAmount"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              required
              min={1000}
              className="num"
            />
            {selectedOrder && (
              <p className="mt-1.5 text-xs text-slate-500 num">
                Tối đa {formatCurrency(selectedOrder.finalAmount)}, số khách đã trả. Hoàn một phần thì khách giữ quyền lợi.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="affected" required>Quyền lợi bị thu hồi hoặc điều chỉnh</Label>
            <Input
              id="affected"
              value={affectedBenefit}
              onChange={(e) => setAffectedBenefit(e.target.value)}
              placeholder="Ví dụ: hủy gói Premium tháng 10"
              required
            />
          </div>

          <div>
            <Label htmlFor="rfReason" required>Lý do và căn cứ</Label>
            <Textarea
              id="rfReason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: khách trả trùng hai lần, đối chiếu sao kê ngày 12/10"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProposeModal(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingPropose}>
              Gửi đề xuất
            </Button>
          </div>
        </form>
      </Dialog>

      {selectedRefund && (
        <Dialog open={!!selectedRefund} onClose={() => setSelectedRefund(null)} title={`Đề xuất hoàn tiền ${selectedRefund.id}`}>
          <div className="space-y-4">
            <dl className="rounded-md bg-slate-50 px-3.5 py-1">
              <KeyValue label="Đơn gốc"><span className="font-mono">{selectedRefund.orderCode}</span></KeyValue>
              <KeyValue label="Khách hàng">{selectedRefund.userName}</KeyValue>
              <KeyValue label="Khách đã trả"><span className="num">{formatCurrency(selectedRefund.originalAmount)}</span></KeyValue>
              <KeyValue label="Đề xuất hoàn" strong><span className="num">{formatCurrency(selectedRefund.refundAmount)}</span></KeyValue>
              <KeyValue label="Quyền lợi bị thu hồi">{selectedRefund.affectedBenefit}</KeyValue>
              <KeyValue label="Lý do">{selectedRefund.reason}</KeyValue>
              <KeyValue label="Người lập">{proposerLabel(selectedRefund)}</KeyValue>
              {selectedRefund.reviewNotes && <KeyValue label="Ý kiến duyệt">{selectedRefund.reviewNotes}</KeyValue>}
            </dl>

            {selectedRefund.status === 'UNDER_REVIEW' && !isManager && selectedRefund.proposedBy !== currentUser.id && (
              <Notice tone="note">Chỉ Kế toán trưởng được duyệt hoặc từ chối hoàn tiền (mắt 2).</Notice>
            )}

            {selectedRefund.proposedBy === currentUser.id && (
              <Notice tone="warning">
                Bạn là người lập đề xuất này nên không được tự duyệt (nguyên tắc 4 mắt). Đổi sang tài khoản kế toán trưởng để duyệt.
              </Notice>
            )}

            {selectedRefund.status === 'UNDER_REVIEW' && (
              <div>
                <Label htmlFor="rvNotes">Ý kiến của kế toán trưởng</Label>
                <Textarea
                  id="rvNotes"
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Ghi chú khi duyệt, hoặc lý do từ chối"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setSelectedRefund(null)}>
                Đóng
              </Button>

              {selectedRefund.status === 'UNDER_REVIEW' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-negative"
                    onClick={() => handleReviewRefund(false)}
                    disabled={!isManager || selectedRefund.proposedBy === currentUser.id}
                    isLoading={isSubmittingReview}
                  >
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReviewRefund(true)}
                    disabled={!isManager || selectedRefund.proposedBy === currentUser.id}
                    isLoading={isSubmittingReview}
                  >
                    Duyệt hoàn {formatCurrency(selectedRefund.refundAmount)}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
