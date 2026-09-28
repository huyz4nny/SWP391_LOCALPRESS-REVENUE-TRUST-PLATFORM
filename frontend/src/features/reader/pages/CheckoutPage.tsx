import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Order, PaymentMethod } from '@/features/finance/types'
import { httpClient } from '@/lib/http/client'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { QrCode, Building, CreditCard, CheckCircle2, AlertCircle, Upload, ShieldCheck, Clock } from 'lucide-react'

export function CheckoutPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [method, setMethod] = useState<PaymentMethod>('VIETQR')
  const [receiptImage, setReceiptImage] = useState<string>('')
  const [bankRefCode, setBankRefCode] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingOrder, setLoadingOrder] = useState(true)

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId)
    }
  }, [orderId])

  const loadOrder = async (id: string) => {
    try {
      setLoadingOrder(true)
      const data = await httpClient.get<Order>(`/finance/orders/${id}`)
      setOrder(data)
      if (data.paymentStatus === 'PAID') {
        navigate(`/payments/${data.id}`, { replace: true })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOrder(false)
    }
  }

  const handleProcessPayment = async () => {
    if (!order) return
    setIsLoading(true)

    try {
      await httpClient.post(`/finance/orders/${order.id}/pay`, {
        method,
        bankRefCode: method === 'BANK_TRANSFER' ? bankRefCode || 'VCB-TRANS-992' : undefined,
        receiptImage: method === 'BANK_TRANSFER' ? receiptImage || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80' : undefined,
      })

      navigate(`/payments/${order.id}`)
    } catch (err: any) {
      alert(err.message || 'Lỗi xử lý thanh toán')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingOrder) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center animate-pulse">
        <div className="h-64 bg-stone-200 rounded-xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-xl font-bold text-stone-900 mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-sm text-stone-500 mb-4">Đơn hàng không tồn tại hoặc đã bị hủy.</p>
        <Button onClick={() => navigate('/')}>Về trang chủ</Button>
      </div>
    )
  }

  // QR Code generator simulation
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    `00020101021238540010A00000072701240006970422011009123456780208QRIBFTTA520460115303704540${order.finalAmount}5802VN62180814${order.orderCode}6304`
  )}`

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center max-w-lg mx-auto mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
          Xác nhận thanh toán đơn hàng
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Mã đơn hàng: <strong className="text-stone-900 font-mono">{order.orderCode}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Payment Method & Execution */}
        <div className="md:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">1. Chọn phương thức thanh toán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Method 1: VietQR */}
              <div
                onClick={() => setMethod('VIETQR')}
                className={`p-3.5 rounded-lg border-2 flex items-center justify-between cursor-pointer transition-all ${
                  method === 'VIETQR'
                    ? 'border-primary-900 bg-primary-50/40 text-primary-950 font-semibold'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Chuyển khoản nhanh VietQR 24/7 (Khuyên dùng)</div>
                    <div className="text-xs text-stone-500 font-normal">Quét mã bằng mọi ứng dụng ngân hàng, duyệt tự động</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === 'VIETQR' ? 'border-primary-900' : 'border-stone-300'}`}>
                  {method === 'VIETQR' && <div className="w-2 h-2 rounded-full bg-primary-900" />}
                </div>
              </div>

              {/* Method 2: Manual Bank Transfer */}
              <div
                onClick={() => setMethod('BANK_TRANSFER')}
                className={`p-3.5 rounded-lg border-2 flex items-center justify-between cursor-pointer transition-all ${
                  method === 'BANK_TRANSFER'
                    ? 'border-primary-900 bg-primary-50/40 text-primary-950 font-semibold'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Chuyển khoản thủ công qua số tài khoản</div>
                    <div className="text-xs text-stone-500 font-normal">Tải ảnh ủy nhiệm chi/biên lai để kế toán tòa soạn đối soát</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === 'BANK_TRANSFER' ? 'border-primary-900' : 'border-stone-300'}`}>
                  {method === 'BANK_TRANSFER' && <div className="w-2 h-2 rounded-full bg-primary-900" />}
                </div>
              </div>

              {/* Method 3: MoMo */}
              <div
                onClick={() => setMethod('MOMO')}
                className={`p-3.5 rounded-lg border-2 flex items-center justify-between cursor-pointer transition-all ${
                  method === 'MOMO'
                    ? 'border-primary-900 bg-primary-50/40 text-primary-950 font-semibold'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center shrink-0 font-bold text-xs">
                    M
                  </div>
                  <div>
                    <div className="text-sm font-bold">Ví điện tử MoMo</div>
                    <div className="text-xs text-stone-500 font-normal">Thanh toán tức thì qua ví điện tử</div>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${method === 'MOMO' ? 'border-primary-900' : 'border-stone-300'}`}>
                  {method === 'MOMO' && <div className="w-2 h-2 rounded-full bg-primary-900" />}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Detail Display */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">2. Hướng dẫn thanh toán</CardTitle>
            </CardHeader>
            <CardContent>
              {method === 'VIETQR' && (
                <div className="flex flex-col items-center text-center p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-stone-200 mb-3">
                    <img src={qrUrl} alt="VietQR" className="w-48 h-48" />
                  </div>
                  <p className="text-xs text-stone-600 mb-2 font-medium">
                    Mở ứng dụng ngân hàng và quét mã QR để thanh toán chính xác
                  </p>
                  <div className="text-[11px] text-stone-500 space-y-1 bg-white p-3 rounded-lg border border-stone-200 w-full text-left font-mono">
                    <div>Ngân hàng: <strong>Vietcombank (Hải Phòng)</strong></div>
                    <div>Số tài khoản: <strong>0101009988776</strong></div>
                    <div>Chủ tài khoản: <strong>TOA SOAN BAO LOCALPRESS</strong></div>
                    <div>Số tiền: <strong>{formatCurrency(order.finalAmount)}</strong></div>
                    <div>Nội dung CK: <strong className="text-crimson">{order.orderCode}</strong></div>
                  </div>
                </div>
              )}

              {method === 'BANK_TRANSFER' && (
                <div className="space-y-4">
                  <div className="p-3 bg-stone-50 rounded-lg text-xs space-y-1 font-mono border border-stone-200">
                    <div>Ngân hàng: <strong>BIDV - Chi nhánh Hải Phòng</strong></div>
                    <div>Số tài khoản: <strong>51110000123456</strong></div>
                    <div>Chủ tài khoản: <strong>TOA SOAN BAO DIEN TU LOCALPRESS</strong></div>
                    <div>Số tiền: <strong>{formatCurrency(order.finalAmount)}</strong></div>
                    <div>Nội dung CK: <strong className="text-crimson">{order.orderCode}</strong></div>
                  </div>

                  <div>
                    <Label htmlFor="refCode">Mã tham chiếu ngân hàng (nếu có)</Label>
                    <Input
                      id="refCode"
                      placeholder="VD: FT2625899214"
                      value={bankRefCode}
                      onChange={(e) => setBankRefCode(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Ảnh chụp màn hình biên lai / Ủy nhiệm chi</Label>
                    <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 text-center hover:bg-stone-50 cursor-pointer">
                      <Upload className="w-6 h-6 text-stone-400 mx-auto mb-1" />
                      <p className="text-xs text-stone-600">Bấm để tải ảnh biên lai chuyển tiền mẫu</p>
                      <button
                        type="button"
                        onClick={() => setReceiptImage('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80')}
                        className="mt-2 text-xs text-primary-800 font-semibold underline cursor-pointer"
                      >
                        {receiptImage ? '✓ Đã tải ảnh biên lai thành công' : 'Đính kèm ảnh mẫu'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {method === 'MOMO' && (
                <div className="text-center p-6 bg-pink-50 rounded-lg border border-pink-200">
                  <p className="text-sm font-bold text-pink-900 mb-2">Thanh toán qua Ví MoMo</p>
                  <p className="text-xs text-pink-700">
                    Hệ thống sẽ chuyển tiếp bạn đến cổng thanh toán MoMo an toàn với số tiền {formatCurrency(order.finalAmount)}.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button
                onClick={handleProcessPayment}
                isLoading={isLoading}
                className="w-full py-3 text-sm font-bold"
              >
                {method === 'BANK_TRANSFER' ? 'Gửi biên lai xác nhận thanh toán' : 'Xác nhận đã thanh toán xong'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="md:col-span-5">
          <Card>
            <CardHeader className="pb-3 border-b border-stone-100">
              <CardTitle className="text-base">Thông tin đơn hàng</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div>
                <span className="text-stone-500 block mb-0.5">Sản phẩm / Dịch vụ:</span>
                <span className="font-bold text-stone-900 text-sm">{order.targetTitle}</span>
              </div>

              <div>
                <span className="text-stone-500 block mb-0.5">Loại đơn hàng:</span>
                <span className="font-semibold text-stone-800">
                  {order.orderType === 'SUBSCRIPTION' && 'Đăng ký Gói Độc Giả Premium'}
                  {order.orderType === 'ARTICLE_PURCHASE' && 'Mua lẻ bài phóng sự điều tra'}
                  {order.orderType === 'AD_CAMPAIGN' && 'Hợp đồng Quảng cáo Doanh nghiệp (B2B)'}
                </span>
              </div>

              <div>
                <span className="text-stone-500 block mb-0.5">Người thanh toán:</span>
                <span className="font-semibold text-stone-800">{order.userName} ({order.userEmail})</span>
              </div>

              <div className="pt-3 border-t border-stone-200 space-y-2">
                <div className="flex justify-between text-stone-600">
                  <span>Giá niêm yết:</span>
                  <span>{formatCurrency(order.amount)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Chiết khấu:</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-900 font-bold text-base pt-2 border-t border-stone-200">
                  <span>Tổng thanh toán:</span>
                  <span className="text-crimson font-black">{formatCurrency(order.finalAmount)}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg text-amber-900 text-[11px] leading-relaxed border border-amber-200 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Đơn hàng được lưu trên sổ quỹ LocalPress. Bạn sẽ nhận được hóa đơn điện tử ngay sau khi giao dịch hoàn tất.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
