import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { financeApi, PAGE_SIZE, type OrderPage } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { PageHeader, Panel, Segmented, tableCls, LoadingBlock, Notice, Pager } from '../components/LedgerUI'

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SUBSCRIPTION', label: 'Gói độc giả' },
  { value: 'ARTICLE_PURCHASE', label: 'Bài lẻ' },
  { value: 'AD_CAMPAIGN', label: 'Quảng cáo' },
]

// Backend chỉ có 4 trạng thái giao dịch này (không có "Đang xác minh")
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Mọi trạng thái' },
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'REFUNDED', label: 'Đã hoàn tiền' },
]

const ORDER_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Gói độc giả',
  ARTICLE_PURCHASE: 'Bài lẻ',
  AD_CAMPAIGN: 'Quảng cáo',
  REFUND: 'Hoàn tiền',
}

// SEPAY: quét QR chuyển khoản. BANK_TRANSFER: bút toán chuyển trả khi hoàn tiền.
const METHOD_LABELS: Record<string, string> = {
  SEPAY: 'QR SePay',
  BANK_TRANSFER: 'Chuyển trả ngân hàng',
}

export function OrderListPage() {
  const [result, setResult] = useState<OrderPage>({ items: [], page: 0, totalPages: 0, totalElements: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [keyword, setKeyword] = useState('') // từ khóa đã gõ xong, gọi server sau 300 ms
  const [page, setPage] = useState(0)

  // Gõ tìm kiếm thì chờ 300 ms rồi mới gọi server
  useEffect(() => {
    const t = setTimeout(() => { setKeyword(search.trim()); setPage(0) }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    loadOrders()
  }, [typeFilter, statusFilter, keyword, page])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await financeApi.getOrdersPage({
        page,
        orderType: typeFilter === 'ALL' ? undefined : typeFilter,
        paymentStatus: statusFilter === 'ALL' ? undefined : statusFilter,
        keyword: keyword || undefined,
      })
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Không tải được danh sách đơn')
    } finally {
      setLoading(false)
    }
  }

  // Đổi bộ lọc thì quay về trang đầu
  const changeType = (v: string) => { setTypeFilter(v); setPage(0) }
  const changeStatus = (v: string) => { setStatusFilter(v); setPage(0) }

  const orders = result.items
  const firstRow = result.totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const lastRow = page * PAGE_SIZE + orders.length

  if (loading && orders.length === 0) return <LoadingBlock rows={8} />

  return (
    <div>
      <PageHeader
        title="Đơn thanh toán"
        sub="Đơn từ mua bài lẻ, gói độc giả và quảng cáo. Trạng thái chỉ đổi khi webhook SePay xác nhận."
      />

      <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Loại đơn"
            value={typeFilter}
            onChange={changeType}
            options={TYPE_OPTIONS}
          />
          <select
            aria-label="Trạng thái thanh toán"
            value={statusFilter}
            onChange={(e) => changeStatus(e.target.value)}
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
            placeholder="Mã đơn hoặc mã giao dịch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/15"
          />
        </label>
      </div>

      {error && <div className="mb-3"><Notice tone="error">{error} <button onClick={loadOrders} className="font-medium underline cursor-pointer">Thử lại</button></Notice></div>}

      <Panel
        title={<span className="num">{result.totalElements} đơn khớp bộ lọc</span>}
        aside={result.totalElements > 0 ? <span className="num text-[13px] text-slate-500">Dòng {firstRow}-{lastRow}</span> : undefined}
        bodyClassName="px-0 pb-1"
      >
        <Pager className="pb-3" page={page} totalPages={result.totalPages} loading={loading} onChange={setPage} />
        {orders.length === 0 ? (
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
                {orders.map((o) => (
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
        <Pager className="border-t border-slate-100 pt-3 pb-2" page={page} totalPages={result.totalPages} loading={loading} onChange={setPage} />
      </Panel>
    </div>
  )
}
