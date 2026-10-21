import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { complaintApi } from '../api/payment'
import type { PaymentComplaint } from '../types'
import { ComplaintStatusBadge } from './ComplaintQueuePage'
import { Panel, Notice } from '../components/LedgerUI'

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

  const fieldErr = (m?: string) => m && <p className="mt-1.5 text-xs font-medium text-negative">{m}</p>

  return (
    <div className="mx-auto max-w-[960px] py-6 font-sans text-slate-900">
      <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em]">Đã chuyển tiền mà chưa được ghi nhận?</h1>
      <p className="mt-1 max-w-[70ch] text-sm leading-6 text-slate-600">
        Thường hệ thống ghi nhận trong 1-2 phút sau khi ngân hàng báo có. Sau 15 phút mà đơn vẫn chờ hoặc ví chưa được cộng,
        hãy gửi thông tin dưới đây. Kế toán đối chiếu sao kê rồi phản hồi; bạn không cần chuyển tiền lại.
      </p>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <h2 className="text-base font-semibold sm:col-span-2">Gửi khiếu nại</h2>
          {submitted && (
            <div className="sm:col-span-2">
              <Notice tone="success">Đã gửi khiếu nại. Theo dõi trạng thái ở danh sách bên cạnh.</Notice>
            </div>
          )}
          <div>
            <Label htmlFor="amount" required>Số tiền đã chuyển (VND)</Label>
            <Input id="amount" type="number" inputMode="numeric" className="num" {...register('amount', { valueAsNumber: true })} />
            {fieldErr(errors.amount?.message)}
          </div>
          <div>
            <Label htmlFor="transferredAt" required>Thời gian chuyển</Label>
            <Input id="transferredAt" type="datetime-local" {...register('transferredAt')} />
            {fieldErr(errors.transferredAt?.message)}
          </div>
          <div>
            <Label htmlFor="bankReference" required>Mã giao dịch ngân hàng</Label>
            <Input id="bankReference" placeholder="FT26293..." className="font-mono" {...register('bankReference')} />
            {fieldErr(errors.bankReference?.message)}
          </div>
          <div>
            <Label htmlFor="orderCode">Mã đơn, nếu có</Label>
            <Input id="orderCode" placeholder="LP..." className="font-mono" {...register('orderCode')} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Input id="note" placeholder="Ngân hàng chuyển, nội dung chuyển khoản đã ghi" {...register('note')} />
          </div>
          {submitError && (
            <div className="sm:col-span-2">
              <Notice tone="error">{submitError}</Notice>
            </div>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto" isLoading={isSubmitting}>
              Gửi khiếu nại
            </Button>
          </div>
        </form>

        <Panel title="Khiếu nại của tôi" aside={<span className="num">{items.length}</span>} bodyClassName="px-0 pb-1">
          {items.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Bạn chưa gửi khiếu nại nào.</p>
          ) : (
            <ul>
              {items.map((c) => (
                <li key={c.complaintId} className="border-t border-slate-100 px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold num">{formatCurrency(c.amount)}</span>
                    <ComplaintStatusBadge status={c.status} />
                  </div>
                  <div className="mt-1 text-[13px] text-slate-500">
                    <span className="font-mono">{c.bankReference}</span>
                    {c.orderCode ? <> · đơn <span className="font-mono">{c.orderCode}</span></> : null}
                  </div>
                  <div className="text-[13px] text-slate-500 num">Chuyển lúc {formatDateTime(c.transferredAt)}</div>
                  {c.resolutionNote && (
                    <div className={`mt-1 text-[13px] ${c.status === 'REJECTED' ? 'text-[#831c1e]' : 'text-slate-700'}`}>
                      Kế toán: {c.resolutionNote}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
