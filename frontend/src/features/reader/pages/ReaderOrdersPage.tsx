// Tác dụng: trang `/account/orders` (UC045) — gọi GET /finance/orders/me của Huy, không đọc thẳng transactions.
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { httpClient } from '@/lib/http/client'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Receipt } from 'lucide-react'

// một đơn trong GET /finance/orders/me của SV4
interface MyOrder {
  transactionId: number | string
  orderCode: string
  orderType: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  isPaid: boolean
  expired?: boolean
  amount: number
  paymentMethod?: string
  createdAt: string
  paidAt?: string
  description?: string
  targetId?: number | string
}

interface MyOrdersResponse {
  data?: {
    content?: MyOrder[]
    totalPages?: number
    number?: number
  }
}

const PAGE_SIZE = 20

// UC045 lịch sử giao dịch của độc giả ở màn hình II.3.10
// luồng đi là trang này gọi GET /finance/orders/me của SV4 -> backend lấy user từ phiên đăng nhập -> trả Page đơn mới nhất trước
export function ReaderOrdersPage() {
  const currentUser = mockStore.getCurrentUser()
  const [orders, setOrders] = useState<MyOrder[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadOrders(page)
  }, [currentUser.id, page])

  const loadOrders = async (pageToLoad: number) => {
    try {
      setLoading(true)
      setError('')
      const res = await httpClient.get<MyOrdersResponse>('/finance/orders/me', {
        params: { page: pageToLoad, size: PAGE_SIZE },
      })
      setOrders(res?.data?.content ?? [])
      setTotalPages(res?.data?.totalPages ?? 0)
    } catch (err) {
      // lỗi mạng hoặc chưa đăng nhập thì báo lỗi thay vì để trang trắng
      setOrders([])
      setError(err instanceof Error ? err.message : 'Không tải được lịch sử giao dịch')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* tieu de trang don hang */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Lịch sử giao dịch & Hóa đơn</h2>
        <p className="text-xs text-stone-500 mt-1">
          Theo dõi các giao dịch mua gói, mua bài phóng sự và tải hóa đơn điện tử
        </p>
      </div>

      {error && (
        <p className="text-xs text-crimson border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-xs text-stone-500">Đang tải lịch sử giao dịch...</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12 text-stone-300 mx-auto mb-3" />}
          title="Chưa có giao dịch nào"
          description="Lịch sử các đơn hàng mua gói hoặc bài viết sẽ hiển thị tại đây."
        />
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
          {/* bang don: ma, dich vu, tien, thoi gian, trang thai, thao tac */}
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
                {/* vong lap for lay tung dong de display ls giao dich */}
                {orders.map((o) => (
                  <tr key={o.orderCode} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-stone-900">
                      {o.orderCode}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate font-medium text-stone-800">
                      {o.description || o.orderType}
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-900">
                      {formatCurrency(o.amount)}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {formatDateTime(o.paidAt ?? o.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge type="payment" status={o.expired && o.status === 'PENDING' ? 'EXPIRED' : o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* chỉ đơn còn chờ và chưa hết hạn mới cho thanh toán tiếp ở trang thanh toán chung của SV4 */}
                      {o.status === 'PENDING' && !o.isPaid && !o.expired && (
                        <Link
                          to={`/payment/${o.orderCode}`}
                          className="font-bold text-primary-900 hover:underline"
                        >
                          Thanh toán ngay
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          {/* hang nut Trang truoc / Trang sau */}
          <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>
            Trang trước
          </Button>
          <span className="text-stone-500">
            Trang {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => setPage(page + 1)}>
            Trang sau
          </Button>
        </div>
      )}
    </div>
  )
}
