import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Order } from '../types'
import { financeApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Search } from 'lucide-react'
import { PageHeader, Panel, Segmented, tableCls, LoadingBlock, Notice } from '../components/LedgerUI'

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SUBSCRIPTION', label: 'Gói độc giả' },
  { value: 'ARTICLE_PURCHASE', label: 'Bài lẻ' },
  { value: 'AD_CAMPAIGN', label: 'Quảng cáo' },
  { value: 'TOPUP', label: 'Nạp ví' },
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'PROCESSING', label: 'Đang xác minh' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
]

const ORDER_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Gói độc giả',
  ARTICLE_PURCHASE: 'Bài lẻ',
  AD_CAMPAIGN: 'Quảng cáo',
  TOPUP: 'Nạp ví',
  REFUND: 'Hoàn tiền',
}

// Chỉ còn 2 cách trả: quét QR SePay hoặc trừ Ví LocalPress. Mã lạ (dữ liệu cũ) hiện nguyên văn.
const METHOD_LABELS: Record<string, string> = {
  SEPAY: 'QR SePay',
  WALLET: 'Ví LocalPress',
}

export function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await financeApi.getOrders()
      setOrders(data)
    } catch (e: any) {
      setError(e?.message || 'Không tải được danh sách đơn')
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

  // Số đếm trên bộ lọc loại đơn tính theo trạng thái đang chọn
  const typeCounts = useMemo(() => {
    const scoped = orders.filter((o) => statusFilter === 'ALL' || o.paymentStatus === statusFilter)
    return Object.fromEntries(
      TYPE_OPTIONS.map((t) => [t.value, t.value === 'ALL' ? scoped.length : scoped.filter((o) => o.orderType === t.value).length])
    )
  }, [orders, statusFilter])

  const filteredTotal = filteredOrders.reduce((acc, o) => acc + o.finalAmount, 0)

  if (loading && orders.length === 0) return <LoadingBlock rows={8} />

  return (
    <div>
      <PageHeader
        title="Đơn thanh toán"
        sub="Đơn từ mua bài lẻ, gói độc giả và quảng cáo. Trạng thái chỉ đổi khi webhook SePay hoặc thanh toán ví xác nhận."
      />

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Loại đơn"
            value={typeFilter}
            onChange={setTypeFilter}
            options={TYPE_OPTIONS.map((t) => ({ ...t, count: typeCounts[t.value] }))}
          />
          <select
            aria-label="Trạng thái thanh toán"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900 hover:border-slate-400 cursor-pointer"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <label className="relative block w-full lg:w-72">
          <span className="sr-only">Tìm đơn</span>
          <Search className="pointer-events-none absolute left-3 top-2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Mã đơn, khách hàng, dịch vụ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/15"
          />
        </label>
      </div>

      {error && <div className="mb-3"><Notice tone="error">{error} <button onClick={loadOrders} className="font-medium underline cursor-pointer">Thử lại</button></Notice></div>}

      <Panel
        title={<span className="num">{filteredOrders.length} / {orders.length} đơn{orders.length >= 100 ? ' mới nhất' : ''}</span>}
        aside={<span>Tổng <span className="font-semibold text-slate-900 num">{formatCurrency(filteredTotal)}</span></span>}
        bodyClassName="px-0 pb-1"
      >
        {filteredOrders.length === 0 ? (
          <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Không có đơn nào khớp bộ lọc.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Mã đơn</th>
                  <th className={tableCls.th}>Khách hàng</th>
                  <th className={tableCls.th}>Dịch vụ</th>
                  <th className={tableCls.th}>Tạo lúc</th>
                  <th className={tableCls.th}>Trạng thái</th>
                  <th className={tableCls.thNum}>Số tiền</th>
                  <th className={tableCls.th}><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className={tableCls.tr}>
                    <td className={tableCls.td}>
                      <span className={tableCls.code}>{o.orderCode}</span>
                    </td>
                    <td className={`${tableCls.td} whitespace-nowrap`}>
                      <div className="text-slate-900">{o.userName}</div>
                      <div className="max-w-[200px] truncate text-xs text-slate-500">{o.userEmail}</div>
                    </td>
                    <td className={`${tableCls.td} max-w-[300px]`}>
                      <div className="truncate">{o.targetTitle}</div>
                      <div className="truncate text-xs text-slate-500">
                        {ORDER_TYPE_LABELS[o.orderType] || o.orderType}
                        {' · '}
                        {o.paymentMethod ? METHOD_LABELS[o.paymentMethod] || o.paymentMethod : 'chưa chọn phương thức'}
                      </div>
                    </td>
                    <td className={`${tableCls.td} whitespace-nowrap num`}>{formatDateTime(o.createdAt)}</td>
                    <td className={tableCls.td}>
                      <StatusBadge type="payment" status={o.paymentStatus} />
                    </td>
                    <td className={`${tableCls.tdNum} font-semibold`}>{formatCurrency(o.finalAmount)}</td>
                    <td className={`${tableCls.td} text-right`}>
                      <Link
                        to={`/backoffice/finance/orders/${o.id}`}
                        className="whitespace-nowrap text-[13px] font-medium text-primary-900 hover:underline"
                      >
                        {o.paymentStatus === 'PROCESSING' ? 'Xác minh' : 'Chi tiết'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
