import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AdBooking, AdSlot, AdCampaign } from '@/features/advertising/types'
import { editorialApi } from '../api'
import { formatCurrency, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Filter,
  Layers,
  Sparkles,
} from 'lucide-react'

export function AdvertisingInventoryCalendarPage() {
  const [bookings, setBookings] = useState<AdBooking[]>([])
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [slots, setSlots] = useState<AdSlot[]>([])
  const [loading, setLoading] = useState(true)

  // Current calendar view month (Default to October 2026 for demo context)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 9, 1)) // Month is 0-indexed (9 = Oct)
  const [selectedSlotId, setSelectedSlotId] = useState<string>('ALL')

  // Selected Day Dialog
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string
    date: Date
    dayBookings: Array<{
      booking: AdBooking
      type: 'ACTIVE' | 'BOOKED' | 'QUOTED' | 'SUBMITTED'
      isConflict?: boolean
    }>
  } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [bData, cData, sData] = await Promise.all([
        editorialApi.getBookings(),
        editorialApi.getCampaigns(),
        editorialApi.getAdSlots(),
      ])
      setBookings(bData)
      setCampaigns(cData)
      setSlots(sData)
    } catch (err: unknown) {
      console.error('Lỗi tải dữ liệu lịch tồn kho:', err)
    } finally {
      setLoading(false)
    }
  }

  // Month navigation
  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const resetToday = () => {
    setCurrentDate(new Date(2026, 9, 1))
  }

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Calculate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const totalDaysInMonth = lastDayOfMonth.getDate()

  // Day of week of first day (0 = Sunday, 1 = Monday, ...) -> adjust for Mon-start (0 = Mon, 6 = Sun)
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7

  // Active slots to track
  const activeSlots = selectedSlotId === 'ALL' ? slots : slots.filter((s) => s.id === selectedSlotId)

  // Check if a booking covers a specific date
  const isDateInBookingRange = (targetDate: Date, startStr: string, endStr: string) => {
    const s = new Date(startStr)
    const e = new Date(endStr)
    s.setHours(0, 0, 0, 0)
    e.setHours(23, 59, 59, 999)
    return targetDate >= s && targetDate <= e
  }

  // Detect conflict on a specific date for a specific slot (Rule 7: Double Booking)
  const getSlotBookingsOnDate = (date: Date, slotId: string) => {
    return bookings.filter((b) => {
      if (b.slotId !== slotId) return false
      if (b.bookingStatus === 'REJECTED' || b.bookingStatus === 'CANCELLED') return false
      return isDateInBookingRange(date, b.startDate, b.endDate)
    })
  }

  // Calculate Monthly Stats
  let totalConflicts = 0
  let totalBookedDays = 0
  let totalHeldDays = 0

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day)
    activeSlots.forEach((slot) => {
      const slotBookings = getSlotBookingsOnDate(d, slot.id)
      if (slotBookings.length > 1 && slot.inventoryMode === 'EXCLUSIVE') {
        totalConflicts++
      }
      if (slotBookings.some((b) => b.bookingStatus === 'CONFIRMED' || b.paymentStatus === 'PAID')) {
        totalBookedDays++
      } else if (slotBookings.some((b) => b.bookingStatus === 'SUBMITTED' || b.bookingStatus === 'QUOTED')) {
        totalHeldDays++
      }
    })
  }

  // Total available slots in month = activeSlots * days
  const totalCapacitySlots = activeSlots.length * totalDaysInMonth
  const occupancyPercent = totalCapacitySlots > 0 ? Math.round(((totalBookedDays + totalHeldDays) / totalCapacitySlots) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Tabs */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-sky-700" />
            Lịch Tồn Kho Quảng Cáo Trực Quan (Inventory Calendar)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Màn II.2.4 (UC017): Giám sát sức chứa các vị trí banner, phát hiện và ngăn chặn trùng lịch đặt chỗ (Rule 7)
          </p>
        </div>

        {/* View Switcher: List vs Calendar */}
        <div className="flex items-center gap-2">
          <Link to="/backoffice/editorial/bookings">
            <Button variant="outline" size="sm" className="text-xs">
              <Building2 className="w-3.5 h-3.5 mr-1" />
              Xem Hàng Đợi Booking
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="text-xs">
            <RotateCcw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Vị trí theo dõi</div>
          <div className="text-xl font-bold mt-1 text-slate-900">{activeSlots.length} vị trí</div>
        </div>

        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 shadow-2xs">
          <div className="text-[11px] font-medium text-emerald-800">Tỷ lệ lấp đầy tháng</div>
          <div className="text-xl font-bold mt-1 text-emerald-700">{occupancyPercent}%</div>
        </div>

        <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/50 shadow-2xs">
          <div className="text-[11px] font-medium text-sky-800">Đã chốt hợp đồng</div>
          <div className="text-xl font-bold mt-1 text-sky-700">{totalBookedDays} slot-ngày</div>
        </div>

        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <div className="text-[11px] font-medium text-amber-800">Đang giữ chỗ (Held)</div>
          <div className="text-xl font-bold mt-1 text-amber-700">{totalHeldDays} slot-ngày</div>
        </div>

        <div
          className={`p-3 rounded-xl border shadow-2xs col-span-2 sm:col-span-1 ${
            totalConflicts > 0
              ? 'border-red-300 bg-red-50 text-red-900 ring-2 ring-red-100'
              : 'border-slate-200 bg-white text-slate-700'
          }`}
        >
          <div className="text-[11px] font-medium flex items-center justify-between">
            <span>Kiểm tra Rule 7</span>
            {totalConflicts > 0 && <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-bounce" />}
          </div>
          <div className={`text-xl font-bold mt-1 ${totalConflicts > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {totalConflicts > 0 ? `${totalConflicts} xung đột` : '✓ Hợp lệ'}
          </div>
        </div>
      </div>

      {/* Control Bar: Month Picker & Slot Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="font-bold text-slate-900 text-sm px-2 min-w-[130px] text-center">
            Tháng {currentMonth + 1} / {currentYear}
          </span>

          <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>

          <button
            onClick={resetToday}
            className="text-[11px] text-sky-700 hover:underline font-semibold ml-1 cursor-pointer"
          >
            Về tháng 10/2026
          </button>
        </div>

        {/* Slot Filter */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">Lọc theo vị trí:</span>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-600"
          >
            <option value="ALL">Tất cả vị trí banner ({slots.length})</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Matrix View */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-[11px] font-bold text-slate-600 uppercase py-2">
          <div>Thứ 2</div>
          <div>Thứ 3</div>
          <div>Thứ 4</div>
          <div>Thứ 5</div>
          <div>Thứ 6</div>
          <div className="text-sky-700">Thứ 7</div>
          <div className="text-red-700">Chủ nhật</div>
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {/* Empty cells before start of month */}
          {Array.from({ length: startDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-slate-50/50 min-h-[95px] p-1.5 opacity-40" />
          ))}

          {/* Month Days */}
          {Array.from({ length: totalDaysInMonth }).map((_, dayIndex) => {
            const dayNum = dayIndex + 1
            const cellDate = new Date(currentYear, currentMonth, dayNum)

            // Gather bookings for this date across activeSlots
            const dayOccupancies: Array<{
              slot: AdSlot
              bookings: AdBooking[]
              isConflict: boolean
            }> = []

            activeSlots.forEach((slot) => {
              const bList = getSlotBookingsOnDate(cellDate, slot.id)
              if (bList.length > 0) {
                const isConflict = bList.length > 1 && slot.inventoryMode === 'EXCLUSIVE'
                dayOccupancies.push({
                  slot,
                  bookings: bList,
                  isConflict,
                })
              }
            })

            const hasConflict = dayOccupancies.some((o) => o.isConflict)

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => {
                  if (dayOccupancies.length > 0) {
                    const allDayBookings: Array<{
                      booking: AdBooking
                      type: 'ACTIVE' | 'BOOKED' | 'QUOTED' | 'SUBMITTED'
                      isConflict?: boolean
                    }> = []

                    dayOccupancies.forEach((occ) => {
                      occ.bookings.forEach((b) => {
                        let t: 'ACTIVE' | 'BOOKED' | 'QUOTED' | 'SUBMITTED' = 'SUBMITTED'
                        if (b.deliveryStatus === 'LIVE') t = 'ACTIVE'
                        else if (b.bookingStatus === 'CONFIRMED' || b.paymentStatus === 'PAID') t = 'BOOKED'
                        else if (b.bookingStatus === 'QUOTED') t = 'QUOTED'

                        allDayBookings.push({
                          booking: b,
                          type: t,
                          isConflict: occ.isConflict,
                        })
                      })
                    })

                    setSelectedDayInfo({
                      dateStr: `${dayNum}/${currentMonth + 1}/${currentYear}`,
                      date: cellDate,
                      dayBookings: allDayBookings,
                    })
                  }
                }}
                className={`min-h-[105px] p-1.5 transition-colors cursor-pointer relative flex flex-col justify-between ${
                  hasConflict
                    ? 'bg-red-50/60 hover:bg-red-50'
                    : dayOccupancies.length > 0
                    ? 'hover:bg-slate-50/80 bg-white'
                    : 'bg-white hover:bg-slate-50/50'
                }`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      hasConflict
                        ? 'bg-red-600 text-white'
                        : dayOccupancies.length > 0
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {hasConflict && (
                    <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1 py-0.2 rounded border border-red-300">
                      Trùng lịch!
                    </span>
                  )}
                </div>

                {/* Slot tags on this date */}
                <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                  {dayOccupancies.slice(0, 3).map((occ, idx) => (
                    <div
                      key={idx}
                      className={`text-[9px] px-1.5 py-0.5 rounded truncate border ${
                        occ.isConflict
                          ? 'bg-red-100 text-red-800 border-red-300 font-bold'
                          : occ.bookings.some((b) => b.deliveryStatus === 'LIVE')
                          ? 'bg-purple-50 text-purple-800 border-purple-200 font-semibold'
                          : occ.bookings.some((b) => b.bookingStatus === 'CONFIRMED' || b.paymentStatus === 'PAID')
                          ? 'bg-sky-50 text-sky-800 border-sky-200 font-semibold'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                      title={`${occ.slot.name}: ${occ.bookings.map((b) => b.companyName).join(', ')}`}
                    >
                      {occ.bookings[0].companyName.split(' ')[0]} • {occ.slot.code.replace('SLOT-', '')}
                    </div>
                  ))}

                  {dayOccupancies.length > 3 && (
                    <div className="text-[9px] text-slate-400 font-semibold pl-1">
                      +{dayOccupancies.length - 3} vị trí khác...
                    </div>
                  )}
                </div>

                {/* Day status indicator */}
                <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-50 flex items-center justify-between">
                  <span>{dayOccupancies.length > 0 ? `${dayOccupancies.length} đặt chỗ` : 'Trống'}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Calendar Legend (Chú giải màu sắc) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-600">Quy ước màu sắc:</span>
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white border border-slate-300" />
            <span className="text-slate-600">Còn trống (Available)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-200 border border-amber-300" />
            <span className="text-slate-700">Đang giữ chỗ / Báo giá (Held / Quoted)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-200 border border-sky-300" />
            <span className="text-slate-700">Đã chốt hợp đồng (Booked / Paid)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-200 border border-purple-300" />
            <span className="text-slate-700">Đang phát trực tiếp (Live Serving)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500 border border-red-600 animate-pulse" />
            <span className="text-red-700 font-bold">Xung đột trùng lịch (Rule 7)</span>
          </div>
        </div>
      </div>

      {/* Selected Day Details Dialog */}
      {selectedDayInfo && (
        <Dialog
          open={!!selectedDayInfo}
          onClose={() => setSelectedDayInfo(null)}
          title={`Chi Tiết Lịch Tồn Kho: Ngày ${selectedDayInfo.dateStr}`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Danh sách các đơn đặt vị trí quảng cáo bao gồm ngày này ({selectedDayInfo.dateStr}):
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {selectedDayInfo.dayBookings.map((item, idx) => {
                const b = item.booking
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs space-y-1 ${
                      item.isConflict
                        ? 'border-red-300 bg-red-50/50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 font-semibold">{b.companyName}</strong>
                      <span className="font-mono text-[11px] text-slate-500">{b.id}</span>
                    </div>

                    <div className="text-slate-600">
                      Vị trí: <strong>{b.slotName}</strong> ({b.slotCode})
                    </div>

                    <div className="text-slate-500 text-[11px]">
                      Thời gian: {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.daysCount} ngày)
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1">
                      <span className="font-bold text-sky-800 font-mono">
                        {formatCurrency(b.finalPrice)}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          b.bookingStatus === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.bookingStatus === 'QUOTED'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.bookingStatus}
                      </span>
                    </div>

                    {item.isConflict && (
                      <div className="text-[11px] text-red-700 font-bold flex items-center gap-1 pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        Cảnh báo: Trùng lịch vị trí độc quyền với đơn khác cùng ngày!
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedDayInfo(null)}>
                Đóng
              </Button>
              <Link to="/backoffice/editorial/bookings">
                <Button size="sm" className="bg-sky-700 hover:bg-sky-800">
                  <Building2 className="w-3.5 h-3.5 mr-1" />
                  Mở Quản Lý Booking
                </Button>
              </Link>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
