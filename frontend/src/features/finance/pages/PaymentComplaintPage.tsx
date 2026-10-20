import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle2, MessageSquareWarning } from 'lucide-react'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/shared/EmptyState'
import { complaintApi } from '../api/payment'
import type { PaymentComplaint } from '../types'
import { ComplaintStatusBadge } from './ComplaintQueuePage'

/**
 * ==============================================================================
 * KHIẾU NẠI THANH TOÁN CHƯA GHI NHẬN /wallet/complaints (SV4 - UC051, phía khách)
 * ==============================================================================
 * Khách đã chuyển tiền nhưng đơn không chuyển sang "Đã thanh toán" / ví không được cộng.
 * ?orderCode=&amount= : điền sẵn khi mở từ trang thanh toán.
 */

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

const schema = z.object({
  orderCode: z.string().max(255).optional(),
  amount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền đã chuyển' })
    .int('Số tiền phải là số nguyên')
    .min(1000, 'Số tiền tối thiểu 1.000 ₫'),
  transferredAt: z
    .string()
    .min(1, 'Vui lòng nhập thời gian chuyển khoản')
    .refine((v) => Date.parse(v) <= Date.now(), 'Thời gian chuyển khoản không được ở tương lai'),
  bankReference: z.string().trim().min(4, 'Nhập mã giao dịch in trên biên lai ngân hàng (vd: FT2629...)').max(100),
  note: z.string().max(500).optional(),
})

type FormValues = z.infer<typeof schema>

export function PaymentComplaintPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [items, setItems] = useState<PaymentComplaint[]>([])
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      orderCode: params.get('orderCode') || '',
      amount: Number(params.get('amount')) || undefined,
      transferredAt: toLocalInput(new Date()),
    },
  })

  const load = () => complaintApi.listMine().then(setItems).catch(() => setItems([]))

  useEffect(() => {
    if (isGuest) {
      navigate('/login', { replace: true, state: { from: { pathname: '/wallet/complaints' } } })
      return
    }
    load()
  }, [isGuest, navigate])

  const onSubmit = async (v: FormValues) => {
    setSubmitError('')
    try {
      await complaintApi.create({
        orderCode: v.orderCode?.trim() || undefined,
        amount: v.amount,
        transferredAt: `${v.transferredAt}:00`,
        bankReference: v.bankReference.trim(),
        note: v.note?.trim() || undefined,
      })
      setSubmitted(true)
      reset({ orderCode: '', amount: undefined, transferredAt: toLocalInput(new Date()), bankReference: '', note: '' })
      load()
    } catch (e: any) {
      setSubmitError(e?.message || 'Không gửi được khiếu nại')
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <MessageSquareWarning className="w-5 h-5 mr-2 text-crimson" />
            Đã chuyển tiền nhưng chưa được ghi nhận?
          </CardTitle>
          <p className="text-xs text-stone-500">
            Thông thường hệ thống ghi nhận trong 1-2 phút sau khi ngân hàng báo có. Nếu sau 15 phút đơn vẫn chưa thanh toán
            hoặc ví chưa được cộng, hãy gửi thông tin bên dưới. Kế toán sẽ đối chiếu sao kê và phản hồi. Bạn không cần chuyển tiền lại.
          </p>
        </CardHeader>
        <CardContent>
          {submitted && (
            <div className="flex items-center text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-3 mb-4">
              <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
              Đã gửi khiếu nại. Bạn có thể theo dõi trạng thái ở danh sách bên dưới.
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="orderCode">Mã đơn (nếu có)</Label>
              <Input id="orderCode" placeholder="LP..." className="mt-1 font-mono" {...register('orderCode')} />
            </div>
            <div>
              <Label htmlFor="amount">Số tiền đã chuyển (VND)</Label>
              <Input id="amount" type="number" inputMode="numeric" className="mt-1" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-xs text-crimson mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="transferredAt">Thời gian chuyển khoản</Label>
              <Input id="transferredAt" type="datetime-local" className="mt-1" {...register('transferredAt')} />
              {errors.transferredAt && <p className="text-xs text-crimson mt-1">{errors.transferredAt.message}</p>}
            </div>
            <div>
              <Label htmlFor="bankReference">Mã giao dịch ngân hàng</Label>
              <Input id="bankReference" placeholder="FT26293..." className="mt-1 font-mono" {...register('bankReference')} />
              {errors.bankReference && <p className="text-xs text-crimson mt-1">{errors.bankReference.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="note">Ghi chú (ngân hàng chuyển, nội dung đã ghi...)</Label>
              <Input id="note" className="mt-1" {...register('note')} />
            </div>
            {submitError && (
              <div className="sm:col-span-2 flex items-center text-sm text-crimson bg-red-50 border border-red-200 rounded p-3">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {submitError}
              </div>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Đang gửi...' : 'Gửi khiếu nại'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Khiếu nại của tôi</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="Chưa có khiếu nại nào" />
          ) : (
            <div className="space-y-2">
              {items.map((c) => (
                <div key={c.complaintId} className="rounded border border-stone-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">
                      #{c.complaintId} • {formatCurrency(c.amount)} • <span className="font-mono">{c.bankReference}</span>
                    </div>
                    <ComplaintStatusBadge status={c.status} />
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    {c.orderCode ? `Đơn ${c.orderCode} • ` : ''}Chuyển lúc {formatDateTime(c.transferredAt)}
                  </div>
                  {c.resolutionNote && (
                    <div className={`text-xs mt-1 ${c.status === 'REJECTED' ? 'text-crimson' : 'text-emerald-800'}`}>
                      Phản hồi kế toán: {c.resolutionNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
