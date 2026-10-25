import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AdSlot, AdvertiserProfile, SlotAvailability } from '../types'
import { advertisingApi } from '../api'
import { formatCurrency, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { AppApiError } from '@/lib/http/errors'
import { bookingSchema, BookingInput, getBookingDays, getBookingToday } from '../schemas/booking'

export function NewBookingPage() {
  const [searchParams] = useSearchParams()
  const defaultSlotId = searchParams.get('slotId') || ''
  const navigate = useNavigate()

  const [slots, setSlots] = useState<AdSlot[]>([])
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [availability, setAvailability] = useState<SlotAvailability | null>(null)
  const [requestError, setRequestError] = useState('')
  const [slotsError, setSlotsError] = useState('')
  // Một khóa cho mỗi lần mở form: gửi lại cùng form không tạo booking thứ hai.
  const [requestKey] = useState(() => crypto.randomUUID())
  const today = getBookingToday()
  const { register, control, handleSubmit, reset, setError, trigger, formState: { errors, isSubmitting } } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    mode: 'onTouched',
    defaultValues: {
      slotId: defaultSlotId, startDate: today, endDate: today, campaignName: '',
      contactPerson: '', contactPhone: '', contactEmail: '',
    },
  })
  const [slotId, startDate, endDate] = useWatch({ control, name: ['slotId', 'startDate', 'endDate'] })

  useEffect(() => {
    advertisingApi.getSlots().then(setSlots)
      .catch((error) => setSlotsError(error instanceof Error ? error.message : 'Không tải được vị trí quảng cáo'))
    advertisingApi.getProfile()
      .then((data) => {
        setProfile(data)
        if (data) {
          reset((values) => ({
            ...values,
            contactPerson: data.contactPerson, contactPhone: data.phone, contactEmail: data.email,
          }))
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setProfileLoaded(true))
  }, [reset])

  const daysCount = getBookingDays(startDate, endDate)

  // Kiểm tra lịch trống chỉ để báo sớm; server kiểm tra lại có khóa khi gửi booking.
  useEffect(() => {
    setAvailability(null)
    if (!slotId || !daysCount) return
    let cancelled = false
    const timer = setTimeout(() => {
      advertisingApi.getAvailability(slotId, startDate, endDate)
        .then((data) => { if (!cancelled) setAvailability(data) })
        .catch(() => { if (!cancelled) setAvailability(null) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [slotId, startDate, endDate, daysCount])

  const selectedSlot = slots.find((s) => s.id === slotId)
  const estimatedPrice = !selectedSlot ? null
    : selectedSlot.pricingType === 'FLAT_FEE' ? selectedSlot.pricePerDay
    : !selectedSlot.pricingType || selectedSlot.pricingType === 'CPD' ? selectedSlot.pricePerDay * daysCount
    : null
  const verified = profile?.verificationStatus === 'VERIFIED'

  const submit = async (values: BookingInput) => {
    setRequestError('')
    if (!selectedSlot?.isActive) {
      setError('slotId', { message: 'Vui lòng chọn vị trí quảng cáo đang hoạt động' })
      return
    }
    try {
      const booking = await advertisingApi.createBooking({ ...values, requestKey })
      navigate(`/advertiser/bookings/${booking.id}`)
    } catch (error) {
      if (error instanceof AppApiError && error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) =>
          setError(field as keyof BookingInput, { message: String(message) }))
      }
      setRequestError(error instanceof Error ? error.message : 'Lỗi gửi yêu cầu booking')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Gửi yêu cầu đặt vị trí quảng cáo</h1>
        <p className="text-xs text-slate-500 mt-1">
          Chọn vị trí, lịch phát và thông tin liên hệ. Booking giữ chỗ ngay khi gửi; tòa soạn sẽ phản hồi báo giá chính thức.
        </p>
      </div>

      {profileLoaded && !verified && (
        <div role="alert" className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
          {profile
            ? 'Hồ sơ doanh nghiệp đang chờ xác minh hoặc bị từ chối, nên chưa gửi được booking. Bạn vẫn có thể xem lịch trống và dự toán.'
            : 'Bạn cần tạo hồ sơ doanh nghiệp trước khi gửi booking.'}{' '}
          <Link to="/advertiser/profile" className="font-semibold underline">Mở hồ sơ doanh nghiệp</Link>
        </div>
      )}

      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
        <fieldset disabled={isSubmitting} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Chiến dịch, vị trí và lịch phát</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <Label htmlFor="campaignName" required>Tên chiến dịch</Label>
              <Input
                id="campaignName"
                placeholder="VD: Khuyến mại mùa lễ hội 2026"
                {...register('campaignName')}
                error={errors.campaignName?.message}
                aria-invalid={Boolean(errors.campaignName)}
                maxLength={255}
                required
              />
            </div>

            <div>
              <Label htmlFor="slot" required>Chọn vị trí quảng cáo</Label>
              <select
                id="slot"
                {...register('slotId')}
                aria-invalid={Boolean(errors.slotId)}
                required
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs font-medium focus:ring-2 focus:ring-primary-900"
              >
                <option value="">Chọn vị trí quảng cáo</option>
                {slots.filter((slot) => slot.isActive).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.dimensions}) — {formatCurrency(s.pricePerDay)}{s.pricingType === 'CPD' || !s.pricingType ? '/ngày' : ''}
                  </option>
                ))}
              </select>
              {errors.slotId && <p className="mt-1 text-xs text-red-600">{errors.slotId.message}</p>}
              {slotsError && <p role="alert" className="mt-1 text-xs text-red-600">{slotsError}</p>}
              {selectedSlot && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedSlot.locationNote} • {selectedSlot.inventoryMode === 'ROTATING'
                    ? `Xoay vòng tối đa ${selectedSlot.maxCapacity} doanh nghiệp/ngày`
                    : 'Độc quyền 1 doanh nghiệp/ngày'}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start" required>Ngày bắt đầu</Label>
                <Input
                  id="start"
                  type="date"
                  min={today}
                  {...register('startDate', { onChange: () => { void trigger('endDate') } })}
                  error={errors.startDate?.message}
                  aria-invalid={Boolean(errors.startDate)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="end" required>Ngày kết thúc</Label>
                <Input
                  id="end"
                  type="date"
                  min={startDate && startDate > today ? startDate : today}
                  {...register('endDate')}
                  error={errors.endDate?.message}
                  aria-invalid={Boolean(errors.endDate)}
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500">Lịch được tính theo giờ Việt Nam (UTC+7).</p>
            {availability && (
              <p role="status" className={`text-xs font-medium ${availability.available ? 'text-emerald-700' : 'text-red-700'}`}>
                {availability.available
                  ? 'Vị trí còn trống trong khoảng ngày đã chọn.'
                  : `Đã kín lịch các ngày: ${availability.fullDates.slice(0, 5).map(formatDate).join(', ')}${availability.fullDates.length > 5 ? '…' : ''}`}
              </p>
            )}
            <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">Thời lượng chiến dịch:</span>
                <span className="text-sm font-bold text-slate-900">{daysCount ? `${daysCount} ngày phát liên tục` : 'Chọn khoảng ngày hợp lệ'}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Dự toán theo giá niêm yết:</span>
                <span className="text-lg font-black text-primary-950">
                  {daysCount && estimatedPrice != null ? formatCurrency(estimatedPrice) : selectedSlot ? 'Theo báo giá' : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Doanh nghiệp và người liên hệ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <span className="text-slate-500">Doanh nghiệp đặt quảng cáo: </span>
              <span className="font-semibold text-slate-900">{profile?.companyName ?? '—'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactPerson" required>Người liên hệ</Label>
                <Input
                  id="contactPerson"
                  {...register('contactPerson')}
                  error={errors.contactPerson?.message}
                  aria-invalid={Boolean(errors.contactPerson)}
                  maxLength={150}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactPhone" required>Điện thoại liên hệ</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  inputMode="numeric"
                  {...register('contactPhone')}
                  error={errors.contactPhone?.message}
                  aria-invalid={Boolean(errors.contactPhone)}
                  maxLength={20}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contactEmail" required>Email nhận hợp đồng</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  {...register('contactEmail')}
                  error={errors.contactEmail?.message}
                  aria-invalid={Boolean(errors.contactEmail)}
                  maxLength={255}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            {requestError && <p role="alert" className="text-sm text-red-700">{requestError}</p>}
            <Button type="submit" className="w-full font-bold" isLoading={isSubmitting}
              disabled={!verified || availability?.available === false}>
              Gửi yêu cầu booking tới tòa soạn
            </Button>
          </CardFooter>
        </Card>
        </fieldset>
      </form>
    </div>
  )
}
