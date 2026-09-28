import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { AdBooking, AdCampaign } from '../types'
import { advertisingApi } from '../api'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Megaphone,
  Eye,
  MousePointerClick,
  Percent,
  PlusCircle,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

export function AdvertiserDashboard() {
  const currentUser = mockStore.getCurrentUser()
  const [bookings, setBookings] = useState<AdBooking[]>([])
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [currentUser.id])

  const loadData = async () => {
    try {
      setLoading(true)
      const bData = await advertisingApi.getMyBookings()
      setBookings(bData)
      const allCamps = mockStore.getState().campaigns.filter((c) => c.advertiserId === currentUser.id)
      setCampaigns(allCamps)
    } finally {
      setLoading(false)
    }
  }

  // Aggregate stats
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0)
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0)
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
  const liveCampaignsCount = bookings.filter((b) => b.deliveryStatus === 'LIVE').length

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Tổng quan chiến dịch quảng cáo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đối tác: <strong className="text-slate-800">{currentUser.companyName}</strong> (Mã: {currentUser.companyId})
          </p>
        </div>

        <Link to="/advertiser/bookings/new">
          <Button className="text-xs font-bold">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Đặt vị trí quảng cáo mới (Booking)
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Đang phát (LIVE)</span>
            <Megaphone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{liveCampaignsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Vị trí hoạt động</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Lượt hiển thị (Imp.)</span>
            <Eye className="w-4 h-4 text-primary-900" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalImpressions.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> +12.4% so với tuần trước
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Lượt nhấp (Clicks)</span>
            <MousePointerClick className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalClicks.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Lượt chuyển đổi về web</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Tỷ lệ CTR trung bình</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{avgCtr}%</div>
          <div className="text-[11px] text-slate-400 mt-1">Chuẩn hiển thị báo chí địa phương</div>
        </div>
      </div>

      {/* Bookings / Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Danh sách các Booking của Doanh nghiệp</h2>
          <Link to="/advertiser/bookings" className="text-xs text-primary-900 font-semibold hover:underline">
            Xem tất cả ({bookings.length})
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Chưa có booking nào. Bấm "Đặt vị trí mới" để bắt đầu gửi yêu cầu lên tòa soạn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">Mã Booking</th>
                  <th className="px-3 py-2.5">Vị trí quảng cáo</th>
                  <th className="px-3 py-2.5">Thời hạn</th>
                  <th className="px-3 py-2.5">Báo giá</th>
                  <th className="px-3 py-2.5">Xử lý</th>
                  <th className="px-3 py-2.5">Thanh toán</th>
                  <th className="px-3 py-2.5">Phân phối</th>
                  <th className="px-3 py-2.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-3 font-mono font-bold text-slate-900">{b.id}</td>
                    <td className="px-3 py-3 font-medium text-slate-800">{b.slotName}</td>
                    <td className="px-3 py-3 text-slate-500">
                      {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.daysCount} ngày)
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {formatCurrency(b.finalPrice)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge type="booking" status={b.bookingStatus} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge type="payment" status={b.paymentStatus} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge type="delivery" status={b.deliveryStatus} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        to={`/advertiser/bookings/${b.id}`}
                        className="text-primary-900 font-bold hover:underline inline-flex items-center"
                      >
                        Quản lý <ArrowRight className="w-3 h-3 ml-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
