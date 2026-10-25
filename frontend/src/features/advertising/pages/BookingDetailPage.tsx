import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AdBooking, AdCampaign } from '../types'
import { advertisingApi } from '../api'
import { CreativeUploadForm } from '../components/CreativeUploadForm'
import { mockStore } from '@/mocks/store'
import { httpClient } from '@/lib/http/client'
import { paymentPath } from '@/features/finance/api/payment'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
  Calendar,
  CreditCard,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [booking, setBooking] = useState<AdBooking | null>(null)
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isPaying, setIsPaying] = useState(false)

  // Cancel/Refund dialog state
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [isRefunding, setIsRefunding] = useState(false)

  useEffect(() => {
    if (id) loadData(id)
  }, [id])

  const loadData = async (bookingId: string) => {
    try {
      setLoading(true)
      setLoadError('')
      const bData = await advertisingApi.getBookingById(bookingId)
      setBooking(bData)
      // Backend: booking chính là campaign (campaignId = id). Mock: campaign tạo sau khi xác nhận báo giá.
      setCampaign(bData.campaignId ? await advertisingApi.getCampaignById(bData.campaignId) : null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không tải được booking')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuotation = async () => {
    if (!booking || !termsAccepted) return
    setActionError('')
    setIsAccepting(true)
    try {
      await advertisingApi.acceptQuotation(booking.id, booking.quoteVersion ?? 0)
      await loadData(booking.id)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Lỗi xác nhận báo giá')
      // Báo giá có thể vừa đổi phiên bản: tải lại để khách xem bản mới.
      await loadData(booking.id)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleGoToPayment = async () => {
    if (!booking) return
    setActionError('')
    setIsPaying(true)
    try {
      // Backend chốt số tiền theo báo giá đã xác nhận và dùng lại đơn còn hạn (không tạo đơn trùng).
      const order = await advertisingApi.createPayment(booking.campaignId ?? booking.id)
      navigate(paymentPath(order), { state: { returnUrl: `/advertiser/bookings/${booking.id}` } })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Lỗi tạo đơn thanh toán')
    } finally {
      setIsPaying(false)
    }
  }

  const handleRequestCancel = async () => {
    if (!booking || !refundReason.trim()) return
    setIsRefunding(true)
    try {
      // Find matching order
      const matchingOrder = mockStore.getState().orders.find((o) => o.targetId === booking.id)
      if (matchingOrder) {
        await httpClient.post('/finance/refunds/propose', {
          orderId: matchingOrder.id,
          refundAmount: booking.finalPrice,
          reason: refundReason,
          affectedBenefit: `Hủy hợp đồng booking quảng cáo ${booking.id} (${booking.slotName})`,
        })
      }
      alert('Yêu cầu hủy hợp đồng và hoàn tiền đã được gửi tới Ban Tài chính tòa soạn kiểm tra!')
      setShowRefundDialog(false)
      loadData(booking.id)
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi yêu cầu hoàn tiền')
    } finally {
      setIsRefunding(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-200 rounded-xl" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Không tìm thấy thông tin Booking</h2>
        {loadError && <p role="alert" className="mt-2 text-sm text-red-700">{loadError}</p>}
        <Button onClick={() => navigate('/advertiser/bookings')} className="mt-4">
          Về danh sách Booking
        </Button>
      </div>
    )
  }

  const activeCreative = campaign?.creatives.find((c) => c.isActiveServing)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-slate-500">{booking.id}</span>
            <span className="text-slate-300">•</span>
            <h1 className="text-xl font-bold text-slate-900">{booking.campaignName || booking.slotName}</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Doanh nghiệp: <strong>{booking.companyName}</strong> • Người liên hệ: {booking.contactPerson} ({booking.contactPhone})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {booking.paymentStatus === 'PAID' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRefundDialog(true)}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Yêu cầu hủy / Hoàn tiền
            </Button>
          )}
          <Link to="/advertiser/bookings">
            <Button variant="secondary" size="sm" className="text-xs">
              Quay lại danh sách
            </Button>
          </Link>
        </div>
      </div>

      {/* 3 Status Cards Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            1. Trạng thái Booking
          </div>
          <div className="mt-1">
            <StatusBadge type="booking" status={booking.bookingStatus} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            2. Trạng thái Thanh toán
          </div>
          <div className="mt-1">
            <StatusBadge type="payment" status={booking.paymentStatus} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            3. Trạng thái Phân phối
          </div>
          <div className="mt-1">
            <StatusBadge type="delivery" status={booking.deliveryStatus} />
          </div>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-center">
          <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
          {actionError}
        </div>
      )}

      {booking.bookingStatus === 'SUBMITTED' && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center">
          <Clock className="w-4 h-4 text-slate-500 mr-1.5 shrink-0" />
          Booking đang giữ chỗ và chờ tòa soạn gửi báo giá chính thức. Giá hiển thị bên dưới chỉ là dự toán theo giá niêm yết.
        </div>
      )}

      {booking.bookingStatus === 'REJECTED' && booking.rejectionReason && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
          <strong>Lý do từ chối:</strong> {booking.rejectionReason}
        </div>
      )}

      {/* UC006: xác nhận đúng phiên bản báo giá đang xem */}
      {booking.bookingStatus === 'QUOTED' && (
        <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs space-y-3">
          <div className="space-y-1">
            <div className="font-bold flex items-center">
              <Clock className="w-4 h-4 text-sky-600 mr-1.5" />
              Tòa soạn đã gửi báo giá{booking.quoteVersion ? ` (phiên bản ${booking.quoteVersion})` : ''}
            </div>
            <p className="text-sky-800">
              Kinh phí: <strong>{formatCurrency(booking.finalPrice)}</strong> {booking.discountPercent ? `(đã chiết khấu ${booking.discountPercent}%)` : ''}.
              Xem chi tiết và ghi chú điều khoản bên dưới trước khi xác nhận.
            </p>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
            <span>Tôi đã đọc và đồng ý với giá, lịch phát và điều khoản trong báo giá này.</span>
          </label>
          <Button onClick={handleAcceptQuotation} size="sm" disabled={!termsAccepted} isLoading={isAccepting}
            className="bg-sky-700 hover:bg-sky-800 text-white font-bold">
            Xác nhận báo giá
          </Button>
        </div>
      )}

      {booking.paymentIssue === 'LATE_PAYMENT_CONFLICT' && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs">
          Tiền về sau khi hết hạn giữ chỗ và vị trí đã có doanh nghiệp khác đặt. Khoản thanh toán đã được ghi nhận,
          tòa soạn sẽ liên hệ để chọn lịch mới hoặc hoàn tiền. Quảng cáo chưa được phát.
        </div>
      )}

      {booking.bookingStatus === 'CONFIRMED' && (booking.paymentStatus === 'UNPAID' || booking.paymentStatus === 'PENDING') && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-bold flex items-center">
              <CreditCard className="w-4 h-4 text-amber-600 mr-1.5" />
              {booking.paymentStatus === 'PENDING' ? 'Đang chờ xác nhận thanh toán' : 'Chờ thanh toán kinh phí hợp đồng'}
            </div>
            <p className="text-amber-800">
              {booking.paymentStatus === 'PENDING'
                ? 'Hệ thống chỉ ghi nhận khi cổng thanh toán xác nhận. Nếu đã chuyển tiền, bấm kiểm tra lại; đơn cũ được dùng lại, không phải trả lần hai.'
                : 'Bạn đã xác nhận báo giá. Bấm nút để mở trang thanh toán (QR hoặc ví LocalPress).'}
              {booking.holdExpiresAt && <> Giữ chỗ đến <strong>{formatDateTime(booking.holdExpiresAt)}</strong>.</>}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {booking.paymentStatus === 'PENDING' && (
              <Button variant="outline" size="sm" onClick={() => loadData(booking.id)}>Kiểm tra lại</Button>
            )}
            <Button onClick={handleGoToPayment} size="sm" isLoading={isPaying} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
              {booking.paymentStatus === 'PENDING' ? 'Tiếp tục thanh toán' : `Thanh toán ngay (${formatCurrency(booking.finalPrice)})`}
            </Button>
          </div>
        </div>
      )}

      {/* Booking Details Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chi tiết thời gian & Vị trí</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Vị trí:</span>
              <span className="font-semibold text-slate-800">{booking.slotName} ({booking.slotCode})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Ngày bắt đầu:</span>
              <span className="font-medium text-slate-800">{formatDate(booking.startDate)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Ngày kết thúc:</span>
              <span className="font-medium text-slate-800">{formatDate(booking.endDate)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tổng số ngày:</span>
              <span className="font-medium text-slate-800">{booking.daysCount} ngày</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Giá niêm yết:</span>
              <span className="text-slate-700">{booking.standardPrice != null ? formatCurrency(booking.standardPrice) : 'Theo báo giá'}</span>
            </div>
            {booking.discountPercent ? (
              <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600 font-medium">
                <span>Chiết khấu tòa soạn:</span>
                <span>-{booking.discountPercent}%</span>
              </div>
            ) : null}
            <div className="flex justify-between py-2 text-sm font-bold text-slate-900 border-t border-slate-200">
              <span>{booking.bookingStatus === 'SUBMITTED' ? 'Dự toán:' : booking.bookingStatus === 'CONFIRMED' ? 'Giá đã chốt:' : 'Giá báo:'}</span>
              <span className="text-primary-900 font-black">{booking.finalPrice != null ? formatCurrency(booking.finalPrice) : 'Theo báo giá'}</span>
            </div>

            {booking.quotationNotes && (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-[11px] leading-relaxed border border-slate-200 mt-2">
                <strong>Ghi chú từ Tòa Soạn:</strong> {booking.quotationNotes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Metrics & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Hiệu suất hiển thị chiến dịch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {campaign ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Hiển thị (Imp.)</span>
                    <span className="text-base font-bold text-slate-900">{campaign.impressions.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Lượt nhấp (Clicks)</span>
                    <span className="text-base font-bold text-slate-900">{campaign.clicks.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Tỷ lệ CTR</span>
                    <span className="text-base font-bold text-primary-900">{campaign.ctr}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium block mb-1">Banner đang phát trực tiếp:</span>
                  {activeCreative ? (
                    <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
                      <img
                        src={activeCreative.imageUrl}
                        alt=""
                        className="w-full h-auto max-h-24 object-cover rounded"
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800">{activeCreative.title} (v{activeCreative.versionNumber})</span>
                        <a
                          href={activeCreative.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-800 hover:underline flex items-center"
                        >
                          Đích đến <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-stone-50 border border-dashed border-stone-200 text-center text-stone-500 text-xs rounded-lg">
                      Chưa có banner nào được duyệt phát trực tiếp.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-slate-500 italic py-4 text-center">
                Chiến dịch sẽ tự động khởi tạo ngay sau khi Doanh nghiệp chấp nhận báo giá từ tòa soạn.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Creative Version History & Uploader Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Quản lý Banner Quảng Cáo (Creative Versions)</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi lần thay banner sẽ sinh ra một phiên bản mới. Bản banner đã duyệt tiếp tục phát cho tới khi bản mới được duyệt thành công.
              </p>
            </div>
            {campaign && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                Tổng cộng {campaign.creatives.length} phiên bản
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Creative Versions List */}
          {campaign && campaign.creatives.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Lịch sử các phiên bản Banner:
              </span>
              <div className="space-y-2">
                {campaign.creatives.map((cr) => (
                  <div
                    key={cr.id}
                    className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      cr.isActiveServing
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={cr.imageUrl}
                        alt=""
                        className="w-24 h-12 object-cover rounded border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{cr.title}</span>
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                            v{cr.versionNumber}
                          </span>
                          {cr.isActiveServing && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              ✓ Đang phát (LIVE)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 space-x-2">
                          <span>URL: {cr.targetUrl}</span>
                          <span>•</span>
                          <span>Tải lên: {formatDateTime(cr.uploadedAt)}</span>
                        </div>
                        {cr.reviewNotes && (
                          <div className="text-[11px] text-slate-600 mt-1 italic">
                            Nhận xét kiểm duyệt: {cr.reviewNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <StatusBadge type="creative" status={cr.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UC008: nộp banner sau khi đã xác nhận báo giá */}
          {campaign && booking.bookingStatus === 'CONFIRMED' && (
            <CreativeUploadForm campaign={campaign} onUploaded={() => loadData(booking.id)} />
          )}
          {booking.bookingStatus !== 'CONFIRMED' && booking.bookingStatus !== 'REJECTED' && (
            <p className="text-xs text-slate-500 italic">Bạn có thể nộp banner sau khi xác nhận báo giá.</p>
          )}
        </CardContent>
      </Card>

      {/* Cancel / Refund Modal */}
      {showRefundDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">Yêu cầu hủy hợp đồng & Hoàn tiền</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Theo quy định, doanh nghiệp không thể tự đánh dấu hoàn tiền. Yêu cầu của bạn sẽ được gửi tới Kế toán (Finance Staff) để lập đề xuất và Kế toán trưởng xem xét.
            </p>

            <div className="text-xs space-y-3">
              <div>
                <Label htmlFor="rfReason" required>Lý do hủy hợp đồng</Label>
                <Input
                  id="rfReason"
                  placeholder="Nêu rõ lý do thay đổi kế hoạch kinh doanh..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 bg-stone-50 rounded text-slate-600 border border-stone-200">
                Số tiền hợp đồng: <strong>{formatCurrency(booking.finalPrice)}</strong>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowRefundDialog(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRequestCancel}
                isLoading={isRefunding}
              >
                Gửi yêu cầu hoàn tiền
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
