import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { Order } from '@/features/finance/types'
import { httpClient } from '@/lib/http/client'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Receipt, FileText, ExternalLink } from 'lucide-react'

export function ReaderOrdersPage() {
  const currentUser = mockStore.getCurrentUser()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [currentUser.id])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await httpClient.get<Order[]>('/finance/orders')
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Lịch sử giao dịch & Hóa đơn</h2>
        <p className="text-xs text-stone-500 mt-1">
          Theo dõi các giao dịch mua gói, mua bài phóng sự và tải hóa đơn điện tử
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Chưa có giao dịch nào"
          description="Lịch sử các đơn hàng mua gói hoặc bài viết sẽ hiển thị tại đây."
        />
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Mã đơn hàng</th>
                  <th className="px-4 py-3">Dịch vụ</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-stone-900">
                      {o.orderCode}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate font-medium text-stone-800">
                      {o.targetTitle}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900">
                      {formatCurrency(o.finalAmount)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge type="payment" status={o.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {o.paymentStatus === 'PENDING' && (
                        <Link
                          to={`/checkout/${o.id}`}
                          className="font-bold text-primary-900 hover:underline"
                        >
                          Thanh toán ngay
                        </Link>
                      )}
                      {o.paymentStatus === 'PAID' && o.invoiceNumber && (
                        <span className="text-stone-400 font-mono text-[11px]" title="Mã hóa đơn">
                          {o.invoiceNumber}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
