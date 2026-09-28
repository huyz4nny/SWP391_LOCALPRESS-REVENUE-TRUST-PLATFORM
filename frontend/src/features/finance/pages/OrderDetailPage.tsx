import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Order } from '../types'
import { financeApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowLeft,
  FileText,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  Building,
} from 'lucide-react'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = mockStore.getCurrentUser()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (id) loadOrder(id)
  }, [id])

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true)
      const data = await financeApi.getOrderById(orderId)
      setOrder(data)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyBankTransfer = async () => {
    if (!order) return
    setIsVerifying(true)
    try {
      await financeApi.verifyBankTransfer(order.id)
      alert(`Đã xác nhận thanh toán thành công đơn hàng ${order.orderCode}! Quyền lợi đã được cấp cho tài khoản.`)
      loadOrder(order.id)
    } catch (err: any) {
      alert(err.message || 'Lỗi xác nhận thanh toán')
    } finally {
      setIsVerifying(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center animate-pulse">Đang tải chi tiết đơn hàng...</div>
  }

  if (!order) {
    return <div className="py-12 text-center">Không tìm thấy đơn hàng</div>
  }

  const latestAttempt = order.paymentAttempts[order.paymentAttempts.length - 1]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link
            to="/backoffice/finance/orders"
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-slate-900">{order.orderCode}</span>
              <StatusBadge type="payment" status={order.paymentStatus} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khởi tạo lúc: {formatDateTime(order.createdAt)} • Người mua: {order.userName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {order.paymentStatus === 'PAID' && (
            <Link to={`/backoffice/finance/refunds?orderId=${order.id}`}>
              <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Lập đề xuất hoàn tiền
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Manual Transfer Verification Callout (Actionable for Finance Staff) */}
      {order.paymentStatus === 'PROCESSING' && latestAttempt?.receiptImageUrl && (
        <div className="p-5 bg-amber-50 rounded-2xl border-2 border-amber-300 text-amber-950 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-amber-600 animate-spin" />
              <h3 className="font-bold text-sm">
                Xác thực ủy nhiệm chi chuyển khoản thủ công
              </h3>
            </div>
            <span className="text-xs font-semibold bg-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full">
              Chờ Kế toán xác minh
            </span>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed">
            Khách hàng đã nộp mã tham chiếu và hình ảnh biên lai. Theo quy định kiểm soát tài chính, việc nộp ảnh không tự động biến đơn hàng thành PAID. Bạn cần đối chiếu với sao kê tài khoản ngân hàng của tòa soạn trước khi bấm xác nhận.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white p-4 rounded-xl border border-amber-200 text-xs">
            <div>
              <div className="text-stone-500 mb-1">Mã tham chiếu ngân hàng:</div>
              <div className="font-mono text-base font-bold text-stone-900">
                {latestAttempt.bankReferenceCode || '—'}
              </div>
              <div className="text-stone-500 mt-2 mb-1">Số tiền cần đối chiếu:</div>
              <div className="text-lg font-black text-crimson">
                {formatCurrency(order.finalAmount)}
              </div>
            </div>

            <div>
              <span className="text-stone-500 block mb-1">Hình ảnh biên lai đính kèm:</span>
              <a
                href={latestAttempt.receiptImageUrl}
                target="_blank"
                rel="noreferrer"
                className="block relative rounded overflow-hidden border border-stone-200 group max-w-[200px]"
              >
                <img src={latestAttempt.receiptImageUrl} alt="Biên lai" className="w-full h-24 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold">
                  Xem ảnh lớn
                </div>
              </a>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleVerifyBankTransfer}
              isLoading={isVerifying}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Xác nhận tiền đã vào tài khoản (Duyệt PAID)
            </Button>
          </div>
        </div>
      )}

      {/* Main Order Details Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Thông tin thanh toán & Hóa đơn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Dịch vụ:</span>
              <span className="font-semibold text-slate-800 text-right">{order.targetTitle}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phân loại:</span>
              <span className="font-medium text-slate-700">{order.orderType}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phương thức:</span>
              <span className="font-medium text-slate-700">{order.paymentMethod || 'Chưa chọn'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Giá gốc:</span>
              <span className="text-slate-700">{formatCurrency(order.amount)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600">
                <span>Chiết khấu:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-slate-200 text-sm font-bold">
              <span>Tổng thu:</span>
              <span className="text-crimson font-black">{formatCurrency(order.finalAmount)}</span>
            </div>

            {order.invoiceNumber && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center text-primary-900 font-bold">
                  <FileText className="w-4 h-4 mr-1" />
                  Hóa đơn GTGT điện tử đã phát hành
                </div>
                <div className="font-mono text-slate-700">Số hóa đơn: {order.invoiceNumber}</div>
                <div className="text-[11px] text-slate-400">Thời gian ký số: {formatDateTime(order.invoiceIssuedAt)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Lịch sử các lần thử thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.paymentAttempts.length === 0 ? (
              <p className="text-slate-400 italic py-2">Khách hàng chưa thực hiện lần thử thanh toán nào.</p>
            ) : (
              order.paymentAttempts.map((att) => (
                <div key={att.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{att.transactionCode}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        att.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : att.status === 'PROCESSING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {att.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Cổng: {att.method} • Số tiền: {formatCurrency(att.amount)}
                  </div>
                  {att.bankReferenceCode && (
                    <div className="text-[11px] text-slate-600 font-mono">
                      Ref: {att.bankReferenceCode}
                    </div>
                  )}
                  {att.verifiedBy && (
                    <div className="text-[11px] text-emerald-700">
                      Xác nhận bởi: {att.verifiedBy} ({formatDateTime(att.verifiedAt)})
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
