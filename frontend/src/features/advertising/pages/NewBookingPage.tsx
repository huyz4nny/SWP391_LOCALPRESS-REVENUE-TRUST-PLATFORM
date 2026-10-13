import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdSlot } from '../types'
import { advertisingApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { bookingSchema, BookingInput, getBookingDays, getBookingToday } from '../schemas/booking'

export function NewBookingPage() {
  const [searchParams] = useSearchParams()
  const defaultSlotId = searchParams.get('slotId') || ''
  const navigate = useNavigate()
  const currentUser = mockStore.getCurrentUser()

  const [slots, setSlots] = useState<AdSlot[]>([])
  const [requestError, setRequestError] = useState('')
  const [slotsError, setSlotsError] = useState('')
  const today = getBookingToday()
  const { register, control, handleSubmit, setError, trigger, formState: { errors, isSubmitting } } = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    mode: 'onTouched',
    defaultValues: {
      slotId: defaultSlotId, startDate: today, endDate: today,
      companyName: currentUser.companyName || '', contactPerson: currentUser.name || '',
      contactPhone: currentUser.phone || '', contactEmail: currentUser.email || '',
    },
  })
  const [slotId, startDate, endDate] = useWatch({ control, name: ['slotId', 'startDate', 'endDate'] })

  useEffect(() => {
    advertisingApi.getSlots().then(setSlots)
      .catch((error) => setSlotsError(error instanceof Error ? error.message : 'Không tải được vị trí quảng cáo'))
  }, [])

  const daysCount = getBookingDays(startDate, endDate)

  const selectedSlot = slots.find((s) => s.id === slotId)
  const estimatedPrice = selectedSlot ? selectedSlot.pricePerDay * daysCount : 0

  const submit = async (values: BookingInput) => {
    setRequestError('')
    if (!selectedSlot?.isActive) {
      setError('slotId', { message: 'Vui lòng chọn vị trí quảng cáo đang hoạt động' })
      return
    }
    try {
      const booking = await advertisingApi.createBooking({
        ...values,
        daysCount: getBookingDays(values.startDate, values.endDate),
      })
      navigate(`/advertiser/bookings/${booking.id}`)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Lỗi gửi yêu cầu booking')
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

      <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
        <fieldset disabled={isSubmitting} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Vị trí & Lịch phát dự kiến</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
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
                    {s.name} ({s.dimensions}) — {formatCurrency(s.pricePerDay)}/ngày
                  </option>
                ))}
              </select>
              {errors.slotId && <p className="mt-1 text-xs text-red-600">{errors.slotId.message}</p>}
              {slotsError && <p role="alert" className="mt-1 text-xs text-red-600">{slotsError}</p>}
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

            {/* Price Preview Banner */}
            <p className="text-[11px] text-slate-500">Lịch được tính theo giờ Việt Nam (UTC+7).</p>
            <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 block">Thời lượng chiến dịch:</span>
                <span className="text-sm font-bold text-slate-900">{daysCount ? `${daysCount} ngày phát liên tục` : 'Chọn khoảng ngày hợp lệ'}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Dự toán kinh phí chuẩn:</span>
                <span className="text-lg font-black text-primary-950">
                  {daysCount && selectedSlot ? formatCurrency(estimatedPrice) : '—'}
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
                {...register('companyName')}
                error={errors.companyName?.message}
                aria-invalid={Boolean(errors.companyName)}
                maxLength={255}
                required
              />
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
            <Button type="submit" className="w-full font-bold" isLoading={isSubmitting}>
              Gửi yêu cầu Booking tới Ban Quảng Cáo Tòa Soạn
            </Button>
          </CardFooter>
        </Card>
        </fieldset>
      </form>
    </div>
  )
}
