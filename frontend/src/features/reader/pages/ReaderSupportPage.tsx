import React, { useState } from 'react'
import { mockStore } from '@/mocks/store'
import { httpClient } from '@/lib/http/client'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { HelpCircle, Send, CheckCircle2, RotateCcw } from 'lucide-react'

export function ReaderSupportPage() {
  const currentUser = mockStore.getCurrentUser()
  const myRefunds = mockStore.getState().refunds.filter((r) => r.userId === currentUser.id)
  const myPaidOrders = mockStore.getState().orders.filter(
    (o) => o.userId === currentUser.id && o.paymentStatus === 'PAID'
  )

  const [selectedOrderId, setSelectedOrderId] = useState(myPaidOrders[0]?.id || '')
  const [reason, setReason] = useState('')
  const [refundAmount, setRefundAmount] = useState(
    myPaidOrders[0]?.finalAmount ? String(myPaidOrders[0].finalAmount) : '0'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setSelectedOrderId(id)
    const matched = myPaidOrders.find((o) => o.id === id)
    if (matched) {
      setRefundAmount(String(matched.finalAmount))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderId || !reason.trim()) return

    setIsSubmitting(true)
    try {
      const order = myPaidOrders.find((o) => o.id === selectedOrderId)
      await httpClient.post('/finance/refunds/propose', {
        orderId: selectedOrderId,
        refundAmount: Number(refundAmount),
        reason: reason.trim(),
        affectedBenefit: `Khiếu nại từ độc giả ${currentUser.name}: ${order?.targetTitle}`,
      })
      setIsSuccess(true)
      setReason('')
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi yêu cầu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Trung tâm Hỗ trợ & Khiếu nại</h2>
        <p className="text-xs text-stone-500 mt-1">
          Gửi yêu cầu hỗ trợ kỹ thuật hoặc đề nghị hoàn tiền theo quy định tòa soạn
        </p>
      </div>

      {/* Refund request history */}
      {myRefunds.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-serif text-sm font-bold text-stone-900 flex items-center">
            <RotateCcw className="w-4 h-4 mr-1.5 text-primary-900" />
            Yêu cầu hoàn tiền đã gửi ({myRefunds.length})
          </h3>

          <div className="space-y-2">
            {myRefunds.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-stone-900">{r.id}</span>
                    <span>•</span>
                    <span>Đơn hàng: <strong className="font-mono">{r.orderCode}</strong></span>
                  </div>
                  <StatusBadge type="refund" status={r.status} />
                </div>

                <div className="flex justify-between text-stone-600">
                  <span>Số tiền yêu cầu hoàn: <strong>{formatCurrency(r.refundAmount)}</strong></span>
                  <span>Ngày gửi: {formatDateTime(r.requestedAt)}</span>
                </div>

                <p className="text-stone-700 bg-white p-2.5 rounded border border-stone-200">
                  Lý do: {r.reason}
                </p>

                {r.reviewNotes && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-blue-900">
                    <strong>Phản hồi từ Ban Tài chính:</strong> {r.reviewNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Refund / Support Request Form */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-6 space-y-4 max-w-lg">
        <h3 className="font-serif text-base font-bold text-stone-900">
          Gửi đề xuất hoàn tiền / Khiếu nại dịch vụ
        </h3>

        {isSuccess ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Yêu cầu đã được tiếp nhận thành công!</span>
            </div>
            <p>
              Bộ phận Kế toán (Finance Staff) và Kế toán trưởng sẽ kiểm tra hồ sơ, đối chiếu sao kê và phản hồi trong vòng 24 giờ làm việc.
            </p>
            <Button size="sm" variant="outline" onClick={() => setIsSuccess(false)}>
              Gửi thêm yêu cầu khác
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="orderSelect" required>
                Chọn đơn hàng cần khiếu nại / hoàn tiền
              </Label>
              {myPaidOrders.length === 0 ? (
                <p className="text-stone-500 italic py-2">
                  Bạn chưa có đơn hàng đã thanh toán nào để yêu cầu hoàn tiền.
                </p>
              ) : (
                <select
                  id="orderSelect"
                  value={selectedOrderId}
                  onChange={handleOrderChange}
                  className="w-full h-10 px-3 rounded-md border border-stone-300 bg-white text-xs focus:ring-2 focus:ring-primary-900"
                >
                  {myPaidOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderCode} — {o.targetTitle} ({formatCurrency(o.finalAmount)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <Label htmlFor="refundAmount" required>
                Số tiền đề xuất hoàn (VND)
              </Label>
              <Input
                id="refundAmount"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                required
                min={1000}
              />
            </div>

            <div>
              <Label htmlFor="reason" required>
                Lý do chi tiết
              </Label>
              <Textarea
                id="reason"
                placeholder="Nêu rõ lý do (VD: Thanh toán trùng, mua nhầm gói, lỗi không đọc được bài)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={myPaidOrders.length === 0}
              isLoading={isSubmitting}
              className="w-full"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Gửi đề xuất hoàn tiền
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
