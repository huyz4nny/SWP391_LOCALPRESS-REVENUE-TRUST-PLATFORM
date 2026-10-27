import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { financeApi } from '../api'
import type { Order } from '../types'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { RefreshCw, ChevronRight } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { PageHeader, Panel, tableCls, LoadingBlock, Notice } from '../components/LedgerUI'

/**
 * Tổng quan tài chính (SV4). Câu hỏi của màn hình: "Hôm nay có khoản nào phòng kế toán cần xử lý?"
 * Khối lớn nhất là doanh thu thực thu kèm biểu đồ theo ngày; bên phải là hàng việc cần làm.
 */

const CHART_DAYS = 14
const DATA_HUE = 'var(--chart-bar)' // màu dữ liệu duy nhất trên màn hình: navy của brand (tối: xanh sáng), chỉ đặt trên cột doanh thu

const ORDER_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Gói độc giả',
  ARTICLE_PURCHASE: 'Bài lẻ',
  AD_CAMPAIGN: 'Quảng cáo',
  TOPUP: 'Nạp ví',
  REFUND: 'Hoàn tiền',
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shortMoney = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr` : v >= 1000 ? `${Math.round(v / 1000)} k` : String(v))

export function FinanceDashboard() {
  const [stats, setStats] = useState<{
    totalRevenue: number
    paidOrdersCount: number
    pendingOrdersCount: number
    refundReviewCount: number
    openComplaintCount: number
    reconciliationDiscrepancy: number
    recentOrders: any[]
  } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      setError('')
      const [data, list] = await Promise.all([financeApi.getDashboard(), financeApi.getOrders().catch(() => [] as Order[])])
      setStats(data)
      setOrders(list)
      setLoadedAt(new Date())
    } catch (e: any) {
      setError(e?.message || 'Không tải được số liệu tài chính')
    } finally {
      setLoading(false)
    }
  }

  // Doanh thu theo ngày, tính từ chính các đơn đã thanh toán. Ngày không có tiền vẫn có cột 0 để thấy khoảng trống.
  const daily = useMemo(() => {
    const paid = orders.filter((o) => o.paymentStatus === 'PAID' && o.createdAt)
    if (paid.length === 0) return { rows: [] as { day: string; label: string; revenue: number }[], total: 0, end: null as Date | null }
    const end = new Date(Math.max(...paid.map((o) => Date.parse(o.updatedAt || o.createdAt))))
    const sums = new Map<string, number>()
    paid.forEach((o) => {
      const k = dayKey(new Date(o.updatedAt || o.createdAt))
      sums.set(k, (sums.get(k) || 0) + o.finalAmount)
    })
    const rows = Array.from({ length: CHART_DAYS }, (_, i) => {
      const d = new Date(end)
      d.setDate(end.getDate() - (CHART_DAYS - 1 - i))
      return { day: dayKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, revenue: sums.get(dayKey(d)) || 0 }
    })
    return { rows, total: rows.reduce((a, r) => a + r.revenue, 0), end }
  }, [orders])

  if (loading && !stats) return <LoadingBlock rows={6} />

  if (error || !stats) {
    return (
      <>
        <PageHeader title="Tổng quan tài chính" />
        <Notice tone="error">
          {error || 'Không có dữ liệu.'}{' '}
          <button onClick={loadDashboard} className="font-medium underline cursor-pointer">Thử lại</button>
        </Notice>
      </>
    )
  }

  const todo = [
    {
      label: 'Đề xuất hoàn tiền chờ duyệt',
      value: `${stats.refundReviewCount}`,
      note: 'Kế toán trưởng duyệt, người lập không tự duyệt',
      to: '/backoffice/finance/refunds',
      action: 'Duyệt',
      urgent: stats.refundReviewCount > 0,
    },
    {
      label: 'Đơn chờ thanh toán',
      value: `${stats.pendingOrdersCount}`,
      note: 'Chờ webhook SePay xác nhận',
      to: '/backoffice/finance/orders',
      action: 'Xem đơn',
      urgent: false,
    },
    {
      label: 'Chênh lệch đối soát kỳ này',
      value: formatCurrency(stats.reconciliationDiscrepancy),
      note: stats.reconciliationDiscrepancy === 0 ? 'Sổ hệ thống khớp sao kê' : 'Hệ thống lệch với sao kê ngân hàng',
      to: '/backoffice/finance/reconciliation',
      action: 'Đối soát',
      urgent: stats.reconciliationDiscrepancy !== 0,
    },
    {
      label: 'Khiếu nại chuyển khoản',
      value: `${stats.openComplaintCount}`,
      note: 'Khách báo đã chuyển nhưng chưa được ghi nhận',
      to: '/backoffice/finance/complaints',
      action: 'Mở hàng chờ',
      urgent: stats.openComplaintCount > 0,
    },
  ]

  const finding = [
    stats.refundReviewCount > 0 && `${stats.refundReviewCount} đề xuất hoàn tiền đang chờ duyệt`,
    stats.reconciliationDiscrepancy !== 0 && `đối soát lệch ${formatCurrency(stats.reconciliationDiscrepancy)}`,
  ].filter(Boolean) as string[]

  return (
    <div>
      <PageHeader
        title="Tổng quan tài chính"
        sub={
          finding.length > 0
            ? `Cần xử lý: ${finding.join(', ')}.`
            : 'Không có khoản nào đang chờ kế toán xử lý.'
        }
        actions={
          <>
            {loadedAt && (
              <span className="text-[13px] text-slate-500 num">
                Cập nhật {loadedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={loadDashboard} isLoading={loading}>
              {!loading && <RefreshCw className="h-3.5 w-3.5" />}
              Làm mới
            </Button>
          </>
        }
      />

      {/* Lưới 3 cột, gap 16: doanh thu chiếm 2 cột, việc cần làm 1 cột; bảng giao dịch trải hết 3 cột */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" bodyClassName="pt-0">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 pt-4">
            <div>
              <h2 className="text-[13px] text-slate-500">Doanh thu thực thu</h2>
              <div className="mt-1 text-[32px] font-semibold leading-10 tracking-[-0.01em] text-slate-900 num">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="mt-0.5 text-[13px] text-slate-500">
                từ <span className="text-slate-900 num">{stats.paidOrdersCount}</span> đơn đã thanh toán
              </div>
            </div>
            {daily.end && (
              <div className="text-right text-[13px] text-slate-500">
                {CHART_DAYS} ngày đến {daily.end.getDate()}/{daily.end.getMonth() + 1}
                <div className="text-base font-semibold text-slate-900 num">{formatCurrency(daily.total)}</div>
              </div>
            )}
          </div>

          <div className="mt-5 h-[200px] w-full">
            {daily.rows.length === 0 ? (
              <div className="flex h-full items-end border-b-2 border-slate-300 pb-2 text-[13px] text-slate-500">
                Chưa có đơn nào được thanh toán.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily.rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
                    tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                    interval={1}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tick={{ fontSize: 12, fill: 'var(--chart-tick)' }}
                    tickFormatter={shortMoney}
                    tickCount={5}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--slate-100))' }}
                    contentStyle={{ border: '1px solid rgb(var(--slate-200))', background: 'rgb(var(--surface))', color: 'rgb(var(--slate-900))', borderRadius: 6, boxShadow: 'none', fontSize: 13, padding: '6px 10px' }}
                    labelFormatter={(l) => `Ngày ${l}`}
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Doanh thu']}
                  />
                  <Bar dataKey="revenue" fill={DATA_HUE} radius={[2, 2, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Việc cần xử lý" bodyClassName="px-0 pb-1">
          <ul>
            {todo.map((t) => (
              <li key={t.label} className="border-t border-slate-100">
                <Link to={t.to} className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-900">{t.label}</div>
                    <div className="truncate text-[13px] text-slate-500">{t.note}</div>
                  </div>
                  {t.value !== null && (
                    <span className={`flex-none text-base font-semibold num ${t.urgent ? 'text-negative' : 'text-slate-900'}`}>
                      {t.value}
                    </span>
                  )}
                  <span className="flex flex-none items-center text-[13px] font-medium text-primary-900">
                    {t.action}
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          className="xl:col-span-3"
          title="Giao dịch gần đây"
          aside={
            <Link to="/backoffice/finance/orders" className="font-medium text-primary-900 hover:underline">
              Xem tất cả đơn
            </Link>
          }
          bodyClassName="px-0 pb-1"
        >
          {stats.recentOrders.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-slate-500">Chưa có giao dịch nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>Mã đơn</th>
                    <th className={tableCls.th}>Khách hàng</th>
                    <th className={tableCls.th}>Dịch vụ</th>
                    <th className={tableCls.th}>Thời gian</th>
                    <th className={tableCls.th}>Trạng thái</th>
                    <th className={tableCls.thNum}>Số tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.slice(0, 6).map((o: any) => (
                    <tr key={o.id} className={tableCls.tr}>
                      <td className={tableCls.td}>
                        <Link to={`/backoffice/finance/orders/${o.id}`} className={`${tableCls.code} hover:text-primary-900 hover:underline`}>
                          {o.orderCode}
                        </Link>
                      </td>
                      <td className={`${tableCls.td} text-slate-900`}>{o.userName}</td>
                      <td className={`${tableCls.td} max-w-[280px]`}>
                        <div className="truncate">{o.targetTitle}</div>
                        <div className="text-xs text-slate-500">{ORDER_TYPE_LABELS[o.orderType] || o.orderType}</div>
                      </td>
                      <td className={`${tableCls.td} whitespace-nowrap num`}>{formatDateTime(o.createdAt)}</td>
                      <td className={tableCls.td}>
                        <StatusBadge type="payment" status={o.paymentStatus} />
                      </td>
                      <td className={`${tableCls.tdNum} font-semibold`}>{formatCurrency(o.finalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
