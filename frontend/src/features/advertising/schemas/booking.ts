import { z } from 'zod'
import { companyProfileSchema } from './companyProfile'

export function getBookingToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export const bookingScheduleSchema = z.object({
  startDate: z.string().min(1, 'Vui lòng chọn ngày bắt đầu').date('Ngày bắt đầu không hợp lệ'),
  endDate: z.string().min(1, 'Vui lòng chọn ngày kết thúc').date('Ngày kết thúc không hợp lệ'),
}).superRefine(({ startDate, endDate }, context) => {
  if (startDate < getBookingToday()) {
    context.addIssue({ code: 'custom', path: ['startDate'], message: 'Ngày bắt đầu không được ở quá khứ (giờ Việt Nam)' })
  }
  if (endDate < startDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'Ngày kết thúc không được trước ngày bắt đầu' })
  }
})

export const bookingSchema = bookingScheduleSchema.and(z.object({
  slotId: z.string().min(1, 'Vui lòng chọn vị trí quảng cáo'),
  campaignName: z.string().trim().min(1, 'Vui lòng nhập tên chiến dịch').max(255, 'Tên chiến dịch tối đa 255 ký tự'),
  contactPerson: companyProfileSchema.shape.contactPerson,
  contactPhone: companyProfileSchema.shape.phone,
  contactEmail: companyProfileSchema.shape.email,
}))

export type BookingInput = z.infer<typeof bookingSchema>

export function getBookingDays(startDate: string, endDate: string) {
  if (!bookingScheduleSchema.safeParse({ startDate, endDate }).success) return 0
  return (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1
}
