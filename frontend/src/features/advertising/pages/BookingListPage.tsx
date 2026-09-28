import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AdBooking } from '../types'
import { advertisingApi } from '../api'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { PlusCircle, ArrowRight, Calendar } from 'lucide-react'

export function BookingListPage() {
  const [bookings, setBookings] = useState<AdBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const data = await advertisingApi.getMyBookings()
      setBookings(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Danh sách Yêu cầu & Hợp đồng Booking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tiến trình xử lý báo giá, thanh toán và phát sóng quảng cáo
          </p>
        </div>

        <Link to="/advertiser/bookings/new">
          <Button size="sm" className="text-xs font-bold">
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Tạo Booking mới
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã Booking</th>
                <th className="px-4 py-3">Vị trí</th>
                <th className="px-4 py-3">Lịch phát</th>
                <th className="px-4 py-3">Số ngày</th>
                <th className="px-4 py-3">Giá hợp đồng</th>
                <th className="px-4 py-3">Trạng thái Booking</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3">Phân phối</th>
                <th className="px-4 py-3 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{b.id}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{b.slotName}</td>
                  <td className="px-4 py-3.5 text-slate-500">
                    {formatDate(b.startDate)} → {formatDate(b.endDate)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-medium">{b.daysCount} ngày</td>
                  <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(b.finalPrice)}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge type="booking" status={b.bookingStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge type="payment" status={b.paymentStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge type="delivery" status={b.deliveryStatus} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      to={`/advertiser/bookings/${b.id}`}
                      className="text-primary-900 font-bold hover:underline inline-flex items-center"
                    >
                      Chi tiết <ArrowRight className="w-3 h-3 ml-0.5" />
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
