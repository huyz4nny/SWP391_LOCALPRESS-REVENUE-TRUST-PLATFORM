import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/format'
import { advertisingApi } from '../api'
import type { CancellationQuote } from '../types'

const schema = z.object({
  reason: z.string().trim().min(1, 'Vui lòng nhập lý do hủy').max(1000, 'Lý do tối đa 1.000 ký tự'),
  acknowledged: z.boolean().refine(Boolean, 'Vui lòng xác nhận đã hiểu chính sách hủy'),
})
export function CancelCampaignDialog({
  campaignId,
  onClose,
  onCancelled,
}: {
  campaignId: string
  onClose: () => void
  onCancelled: () => void
}) {
  const [quote, setQuote] = useState<CancellationQuote | null>(null)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '', acknowledged: false },
  })
  useEffect(() => {
    let active = true
    advertisingApi
      .getCancellationQuote(campaignId)
      .then((q) => {
        if (active) setQuote(q)
      })
      .catch((e: Error) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [campaignId])
  const submit = handleSubmit(async ({ reason }) => {
    try {
      setError('')
      await advertisingApi.cancelCampaign(campaignId, reason)
      onCancelled()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không hủy được chiến dịch')
    }
  })
  return (
    <Dialog
      open
      onClose={() => {
        if (!isSubmitting) onClose()
      }}
      title="Hủy chiến dịch"
      maxWidth="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        {!quote && !error && <p role="status">Đang tính khoản hoàn dự kiến…</p>}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {quote && (
          <>
            <p className="text-sm leading-6 text-slate-600">{quote.policyText}</p>
            {!quote.allowed && (
              <p role="alert" className="text-sm text-red-700">
                {quote.blockedReason}
              </p>
            )}
            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-4 text-sm">
              <div>
                <dt className="text-slate-600">Đã thu</dt>
                <dd className="font-medium tabular-nums">{formatCurrency(quote.paidAmount)}</dd>
              </div>
              <div>
                <dt className="text-slate-600">Dự kiến đề xuất hoàn</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(quote.refundApplicable ? quote.proposedAmount : 0)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Ngày đã tính sử dụng</dt>
                <dd>
                  {quote.totalDays - quote.unusedDays} / {quote.totalDays}
                </dd>
              </div>
              <div>
                <dt className="text-slate-600">Ngày chưa chạy</dt>
                <dd>{quote.unusedDays}</dd>
              </div>
            </dl>
            {!quote.refundApplicable && (
              <p className="text-xs text-slate-600">
                Không phát sinh hoàn tiền vì chưa thu tiền hoặc số dự kiến dưới 1.000 đ.
              </p>
            )}
            <Label htmlFor="cancel-reason" required>
              Lý do hủy
            </Label>
            <Input id="cancel-reason" maxLength={1000} {...register('reason')} error={errors.reason?.message} />
            <label className="flex items-start gap-2 text-sm leading-6">
              <input className="mt-1" type="checkbox" {...register('acknowledged')} />
              Tôi hiểu hủy là không thể hoàn tác và tiền hoàn cần kế toán duyệt.
            </label>
            {errors.acknowledged && (
              <p role="alert" className="text-xs text-red-700">
                {errors.acknowledged.message}
              </p>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" variant="destructive" disabled={!quote?.allowed} isLoading={isSubmitting}>
            Xác nhận hủy chiến dịch
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
