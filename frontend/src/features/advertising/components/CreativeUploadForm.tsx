import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload } from 'lucide-react'
import { advertisingApi, readImageSize } from '../api'
import { AdCampaign } from '../types'
import { creativeSchema, CreativeInput, CREATIVE_TYPES, parseDimensions } from '../schemas/creative'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppApiError } from '@/lib/http/errors'

/** Khung xem trước trong cổng doanh nghiệp, không dùng PublicLayout của trang báo. */
function AdPreview({ src, width, height, device }: { src: string; width: number; height: number; device: 'desktop' | 'mobile' }) {
  const frame = device === 'desktop' ? 'w-full' : 'w-[240px]'
  return (
    <div>
      <span className="text-[11px] font-semibold text-slate-500 block mb-1">{device === 'desktop' ? 'Máy tính' : 'Điện thoại'}</span>
      <div className={`${frame} rounded-md border border-slate-300 bg-[#fafaf9] p-2 space-y-1.5`}>
        <div className="h-2 w-2/3 rounded bg-slate-200" />
        <div className="relative">
          <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-medium text-white">Quảng cáo</span>
          <img src={src} alt="Xem trước banner" className="w-full h-auto object-contain border border-slate-200 bg-white"
            style={{ aspectRatio: `${width} / ${height}` }} />
        </div>
        <div className="h-2 w-full rounded bg-slate-200" />
        <div className="h-2 w-5/6 rounded bg-slate-200" />
      </div>
    </div>
  )
}

export function CreativeUploadForm({ campaign, onUploaded }: { campaign: AdCampaign; onUploaded: () => void }) {
  const expected = parseDimensions(campaign.slotDimensions)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [message, setMessage] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)
  const [requestError, setRequestError] = useState('')
  const { register, control, handleSubmit, reset, setError, setValue, formState: { errors, isSubmitting } } = useForm<CreativeInput>({
    resolver: zodResolver(creativeSchema),
    defaultValues: { title: '', targetUrl: 'https://' },
  })
  const file = useWatch({ control, name: 'file' })

  useEffect(() => {
    if (!(file instanceof File)) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setImageSize(null)
    readImageSize(file).then(setImageSize).catch(() => setImageSize(null))
    return () => URL.revokeObjectURL(url)
  }, [file])

  const sizeMismatch = Boolean(expected && imageSize &&
    (imageSize.width !== expected.width || imageSize.height !== expected.height))

  const submit = async (values: CreativeInput) => {
    setMessage('')
    setRequestError('')
    if (sizeMismatch) {
      setError('file', { message: `Ảnh phải đúng ${campaign.slotDimensions} px` })
      return
    }
    try {
      const creative = await advertisingApi.uploadCreative(campaign.id, values)
      setMessage(`Đã gửi phiên bản v${creative.versionNumber} để tòa soạn duyệt.`)
      reset({ title: '', targetUrl: values.targetUrl })
      setPreviewUrl('')
      setImageSize(null)
      setFileInputKey((key) => key + 1)
      onUploaded()
    } catch (error) {
      if (error instanceof AppApiError && error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, msg]) => setError(field as keyof CreativeInput, { message: String(msg) }))
      }
      setRequestError(error instanceof Error ? error.message : 'Lỗi tải lên banner')
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
      <fieldset disabled={isSubmitting} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-900 flex items-center">
            <Upload className="w-4 h-4 mr-1.5 text-primary-900" />
            Nộp banner mới
          </h4>
          {campaign.slotDimensions && (
            <span className="text-[11px] text-slate-500">Kích thước bắt buộc: {campaign.slotDimensions} px • JPEG/PNG</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <Label htmlFor="crTitle" required>Tiêu đề mô tả banner</Label>
            <Input id="crTitle" placeholder="VD: Banner khuyến mại tháng 10" {...register('title')}
              error={errors.title?.message} aria-invalid={Boolean(errors.title)} maxLength={255} required />
          </div>
          <div>
            <Label htmlFor="crTarget" required>URL trang đích</Label>
            <Input id="crTarget" type="url" {...register('targetUrl')}
              error={errors.targetUrl?.message} aria-invalid={Boolean(errors.targetUrl)} maxLength={2048} required />
          </div>
        </div>

        <div className="text-xs">
          <Label htmlFor="crFile" required>File ảnh banner</Label>
          <input
            key={fileInputKey}
            id="crFile"
            type="file"
            accept={CREATIVE_TYPES.join(',')}
            aria-invalid={Boolean(errors.file)}
            className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary-900 file:px-3 file:py-2 file:text-white"
            onChange={(e) => {
              const picked = e.target.files?.[0]
              if (picked) setValue('file', picked, { shouldValidate: true })
            }}
          />
          {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file.message}</p>}
          {sizeMismatch && imageSize && (
            <p className="mt-1 text-xs text-red-600">
              Ảnh đang là {imageSize.width}x{imageSize.height} px, vị trí này cần {campaign.slotDimensions} px.
            </p>
          )}
        </div>

        {previewUrl && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
            <AdPreview src={previewUrl} device="desktop" width={expected?.width ?? imageSize?.width ?? 16} height={expected?.height ?? imageSize?.height ?? 9} />
            <AdPreview src={previewUrl} device="mobile" width={expected?.width ?? imageSize?.width ?? 16} height={expected?.height ?? imageSize?.height ?? 9} />
          </div>
        )}

        {requestError && <p role="alert" className="text-xs text-red-700">{requestError}</p>}
        {message && <p role="status" className="text-xs font-semibold text-emerald-700">{message}</p>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={sizeMismatch}>
            Gửi banner để tòa soạn duyệt
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
