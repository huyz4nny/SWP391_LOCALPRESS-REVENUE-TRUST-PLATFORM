import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Order } from '../types'
import { financeApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DollarSign, ArrowRight, Search, Filter } from 'lucide-react'

export function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await financeApi.getOrders()
      setOrders(data)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (typeFilter !== 'ALL' && o.orderType !== typeFilter) return false
    if (statusFilter !== 'ALL' && o.paymentStatus !== statusFilter) return false
    if (
      search &&
      !o.orderCode.toLowerCase().includes(search.toLowerCase()) &&
      !o.userName.toLowerCase().includes(search.toLowerCase()) &&
      !o.targetTitle.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Danh sách Đơn hàng & Quản lý Thu Tiền
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Kiểm tra các giao dịch thanh toán tự động (VietQR/MoMo) và đối chiếu chuyển khoản ngân hàng thủ công
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-500">Phân loại:</span>
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'SUBSCRIPTION', label: 'Gói Độc Giả' },
            { id: 'ARTICLE_PURCHASE', label: 'Mua bài lẻ' },
            { id: 'AD_CAMPAIGN', label: 'Quảng cáo B2B' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTypeFilter(item.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === item.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          <span className="font-semibold text-slate-500">Trạng thái:</span>
          {['ALL', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'PENDING' && 'Chờ TT'}
              {st === 'PROCESSING' && 'Đang xác minh'}
              {st === 'PAID' && 'Đã thanh toán'}
              {st === 'FAILED' && 'Thất bại'}
              {st === 'REFUNDED' && 'Đã hoàn tiền'}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Input
              placeholder="Tìm theo mã đơn, khách hàng, tên gói..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <span className="text-slate-400 text-xs font-medium">
            Hiển thị {filteredOrders.length} / {orders.length} đơn hàng
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Loại dịch vụ</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Phương thức</th>
                <th className="px-4 py-3">Thời gian tạo</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.orderCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{o.userName}</div>
                    <div className="text-[10px] text-slate-400">{o.userEmail}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 max-w-xs truncate">
                    {o.targetTitle}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {formatCurrency(o.finalAmount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                    {o.paymentMethod || 'Chưa chọn'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge type="payment" status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/backoffice/finance/orders/${o.id}`}
                      className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                        o.paymentStatus === 'PROCESSING'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                          : 'text-primary-900 hover:underline'
                      }`}
                    >
                      {o.paymentStatus === 'PROCESSING' ? 'Xác minh ngay' : 'Chi tiết'}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
