import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Order } from '@/features/finance/types'
import { httpClient } from '@/lib/http/client'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Clock, XCircle, ArrowRight, BookOpen, RefreshCw, FileText } from 'lucide-react'

export function PaymentResultPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (paymentId) loadOrder(paymentId)
  }, [paymentId])

  const loadOrder = async (id: string) => {
    try {
      setLoading(true)
      const data = await httpClient.get<Order>(`/finance/orders/${id}`)
      setOrder(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!order) return
    setIsRefreshing(true)
    try {
      const data = await httpClient.get<Order>(`/finance/orders/${order.id}`)
      setOrder(data)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-16 text-center animate-pulse">
        <div className="h-48 bg-stone-200 rounded-xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">Không tìm thấy thông tin đơn hàng</h2>
        <Button onClick={() => navigate('/')}>Về trang chủ</Button>
      </div>
    )
  }

  const isPaid = order.paymentStatus === 'PAID'
  const isProcessing = order.paymentStatus === 'PROCESSING'
  const isFailed = order.paymentStatus === 'FAILED' || order.paymentStatus === 'EXPIRED'

  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <Card className="p-6 sm:p-8">
        <CardContent className="space-y-6 pt-4">
          {/* Status Icon */}
          {isPaid && (
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          )}

          {isProcessing && (
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs animate-pulse">
              <Clock className="w-10 h-10" />
            </div>
          )}

          {isFailed && (
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <XCircle className="w-10 h-10" />
            </div>
          )}

          {/* Heading */}
          <div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              {isPaid && 'Thanh toán thành công!'}
              {isProcessing && 'Đang xác minh chuyển khoản'}
              {isFailed && 'Giao dịch chưa thành công'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {isPaid && 'Đặc quyền đọc và dịch vụ của bạn đã được kích hoạt trên hệ thống.'}
              {isProcessing && 'Hệ thống đã nhận ủy nhiệm chi. Kế toán tòa soạn đang kiểm tra đối chiếu tài khoản ngân hàng.'}
              {isFailed && 'Giao dịch hết hạn hoặc ngân hàng từ chối xử lý. Vui lòng thử lại.'}
            </p>
          </div>

          {/* Details Table */}
          <div className="bg-stone-50 rounded-xl p-4 text-xs space-y-2 border border-stone-200 text-left">
            <div className="flex justify-between">
              <span className="text-stone-500">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-stone-900">{order.orderCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Nội dung:</span>
              <span className="font-semibold text-stone-800 text-right">{order.targetTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Số tiền:</span>
              <span className="font-bold text-stone-900">{formatCurrency(order.finalAmount)}</span>
            </div>
            {order.invoiceNumber && (
              <div className="flex justify-between text-primary-900 font-medium pt-1 border-t border-stone-200">
                <span>Số hóa đơn điện tử:</span>
                <span>{order.invoiceNumber}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {isPaid && (
              <>
                {order.orderType === 'ARTICLE_PURCHASE' ? (
                  <Button
                    onClick={() => navigate(`/articles/${order.targetId}`)}
                    className="w-full py-2.5 font-bold"
                  >
                    <BookOpen className="w-4 h-4 mr-1.5" />
                    Đọc toàn văn bài viết ngay
                  </Button>
                ) : order.orderType === 'AD_CAMPAIGN' ? (
                  <Button
                    onClick={() => navigate(`/advertiser/bookings`)}
                    className="w-full py-2.5 font-bold"
                  >
                    Xem chi tiết Booking quảng cáo
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/')}
                    className="w-full py-2.5 font-bold"
                  >
                    Khám phá kho bài viết Premium
                  </Button>
                )}

                <Link
                  to="/account/orders"
                  className="text-xs text-stone-500 hover:text-stone-800 underline mt-1"
                >
                  Xem lịch sử giao dịch & Hóa đơn VAT
                </Link>
              </>
            )}

            {isProcessing && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  isLoading={isRefreshing}
                  className="w-full py-2.5 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Kiểm tra lại trạng thái
                </Button>
                <p className="text-[11px] text-stone-400">
                  Tip Demo: Đổi vai trò sang "Lê Thị Thu Ngân (Finance Staff)" qua thanh Switcher bên dưới để duyệt đơn hàng này!
                </p>
                <Link to="/" className="text-xs text-primary-900 font-semibold hover:underline mt-2">
                  Quay về Trang chủ
                </Link>
              </>
            )}

            {isFailed && (
              <Button
                onClick={() => navigate(`/checkout/${order.id}`)}
                className="w-full py-2.5 font-bold"
              >
                Thử thanh toán lại
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
