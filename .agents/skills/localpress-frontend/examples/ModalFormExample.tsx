import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Calendar } from 'lucide-react'

// Schema kiểm tra dữ liệu bằng Zod
const bookingFormSchema = z.object({
  campaignName: z
    .string()
    .min(5, 'Tên chiến dịch phải có ít nhất 5 ký tự')
    .max(100, 'Tên không quá 100 ký tự'),
  slotCode: z.string().min(1, 'Vui lòng chọn vị trí quảng cáo'),
  startDate: z.string().min(1, 'Vui lòng chọn ngày bắt đầu'),
  endDate: z.string().min(1, 'Vui lòng chọn ngày kết thúc'),
  targetUrl: z
    .string()
    .url('Đường dẫn URL đích không đúng định dạng (vd: https://doanhnghiep.vn)'),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    path: ['endDate'],
  }
)

export type BookingFormValues = z.infer<typeof bookingFormSchema>

interface ModalFormExampleProps {
  isOpen: boolean
  onClose: () => void
  onSubmitSuccess: (data: BookingFormValues) => Promise<void>
}

export function ModalFormExample({ isOpen, onClose, onSubmitSuccess }: ModalFormExampleProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      campaignName: '',
      slotCode: 'SLOT-HOME-TOP',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      targetUrl: 'https://',
      notes: '',
    },
  })

  if (!isOpen) return null

  const handleFormSubmit = async (values: BookingFormValues) => {
    try {
      await onSubmitSuccess(values)
      reset()
      onClose()
    } catch (err: any) {
      alert(err.message || 'Lỗi khi gửi yêu cầu')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Đặt Vị Trí Quảng Cáo Mới</h2>
            <p className="text-xs text-slate-500">Gửi yêu cầu booking để tòa soạn xét duyệt và báo giá</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4 text-xs">
          {/* Tên chiến dịch */}
          <div className="space-y-1.5">
            <Label htmlFor="campaignName">
              Tên chiến dịch quảng cáo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="campaignName"
              placeholder="VD: Khai trương tuyến vận tải Hải Phòng - Cát Bà 2026"
              {...register('campaignName')}
            />
            {errors.campaignName && (
              <p className="text-red-600 font-medium">{errors.campaignName.message}</p>
            )}
          </div>

          {/* Vị trí Slot */}
          <div className="space-y-1.5">
            <Label htmlFor="slotCode">
              Vị trí hiển thị (Ad Slot) <span className="text-red-500">*</span>
            </Label>
            <select
              id="slotCode"
              className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              {...register('slotCode')}
            >
              <option value="SLOT-HOME-TOP">Banner Đỉnh Trang Chủ (970x250) — Độc quyền</option>
              <option value="SLOT-SIDEBAR-R1">Banner Cột Phải Vị Trí 1 (300x600)</option>
              <option value="SLOT-IN-ARTICLE">Banner Giữa Bài Viết (728x90)</option>
            </select>
            {errors.slotCode && (
              <p className="text-red-600 font-medium">{errors.slotCode.message}</p>
            )}
          </div>

          {/* Thời gian hiển thị */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Từ ngày</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-red-600 font-medium">{errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Đến ngày</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-red-600 font-medium">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* URL đích */}
          <div className="space-y-1.5">
            <Label htmlFor="targetUrl">
              Liên kết đích khi click (Target URL) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="targetUrl"
              placeholder="https://doanhnghiep.vn/san-pham"
              {...register('targetUrl')}
            />
            {errors.targetUrl && (
              <p className="text-red-600 font-medium">{errors.targetUrl.message}</p>
            )}
          </div>

          {/* Footer nút bấm */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
              className="bg-primary-900 text-white"
            >
              Xác nhận gửi Booking
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
