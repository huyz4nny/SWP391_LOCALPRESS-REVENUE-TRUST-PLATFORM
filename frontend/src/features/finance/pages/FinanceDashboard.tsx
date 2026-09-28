import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { financeApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  Clock,
  RotateCcw,
  Scale,
  ArrowRight,
  Receipt,
  FileCheck,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

export function FinanceDashboard() {
  const [stats, setStats] = useState<{
    totalRevenue: number
    paidOrdersCount: number
    pendingOrdersCount: number
    refundReviewCount: number
    reconciliationDiscrepancy: number
    recentOrders: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const data = await financeApi.getDashboard()
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  const revenueData = [
    { name: '01-05/09', revenue: 30000000 },
    { name: '06-10/09', revenue: 159000 },
    { name: '11-15/09', revenue: 499000 },
    { name: '16-20/09', revenue: 15000 },
    { name: '21-25/09', revenue: 24000000 },
    { name: '26-27/09', revenue: 74000 },
  ]

  if (loading || !stats) {
    return <div className="py-12 text-center animate-pulse">Đang tải báo cáo tài chính...</div>
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Tổng quan Kế toán & Quản trị Doanh thu (SV4)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi dòng tiền B2C (Paywall gói & bài lẻ) và B2B (Quảng cáo doanh nghiệp), kiểm soát đối soát
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tổng doanh thu thực thu</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> {stats.paidOrdersCount} đơn thanh toán thành công
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đơn chờ xác minh CK</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            {stats.pendingOrdersCount} đơn
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <Link to="/backoffice/finance/orders" className="text-primary-900 underline font-medium">
              Vào đối chiếu biên lai →
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Yêu cầu hoàn tiền chờ duyệt</span>
            <RotateCcw className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-600">
            {stats.refundReviewCount} yêu cầu
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <Link to="/backoffice/finance/refunds" className="text-red-700 underline font-medium">
              Xem xét phê duyệt →
            </Link>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Chênh lệch đối soát kỳ</span>
            <Scale className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(stats.reconciliationDiscrepancy)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <Link to="/backoffice/finance/reconciliation" className="text-purple-700 underline font-medium">
              Kỳ tháng 09/2026 →
            </Link>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown Chart */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Doanh thu tích lũy Tháng 09/2026 theo đợt</h3>
            <p className="text-xs text-slate-500 mt-0.5">Phân bổ nguồn thu giữa Quảng cáo doanh nghiệp B2B và Paywall độc giả B2C</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" name="Doanh thu" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders quick table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Giao dịch phát sinh gần đây</h3>
          <Link to="/backoffice/finance/orders" className="text-xs text-primary-900 font-semibold hover:underline">
            Toàn bộ danh sách đơn →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Mã đơn</th>
                <th className="px-3 py-2.5">Người mua / Đối tác</th>
                <th className="px-3 py-2.5">Dịch vụ</th>
                <th className="px-3 py-2.5">Số tiền</th>
                <th className="px-3 py-2.5">Thời gian</th>
                <th className="px-3 py-2.5">Trạng thái</th>
                <th className="px-3 py-2.5 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentOrders.map((o: any) => (
                <tr key={o.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3 font-mono font-bold text-slate-900">{o.orderCode}</td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-slate-800">{o.userName}</span>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-700 max-w-xs truncate">{o.targetTitle}</td>
                  <td className="px-3 py-3 font-bold text-slate-900">{formatCurrency(o.finalAmount)}</td>
                  <td className="px-3 py-3 text-slate-500">{formatDateTime(o.createdAt)}</td>
                  <td className="px-3 py-3">
                    <StatusBadge type="payment" status={o.paymentStatus} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      to={`/backoffice/finance/orders/${o.id}`}
                      className="text-primary-900 font-bold hover:underline"
                    >
                      Kiểm tra
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
