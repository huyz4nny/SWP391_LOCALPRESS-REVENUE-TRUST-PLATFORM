import React, { useState, useEffect } from 'react'
import { AdBooking } from '@/features/advertising/types'
import { editorialApi } from '../api'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Calendar, DollarSign, Send, CheckCircle2, Clock } from 'lucide-react'

export function BookingManagementPage() {
  const [bookings, setBookings] = useState<AdBooking[]>([])
  const [loading, setLoading] = useState(true)

  // Quotation dialog
  const [selectedBooking, setSelectedBooking] = useState<AdBooking | null>(null)
  const [finalPrice, setFinalPrice] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [quotationNotes, setQuotationNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const data = await editorialApi.getBookings()
      setBookings(data)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenQuotation = (b: AdBooking) => {
    setSelectedBooking(b)
    setFinalPrice(b.finalPrice || b.standardPrice)
    setDiscountPercent(b.discountPercent || 0)
    setQuotationNotes(b.quotationNotes || `Báo giá chính thức vị trí ${b.slotName} cho thời lượng ${b.daysCount} ngày.`)
  }

  const handleSendQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBooking) return

    setIsSubmitting(true)
    try {
      await editorialApi.sendQuotation(
        selectedBooking.id,
        Number(finalPrice),
        Number(discountPercent),
        quotationNotes
      )
      setSelectedBooking(null)
      loadBookings()
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi báo giá')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Điều hành Booking & Báo giá Quảng cáo
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tiếp nhận đơn đặt chỗ từ doanh nghiệp, kiểm tra lịch trống và ban hành báo giá chính thức
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Mã đơn</th>
              <th className="px-4 py-3">Doanh nghiệp</th>
              <th className="px-4 py-3">Vị trí</th>
              <th className="px-4 py-3">Lịch dự kiến</th>
              <th className="px-4 py-3">Kinh phí</th>
              <th className="px-4 py-3">Tiến trình</th>
              <th className="px-4 py-3">Thanh toán</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{b.id}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800">{b.companyName}</div>
                  <div className="text-[10px] text-slate-400">{b.contactPerson} ({b.contactPhone})</div>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{b.slotName}</td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.daysCount} ngày)
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(b.finalPrice)}</td>
                <td className="px-4 py-3">
                  <StatusBadge type="booking" status={b.bookingStatus} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge type="payment" status={b.paymentStatus} />
                </td>
                <td className="px-4 py-3 text-right">
                  {b.bookingStatus === 'SUBMITTED' ? (
                    <Button
                      size="sm"
                      onClick={() => handleOpenQuotation(b)}
                      className="text-xs font-bold bg-sky-700 hover:bg-sky-800"
                    >
                      <DollarSign className="w-3.5 h-3.5 mr-1" />
                      Gửi báo giá
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenQuotation(b)}
                      className="text-xs"
                    >
                      Xem / Cập nhật
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quotation Dialog */}
      {selectedBooking && (
        <Dialog
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Soạn Thảo Báo Giá & Điều Khoản: ${selectedBooking.id}`}
        >
          <form onSubmit={handleSendQuotation} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-200 space-y-1">
              <div>Khách hàng: <strong>{selectedBooking.companyName}</strong></div>
              <div>Vị trí: <strong>{selectedBooking.slotName}</strong></div>
              <div>Thời gian: <strong>{selectedBooking.daysCount} ngày</strong> ({formatDate(selectedBooking.startDate)} - {formatDate(selectedBooking.endDate)})</div>
              <div>Đơn giá niêm yết chuẩn: <strong>{formatCurrency(selectedBooking.standardPrice)}</strong></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="disc">Chiết khấu (%)</Label>
                <Input
                  id="disc"
                  type="number"
                  value={discountPercent}
                  onChange={(e) => {
                    const d = Number(e.target.value)
                    setDiscountPercent(d)
                    setFinalPrice(Math.round(selectedBooking.standardPrice * (1 - d / 100)))
                  }}
                  min={0}
                  max={50}
                />
              </div>

              <div>
                <Label htmlFor="price" required>Giá chốt hợp đồng (VND)</Label>
                <Input
                  id="price"
                  type="number"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Điều khoản & Ghi chú kỹ thuật</Label>
              <Textarea
                id="notes"
                rows={3}
                value={quotationNotes}
                onChange={(e) => setQuotationNotes(e.target.value)}
                placeholder="Cam kết hiển thị, thời hạn thanh toán..."
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                Đóng
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-sky-700 hover:bg-sky-800">
                <Send className="w-3.5 h-3.5 mr-1" />
                Gửi Báo Giá tới Khách Hàng
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
