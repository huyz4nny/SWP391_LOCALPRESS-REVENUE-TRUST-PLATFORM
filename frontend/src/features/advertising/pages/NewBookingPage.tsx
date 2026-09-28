import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdSlot } from '../types'
import { advertisingApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Calendar, Building2, CheckCircle2, AlertCircle } from 'lucide-react'

export function NewBookingPage() {
  const [searchParams] = useSearchParams()
  const defaultSlotId = searchParams.get('slotId') || 'slot-top-leaderboard'
  const navigate = useNavigate()
  const currentUser = mockStore.getCurrentUser()

  const [slots, setSlots] = useState<AdSlot[]>([])
  const [slotId, setSlotId] = useState(defaultSlotId)
  const [startDate, setStartDate] = useState('2026-10-01')
  const [endDate, setEndDate] = useState('2026-10-15')
  const [companyName, setCompanyName] = useState(currentUser.companyName || '')
  const [contactPerson, setContactPerson] = useState(currentUser.name || '')
  const [contactPhone, setContactPhone] = useState(currentUser.phone || '0912345678')
  const [contactEmail, setContactEmail] = useState(currentUser.email || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    advertisingApi.getSlots().then(setSlots)
  }, [])

  // Calculate days
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.max(0, end.getTime() - start.getTime())
  const daysCount = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1)

  const selectedSlot = slots.find((s) => s.id === slotId)
  const estimatedPrice = selectedSlot ? selectedSlot.pricePerDay * daysCount : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slotId) return

    setIsSubmitting(true)
    try {
      const booking = await advertisingApi.createBooking({
        slotId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        daysCount,
        companyName,
        contactPerson,
        contactPhone,
        contactEmail,
      })
      navigate(`/advertiser/bookings/${booking.id}`)
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi yêu cầu booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Gửi yêu cầu Đặt vị trí quảng cáo (New Booking)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Chọn vị trí, khoảng thời gian dự kiến và thông tin liên hệ. Tòa soạn sẽ phản hồi báo giá chính thức trong vòng 2 giờ.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Vị trí & Lịch phát dự kiến</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <Label htmlFor="slot" required>Chọn vị trí quảng cáo</Label>
              <select
                id="slot"
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-primary-900"
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.dimensions}) — {formatCurrency(s.pricePerDay)}/ngày
                  </option>
                ))}
              </select>
              {selectedSlot && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedSlot.description} • {selectedSlot.locationNote}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start" required>Ngày bắt đầu</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end" required>Ngày kết thúc</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Price Preview Banner */}
            <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">Thời lượng chiến dịch:</span>
                <span className="text-sm font-bold text-slate-900">{daysCount} ngày phát liên tục</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Dự toán kinh phí chuẩn:</span>
                <span className="text-lg font-black text-primary-950">
                  {formatCurrency(estimatedPrice)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Thông tin pháp nhân Doanh nghiệp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <Label htmlFor="companyName" required>Tên công ty / Tổ chức đặt quảng cáo</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactPerson" required>Người liên hệ</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactPhone" required>Điện thoại liên hệ</Label>
                <Input
                  id="contactPhone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactEmail" required>Email nhận hợp đồng</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full font-bold" isLoading={isSubmitting}>
              Gửi yêu cầu Booking tới Ban Quảng Cáo Tòa Soạn
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
