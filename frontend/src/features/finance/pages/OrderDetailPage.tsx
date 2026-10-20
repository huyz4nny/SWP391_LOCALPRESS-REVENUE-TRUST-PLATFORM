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
  Printer,
  X,
} from 'lucide-react'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = mockStore.getCurrentUser()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

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
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInvoiceModal(true)}
                className="text-xs text-primary-900 border-primary-300 hover:bg-primary-50 font-bold"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-primary-700" />
                In chứng từ / Hóa đơn (UC057)
              </Button>
              <Link to={`/backoffice/finance/refunds?orderId=${order.id}`}>
                <Button variant="outline" size="sm" className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Lập đề xuất hoàn tiền
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

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

            {order.paymentStatus === 'PAID' && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-primary-900 font-bold">
                    <FileText className="w-4 h-4 mr-1 text-primary-700" />
                    Hóa đơn GTGT & Chứng từ (UC057)
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    ĐÃ KÝ SỐ
                  </span>
                </div>
                <div className="font-mono text-slate-700 text-xs">
                  Số HĐ: {order.invoiceNumber || `INV-2026-${order.orderCode}`}
                </div>
                <div className="text-[11px] text-slate-400">
                  Thời gian: {formatDateTime(order.invoiceIssuedAt || order.updatedAt || order.createdAt)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full text-xs border-primary-300 text-primary-900 hover:bg-primary-50 font-bold"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-primary-700" />
                  Xem & In Chứng từ Điện tử
                </Button>
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

      {/* Invoice Modal for UC057 (Generate Financial Documents) */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b pb-3 border-stone-200">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary-900" />
                <h3 className="font-bold text-base text-slate-900">
                  Hóa đơn Giá trị Gia tăng & Chứng từ Điện tử (UC057)
                </h3>
              </div>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Invoice Sheet */}
            <div className="p-6 bg-[#fafaf9] rounded-xl border border-stone-300 space-y-4 text-xs font-sans text-stone-800">
              <div className="flex justify-between items-start border-b border-stone-300 pb-3">
                <div>
                  <h4 className="font-serif font-black text-sm text-primary-900 uppercase">
                    TÒA SOẠN BÁO ĐIỆN TỬ LOCALPRESS
                  </h4>
                  <p className="text-[11px] text-stone-500">Đơn vị chủ quản: Hội Nhà báo TP. Hải Phòng</p>
                  <p className="text-[11px] text-stone-500">Mã số thuế: 0201998877</p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-crimson text-sm">HÓA ĐƠN ĐIỆN TỬ</div>
                  <div className="text-stone-600">Ký hiệu: <b>AA/26E</b></div>
                  <div className="text-stone-900 font-bold">
                    Số: {order.invoiceNumber || `INV-2026-${order.orderCode}`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-1">
                <div>
                  <span className="text-stone-500 block">Khách hàng / Đơn vị mua:</span>
                  <span className="font-bold text-stone-900">{order.userName}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Mã đơn hàng liên kết:</span>
                  <span className="font-mono font-bold text-stone-900">{order.orderCode}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Phương thức thanh toán:</span>
                  <span className="font-medium text-stone-800">{order.paymentMethod || 'Chuyển khoản ngân hàng'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Ngày ký số điện tử:</span>
                  <span className="font-medium text-stone-800">
                    {formatDateTime(order.invoiceIssuedAt || order.updatedAt || order.createdAt)}
                  </span>
                </div>
              </div>

              <table className="w-full border-collapse border border-stone-300 text-left text-xs my-2">
                <thead>
                  <tr className="bg-stone-200 text-stone-800 font-bold">
                    <th className="border border-stone-300 p-2 text-center w-10">STT</th>
                    <th className="border border-stone-300 p-2">Tên dịch vụ / Nội dung</th>
                    <th className="border border-stone-300 p-2 text-center w-16">ĐVT</th>
                    <th className="border border-stone-300 p-2 text-right">Thành tiền (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-stone-300 p-2 text-center">1</td>
                    <td className="border border-stone-300 p-2 font-medium">
                      {order.targetTitle} ({order.orderType})
                    </td>
                    <td className="border border-stone-300 p-2 text-center">Gói/Lượt</td>
                    <td className="border border-stone-300 p-2 text-right font-mono">
                      {formatCurrency(order.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="space-y-1 text-right pt-2 border-t border-stone-300">
                <div className="flex justify-between">
                  <span className="text-stone-500">Cộng tiền dịch vụ:</span>
                  <span className="font-mono font-semibold">{formatCurrency(order.amount)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Chiết khấu thương mại:</span>
                    <span className="font-mono">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Thuế suất GTGT (10%):</span>
                  <span className="font-mono">{formatCurrency(Math.round(order.finalAmount * 0.1 / 1.1))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-1 border-t border-stone-200">
                  <span>Tổng tiền thanh toán:</span>
                  <span className="text-crimson font-black text-base">{formatCurrency(order.finalAmount)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-dashed border-stone-300 flex items-center justify-between text-[11px] text-stone-500">
                <span>Trạng thái: <b>ĐÃ THU TIỀN ĐỦ 100%</b></span>
                <span className="text-emerald-700 font-bold flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
                  Chứng từ ký số hợp lệ bởi LocalPress CA
                </span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowInvoiceModal(false)}>
                Đóng
              </Button>
              <Button
                size="sm"
                className="bg-primary-900 hover:bg-primary-800 text-white font-bold"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                In chứng từ ngay (Print / PDF)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
