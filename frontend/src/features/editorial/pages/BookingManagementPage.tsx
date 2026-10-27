import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AdBooking, BookingStatus } from '@/features/advertising/types'
import { editorialApi } from '../api'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import {
  Calendar,
  DollarSign,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Search,
  Building2,
  Phone,
  Mail,
  AlertTriangle,
  RotateCcw,
  FileText,
  Ban,
  Check,
} from 'lucide-react'

export function BookingManagementPage() {
  const [bookings, setBookings] = useState<AdBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')

  // Detail Dialog
  const [detailBooking, setDetailBooking] = useState<AdBooking | null>(null)

  // Quotation Dialog (UC018)
  const [selectedBooking, setSelectedBooking] = useState<AdBooking | null>(null)
  const [finalPrice, setFinalPrice] = useState<number>(0)
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [quotationNotes, setQuotationNotes] = useState<string>('')
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false)

  // Rejection Dialog (UC016)
  const [rejectTarget, setRejectTarget] = useState<AdBooking | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [isSubmittingReject, setIsSubmittingReject] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const data = await editorialApi.getBookings()
      setBookings(data)
    } catch (err: unknown) {
      console.error('Không tải được danh sách booking:', err)
    } finally {
      setLoading(false)
    }
  }

  // Mở modal Báo giá (UC018)
  const handleOpenQuotation = (b: AdBooking) => {
    setSelectedBooking(b)
    setFinalPrice(b.finalPrice || b.standardPrice)
    setDiscountPercent(b.discountPercent || 0)
    setQuotationNotes(
      b.quotationNotes ||
        `Báo giá chính thức vị trí ${b.slotName} cho thời lượng ${b.daysCount} ngày. Cam kết tỉ lệ hiển thị (SOV) 100% theo đúng hợp đồng.`
    )
  }

  const handleSendQuotation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBooking) return

    setIsSubmittingQuote(true)
    try {
      await editorialApi.sendQuotation(
        selectedBooking.id,
        Number(finalPrice),
        Number(discountPercent),
        quotationNotes
      )
      setSelectedBooking(null)
      await loadBookings()
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi báo giá')
    } finally {
      setIsSubmittingQuote(false)
    }
  }

  // Mở modal Từ chối booking (UC016)
  const handleOpenReject = (b: AdBooking) => {
    setRejectTarget(b)
    setRejectionReason('')
  }

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectTarget || !rejectionReason.trim()) return

    setIsSubmittingReject(true)
    try {
      await editorialApi.rejectBooking(rejectTarget.id, rejectionReason.trim())
      setRejectTarget(null)
      await loadBookings()
    } catch (err: any) {
      alert(err.message || 'Lỗi từ chối booking')
    } finally {
      setIsSubmittingReject(false)
    }
  }

  // Các lý do từ chối mẫu
  const PRESET_REASONS = [
    'Vị trí slot đã được đặt kín lịch trong thời gian yêu cầu.',
    'Ngành hàng quảng cáo không phù hợp với tôn chỉ mục đích của báo.',
    'Thông tin doanh nghiệp chưa đầy đủ hoặc không liên lạc được qua số điện thoại cung cấp.',
    'Thời lượng đặt chỗ dưới mức tối thiểu quy định cho chuyên mục này.',
  ]

  // KPI đếm số lượng
  const totalCount = bookings.length
  const submittedCount = bookings.filter((b) => b.bookingStatus === 'SUBMITTED').length
  const quotedCount = bookings.filter((b) => b.bookingStatus === 'QUOTED').length
  const confirmedCount = bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length
  const rejectedCount = bookings.filter((b) => b.bookingStatus === 'REJECTED').length

  // Danh sách đã lọc
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.bookingStatus !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchId = b.id.toLowerCase().includes(q)
      const matchCompany = b.companyName.toLowerCase().includes(q)
      const matchSlot = b.slotName.toLowerCase().includes(q)
      const matchPerson = b.contactPerson?.toLowerCase().includes(q)
      if (!matchId && !matchCompany && !matchSlot && !matchPerson) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-700" />
            Hàng Đợi Xử Lý Booking & Báo Giá Quảng Cáo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình B2B: Doanh nghiệp gửi đơn (SUBMITTED) → Tòa soạn thẩm định & Báo giá (QUOTED) → Khách chốt & Thanh toán
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/backoffice/editorial/calendar">
            <Button variant="outline" size="sm" className="text-xs bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100 font-semibold">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Lịch Tồn Kho Slot (UC017)
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={loadBookings}
            className="text-xs"
            disabled={loading}
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80">Tất cả đơn</div>
          <div className="text-xl font-bold mt-1">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('SUBMITTED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'SUBMITTED'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50/50 text-amber-900 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90 flex items-center justify-between">
            <span>Chờ xử lý</span>
            {submittedCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <div className="text-xl font-bold mt-1 text-amber-700">{submittedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('QUOTED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'QUOTED'
              ? 'bg-sky-700 text-white border-sky-700 shadow-sm'
              : 'bg-sky-50/50 text-sky-900 border-sky-200 hover:border-sky-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90">Đã báo giá</div>
          <div className="text-xl font-bold mt-1 text-sky-700">{quotedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('CONFIRMED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'CONFIRMED'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-emerald-50/50 text-emerald-900 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90">Khách đã chốt</div>
          <div className="text-xl font-bold mt-1 text-emerald-700">{confirmedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'REJECTED'
              ? 'bg-red-700 text-white border-red-700 shadow-sm'
              : 'bg-red-50/50 text-red-900 border-red-200 hover:border-red-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90">Đã từ chối</div>
          <div className="text-xl font-bold mt-1 text-red-700">{rejectedCount}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-500 mr-1">Bộ lọc:</span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'SUBMITTED', label: 'Chờ duyệt' },
            { key: 'QUOTED', label: 'Đã báo giá' },
            { key: 'CONFIRMED', label: 'Đã chốt' },
            { key: 'REJECTED', label: 'Từ chối' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            placeholder="Tìm theo mã đơn, doanh nghiệp, slot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Doanh nghiệp & Liên hệ</th>
                <th className="px-4 py-3">Vị trí slot</th>
                <th className="px-4 py-3">Thời gian chạy</th>
                <th className="px-4 py-3">Kinh phí niêm yết</th>
                <th className="px-4 py-3">Giá báo / Chốt</th>
                <th className="px-4 py-3">Tiến trình</th>
                <th className="px-4 py-3">Thanh toán</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Không có đơn booking nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {b.id}
                    </td>

                    {/* Doanh nghiệp */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{b.companyName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{b.contactPhone}</span>
                        <span>•</span>
                        <span>{b.contactPerson}</span>
                      </div>
                    </td>

                    {/* Vị trí */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{b.slotName}</span>
                      <span className="block text-[10px] font-mono text-slate-400">{b.slotCode}</span>
                    </td>

                    {/* Thời gian */}
                    <td className="px-4 py-3 text-slate-600">
                      <div>{formatDate(b.startDate)} → {formatDate(b.endDate)}</div>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                        {b.daysCount} ngày
                      </span>
                    </td>

                    {/* Đơn giá chuẩn */}
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {formatCurrency(b.standardPrice)}
                    </td>

                    {/* Giá chốt / Báo giá */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 font-mono">
                        {formatCurrency(b.finalPrice)}
                      </div>
                      {b.discountPercent ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          Giảm {b.discountPercent}%
                        </span>
                      ) : null}
                    </td>

                    {/* Tiến trình */}
                    <td className="px-4 py-3">
                      <StatusBadge type="booking" status={b.bookingStatus} />
                      {b.bookingStatus === 'REJECTED' && b.rejectionReason && (
                        <div className="text-[10px] text-red-600 mt-1 line-clamp-1 italic" title={b.rejectionReason}>
                          Lý do: {b.rejectionReason}
                        </div>
                      )}
                    </td>

                    {/* Thanh toán */}
                    <td className="px-4 py-3">
                      <StatusBadge type="payment" status={b.paymentStatus} />
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-3 text-right space-x-1 shrink-0">
                      {/* Xem chi tiết */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailBooking(b)}
                        className="h-7 px-2 text-[11px]"
                        title="Xem chi tiết đơn và thông tin doanh nghiệp"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Chi tiết
                      </Button>

                      {/* Đơn SUBMITTED: Có thể Duyệt báo giá hoặc Từ chối */}
                      {b.bookingStatus === 'SUBMITTED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleOpenQuotation(b)}
                            className="h-7 px-2.5 text-[11px] font-bold bg-sky-700 hover:bg-sky-800"
                          >
                            <DollarSign className="w-3 h-3 mr-1" />
                            Báo giá
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenReject(b)}
                            className="h-7 px-2 text-[11px] text-red-700 hover:bg-red-50 hover:border-red-300"
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Từ chối
                          </Button>
                        </>
                      )}

                      {/* Đơn QUOTED: Cho phép cập nhật lại báo giá */}
                      {b.bookingStatus === 'QUOTED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenQuotation(b)}
                          className="h-7 px-2 text-[11px] text-slate-700"
                        >
                          Sửa báo giá
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Chi tiết đơn & Thẩm định hồ sơ */}
      {detailBooking && (
        <Dialog
          open={!!detailBooking}
          onClose={() => setDetailBooking(null)}
          title={`Hồ Sơ Đơn Đặt Chỗ: ${detailBooking.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Doanh nghiệp:</span>
                <strong className="text-slate-900 text-sm block">{detailBooking.companyName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Người liên hệ:</span>
                <strong className="text-slate-900 block">{detailBooking.contactPerson}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Số điện thoại:</span>
                <span className="font-mono text-slate-800">{detailBooking.contactPhone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email liên hệ:</span>
                <span className="text-slate-800">{detailBooking.contactEmail || 'Chưa cung cấp'}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-1">
                Thông tin vị trí & Lịch phát sóng
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Vị trí: <strong>{detailBooking.slotName}</strong> ({detailBooking.slotCode})</div>
                <div>Thời lượng: <strong>{detailBooking.daysCount} ngày</strong></div>
                <div>Ngày bắt đầu: <strong>{formatDate(detailBooking.startDate)}</strong></div>
                <div>Ngày kết thúc: <strong>{formatDate(detailBooking.endDate)}</strong></div>
                <div>Đơn giá niêm yết: <strong>{formatCurrency(detailBooking.standardPrice)}</strong></div>
                <div>Giá chốt: <strong className="text-sky-700">{formatCurrency(detailBooking.finalPrice)}</strong></div>
              </div>
            </div>

            {/* Trạng thái hiện tại */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px]">Trạng thái Booking:</span>
                <div className="mt-1">
                  <StatusBadge type="booking" status={detailBooking.bookingStatus} />
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Trạng thái Thanh toán:</span>
                <div className="mt-1">
                  <StatusBadge type="payment" status={detailBooking.paymentStatus} />
                </div>
              </div>
            </div>

            {/* Lý do từ chối nếu có */}
            {detailBooking.bookingStatus === 'REJECTED' && detailBooking.rejectionReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                <span className="font-bold block text-red-900 mb-1">Lý do từ chối đơn:</span>
                <p className="text-xs">{detailBooking.rejectionReason}</p>
              </div>
            )}

            {/* Ghi chú điều khoản nếu có */}
            {detailBooking.quotationNotes && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-sky-900">
                <span className="font-bold block text-sky-950 mb-1">Ghi chú & Điều khoản báo giá:</span>
                <p className="text-xs whitespace-pre-line">{detailBooking.quotationNotes}</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setDetailBooking(null)}>
                Đóng
              </Button>
              {detailBooking.bookingStatus === 'SUBMITTED' && (
                <Button
                  size="sm"
                  onClick={() => {
                    const b = detailBooking
                    setDetailBooking(null)
                    handleOpenQuotation(b)
                  }}
                  className="bg-sky-700 hover:bg-sky-800"
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  Tiến hành Báo giá
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Modal 2: Soạn thảo Báo giá & Chiết khấu (UC018) */}
      {selectedBooking && (
        <Dialog
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Soạn Thảo Báo Giá Chính Thức: ${selectedBooking.id}`}
        >
          <form onSubmit={handleSendQuotation} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-200 space-y-1">
              <div>Khách hàng: <strong>{selectedBooking.companyName}</strong></div>
              <div>Vị trí: <strong>{selectedBooking.slotName}</strong> ({selectedBooking.slotCode})</div>
              <div>Thời gian: <strong>{selectedBooking.daysCount} ngày</strong> ({formatDate(selectedBooking.startDate)} → {formatDate(selectedBooking.endDate)})</div>
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
                  className="text-xs"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Tối đa chiết khấu 50%</span>
              </div>

              <div>
                <Label htmlFor="price" required>Giá chốt hợp đồng (VND)</Label>
                <Input
                  id="price"
                  type="number"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(Number(e.target.value))}
                  required
                  className="text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-sky-700 font-semibold block mt-1">
                  = {formatCurrency(finalPrice)}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Điều khoản kỹ thuật & Cam kết hiển thị</Label>
              <Textarea
                id="notes"
                rows={3}
                value={quotationNotes}
                onChange={(e) => setQuotationNotes(e.target.value)}
                placeholder="Cam kết hiển thị, thời hạn thanh toán..."
                required
                className="text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmittingQuote}
                className="bg-sky-700 hover:bg-sky-800"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Gửi Báo Giá Tới Doanh Nghiệp
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Modal 3: Từ chối đơn đặt chỗ (UC016) */}
      {rejectTarget && (
        <Dialog
          open={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          title={`Từ Chối Đơn Đặt Chỗ: ${rejectTarget.id}`}
        >
          <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Cảnh báo từ chối booking
              </div>
              <p className="text-[11px] leading-relaxed">
                Đơn đặt chỗ của <strong>{rejectTarget.companyName}</strong> cho vị trí <strong>{rejectTarget.slotName}</strong> sẽ bị chuyển sang trạng thái <strong>TỪ CHỐI (REJECTED)</strong>. Lý do dưới đây sẽ được thông báo trực tiếp cho Doanh nghiệp.
              </p>
            </div>

            <div>
              <Label className="mb-1 block">Gợi ý lý do từ chối nhanh:</Label>
              <div className="space-y-1">
                {PRESET_REASONS.map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className="w-full text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>{reason}</span>
                    <span className="text-sky-700 font-semibold shrink-0 ml-2">Chọn</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="rejectReason" required>
                Nêu rõ lý do từ chối đơn:
              </Label>
              <Textarea
                id="rejectReason"
                rows={3}
                placeholder="Nhập lý do từ chối cụ thể..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmittingReject}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Ban className="w-3.5 h-3.5 mr-1" />
                Xác Nhận Từ Chối Đơn
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
