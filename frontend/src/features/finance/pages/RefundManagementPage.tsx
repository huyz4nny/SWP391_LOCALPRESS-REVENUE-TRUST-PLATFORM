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
import { RotateCcw, PlusCircle, CheckCircle2, XCircle, ShieldAlert, AlertCircle } from 'lucide-react'

export function RefundManagementPage() {
  const currentUser = mockStore.getCurrentUser()
  const isFinanceManager = currentUser.role === 'FINANCE_MANAGER' || currentUser.role === 'SYSTEM_ADMIN'

  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [paidOrders, setPaidOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  // Propose Refund Modal
  const [showProposeModal, setShowProposeModal] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [refundAmount, setRefundAmount] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [affectedBenefit, setAffectedBenefit] = useState('')
  const [isSubmittingPropose, setIsSubmittingPropose] = useState(false)

  // Review Refund Modal
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

    // Strict Separation of Duty check
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Quản trị Hoàn tiền & Thu hồi Quyền lợi (Refunds)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nguyên tắc 4 mắt (Four-Eyes Principle): Nhân viên kế toán lập đề xuất → Kế toán trưởng độc lập phê duyệt
          </p>
        </div>

        <Button
          onClick={() => setShowProposeModal(true)}
          size="sm"
          className="text-xs font-bold bg-primary-900"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1" />
          Lập đề xuất hoàn tiền mới
        </Button>
      </div>

      {/* Refunds Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã yêu cầu</th>
                <th className="px-4 py-3">Đơn hàng gốc</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Số tiền hoàn</th>
                <th className="px-4 py-3">Quyền lợi bị ảnh hưởng</th>
                <th className="px-4 py-3">Người lập đề xuất</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Phê duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((r) => {
                const isCreator = r.proposedBy === currentUser.id
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.id}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{r.orderCode}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{r.userName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-crimson">{formatCurrency(r.refundAmount)}</div>
                      {r.isPartial && (
                        <span className="text-[10px] text-amber-700 font-medium">Hoàn một phần</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600 font-medium">
                      {r.affectedBenefit}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>{r.proposedByName || r.proposedBy}</div>
                      <div className="text-[10px] text-slate-400">{formatDateTime(r.requestedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge type="refund" status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'UNDER_REVIEW' ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRefund(r)
                            setReviewNotes('')
                          }}
                          className={`text-xs font-bold ${
                            isCreator
                              ? 'bg-slate-300 text-slate-600 hover:bg-slate-400'
                              : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          }`}
                          title={isCreator ? 'Người lập không được tự duyệt đề xuất của chính mình' : 'Xem và phê duyệt'}
                        >
                          {isCreator ? 'Tự tạo (Không thể duyệt)' : 'Phê duyệt'}
                        </Button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRefund(r)
                            setReviewNotes(r.reviewNotes || '')
                          }}
                          className="text-slate-500 hover:text-slate-800 underline text-xs cursor-pointer"
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
      </div>

      {/* Propose Refund Modal (Finance Staff) */}
      <Dialog
        open={showProposeModal}
        onClose={() => setShowProposeModal(false)}
        title="Lập Đề Xuất Hoàn Tiền (Finance Staff)"
      >
        <form onSubmit={handleProposeRefund} className="space-y-4 text-xs">
          <div>
            <Label htmlFor="orderSel" required>Chọn đơn hàng đã thanh toán</Label>
            <select
              id="orderSel"
              value={selectedOrderId}
              onChange={handleOrderChange}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-primary-900"
            >
              {paidOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderCode} — {o.userName} — {o.targetTitle} ({formatCurrency(o.finalAmount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="rfAmount" required>Số tiền hoàn (VND) - Hỗ trợ hoàn một phần</Label>
            <Input
              id="rfAmount"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(Number(e.target.value))}
              required
              min={1000}
            />
          </div>

          <div>
            <Label htmlFor="affected" required>Quyền lợi bị thu hồi / điều chỉnh</Label>
            <Input
              id="affected"
              value={affectedBenefit}
              onChange={(e) => setAffectedBenefit(e.target.value)}
              placeholder="VD: Hủy quyền VIP, rút ngắn ngày phát sóng chiến dịch..."
              required
            />
          </div>

          <div>
            <Label htmlFor="rfReason" required>Lý do hoàn tiền chi tiết & căn cứ</Label>
            <Textarea
              id="rfReason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do và tài liệu đối chiếu (VD: Khách trả thừa, hợp đồng điều chỉnh)..."
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowProposeModal(false)}>
              Hủy bỏ
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingPropose}>
              Nộp Đề Xuất Hoàn Tiền
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Review Refund Dialog (Finance Manager) */}
      {selectedRefund && (
        <Dialog
          open={!!selectedRefund}
          onClose={() => setSelectedRefund(null)}
          title={`Xét Duyệt Hoàn Tiền: ${selectedRefund.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn gốc:</span>
                <span className="font-mono font-bold text-slate-800">{selectedRefund.orderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-semibold text-slate-800">{selectedRefund.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tiền gốc:</span>
                <span>{formatCurrency(selectedRefund.originalAmount)}</span>
              </div>
              <div className="flex justify-between text-crimson font-bold text-sm">
                <span>Số tiền đề xuất hoàn:</span>
                <span>{formatCurrency(selectedRefund.refundAmount)}</span>
              </div>
              <div className="pt-1 text-slate-600">
                <strong>Quyền lợi bị hủy:</strong> {selectedRefund.affectedBenefit}
              </div>
              <div className="pt-1 text-slate-600">
                <strong>Lý do đề xuất:</strong> {selectedRefund.reason}
              </div>
              <div className="pt-1 text-slate-400 text-[11px]">
                Người lập: {selectedRefund.proposedByName || selectedRefund.proposedBy}
              </div>
            </div>

            {selectedRefund.proposedBy === currentUser.id && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Cảnh báo phân quyền:</strong> Bạn là người lập đề xuất này. Theo quy chế tài chính (Four-Eyes Principle), bạn không được tự phê duyệt đề xuất của chính mình. Hãy đổi sang tài khoản <strong>Phạm Trưởng Phòng (Finance Manager)</strong> để duyệt!
                </span>
              </div>
            )}

            {selectedRefund.status === 'UNDER_REVIEW' && (
              <div>
                <Label htmlFor="rvNotes">Ý kiến phê duyệt của Kế toán trưởng</Label>
                <Textarea
                  id="rvNotes"
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Ghi chú phê duyệt hoặc lý do từ chối..."
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedRefund(null)}>
                Đóng
              </Button>

              {selectedRefund.status === 'UNDER_REVIEW' && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleReviewRefund(false)}
                    disabled={selectedRefund.proposedBy === currentUser.id}
                    isLoading={isSubmittingReview}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Từ chối
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleReviewRefund(true)}
                    disabled={selectedRefund.proposedBy === currentUser.id}
                    isLoading={isSubmittingReview}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Phê duyệt hoàn tiền
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
