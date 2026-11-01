import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminApi } from '../api'
import type { PaywallSettings } from '../types'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({ previewWordLimit: z.coerce.number().int().min(1, 'Tối thiểu 1 từ').max(500, 'Tối đa 500 từ') })
export function PaywallConfigPage() {
  const [settings, setSettings] = useState<PaywallSettings | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })
  useEffect(() => {
    let active = true
    void adminApi.getPaywallSettings().then(data => {
      if (active) { setSettings(data); reset({ previewWordLimit: data.previewWordLimit }) }
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không tải được cấu hình') })
    return () => { active = false }
  }, [reset])
  async function save(values: z.infer<typeof schema>) {
    if (!settings) return
    setError(''); setSuccess('')
    try {
      const saved = await adminApi.updatePaywallSettings({ ...settings, ...values })
      setSettings(saved); reset({ previewWordLimit: saved.previewWordLimit })
      setSuccess('Đã lưu cấu hình và ghi nhật ký thay đổi.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được cấu hình') }
  }
  return <div className="mx-auto max-w-2xl space-y-5">
    <header><h1 className="text-2xl font-bold">Cấu hình Paywall</h1><p className="mt-2 text-sm text-slate-600">Preview luôn bị giới hạn tối đa 30% nội dung ở máy chủ.</p></header>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {success && <p role="status" className="text-emerald-700">{success}</p>}
    {!settings && !error && <p role="status">Đang tải cấu hình...</p>}
    {settings && <form onSubmit={handleSubmit(save)} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <fieldset disabled={isSubmitting} className="space-y-3">
        <Label htmlFor="previewWordLimit">Giới hạn số từ xem trước</Label>
        <Input id="previewWordLimit" type="number" min={1} max={500} {...register('previewWordLimit')} />
        {errors.previewWordLimit && <p className="text-sm text-red-700">{errors.previewWordLimit.message}</p>}
        <p className="text-sm text-slate-600">Áp dụng giới hạn thấp hơn giữa số từ này và 30% nội dung.</p>
      </fieldset>
      <p className="text-sm text-slate-600">Paywall luôn bật. Giới hạn 2 phiên thuộc luồng quản lý thiết bị; giá bài lấy theo từng bài viết. Watermark chưa được triển khai.</p>
      <p className="text-xs text-slate-500">Cập nhật: {settings.lastUpdatedAt ? formatDateTime(settings.lastUpdatedAt) : 'Mặc định hệ thống'} · {settings.updatedBy}</p>
      <Button type="submit" isLoading={isSubmitting}>Lưu cấu hình</Button>
    </form>}
  </div>
}
