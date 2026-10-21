import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { mockStore } from '@/mocks/store'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paymentApi } from '../api/payment'
import { Notice } from '../components/LedgerUI'

/**
 * ==============================================================================
 * NẠP TIỀN VÀO VÍ LOCALPRESS /wallet/topup (SV4)
 * ==============================================================================
 * Mở từ nút "Nạp tiền" trên header hoặc từ trang thanh toán khi ví thiếu tiền.
 * Chọn mức có sẵn hoặc tự nhập -> tạo đơn TOPUP -> sang trang thanh toán /payment/:orderCode (QR SePay).
 * ?amount=   : điền sẵn số tiền (vd: số còn thiếu của đơn đang trả)
 * ?returnTo= : nạp xong quay lại đâu (vd: trang thanh toán đơn cũ)
 */

const PRESETS = [50000, 100000, 200000, 500000, 1000000]
const MIN_AMOUNT = 10000
const MAX_AMOUNT = 50000000

const schema = z.object({
  amount: z
    .number({ invalid_type_error: 'Vui lòng nhập số tiền' })
    .int('Số tiền phải là số nguyên')
    .min(MIN_AMOUNT, `Số tiền nạp tối thiểu ${formatCurrency(MIN_AMOUNT)}`)
    .max(MAX_AMOUNT, `Số tiền nạp tối đa ${formatCurrency(MAX_AMOUNT)}`)
    .refine((v) => v % 1000 === 0, 'Số tiền phải là bội số của 1.000 ₫'),
})

type FormValues = z.infer<typeof schema>

export function TopUpPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = params.get('returnTo') || undefined
  const presetAmount = Number(params.get('amount')) || 100000
  const [balance, setBalance] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState('')
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { amount: presetAmount } })
  const amount = watch('amount')

  useEffect(() => {
    if (isGuest) {
      navigate('/login', { replace: true, state: { from: { pathname: '/wallet/topup' } } })
      return
    }
    paymentApi.getWallet().then((w) => setBalance(w.balance)).catch(() => setBalance(null))
  }, [isGuest, navigate])

  const onSubmit = async (values: FormValues) => {
    setSubmitError('')
    try {
      const order = await paymentApi.createTopUp(values.amount)
      navigate(`/payment/${order.orderCode}`, { state: { returnUrl: returnTo ?? '/wallet' } })
    } catch (e: any) {
      setSubmitError(e?.message || 'Không tạo được đơn nạp tiền')
    }
  }

  return (
    <div className="mx-auto max-w-[640px] py-6 font-sans text-slate-900">
      <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em]">Nạp tiền vào ví</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Số dư hiện tại <span className="font-semibold text-slate-900 num">{balance === null ? '—' : formatCurrency(balance)}</span>.
        Nạp một lần để mua bài, gói hội viên hoặc trả quảng cáo mà không cần quét QR mỗi lần.
      </p>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5 rounded-lg border border-slate-200 bg-white p-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Chọn nhanh</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={amount === p}
                onClick={() => setValue('amount', p, { shouldValidate: true })}
                className={`h-10 rounded-md border text-sm num transition-colors cursor-pointer ${
                  amount === p
                    ? 'border-slate-900 bg-white font-semibold text-slate-900 ring-1 ring-slate-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {formatCurrency(p)}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <Label htmlFor="amount">Hoặc nhập số tiền (VND)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            step={1000}
            className="num"
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount ? (
            <p className="mt-1.5 text-xs font-medium text-negative">{errors.amount.message}</p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-500 num">
              Từ {formatCurrency(MIN_AMOUNT)} đến {formatCurrency(MAX_AMOUNT)}, bội số của 1.000 ₫.
            </p>
          )}
        </div>

        {submitError && <Notice tone="error">{submitError}</Notice>}

        <div>
          <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting}>
            {isSubmitting ? 'Đang tạo mã QR' : `Nạp ${formatCurrency(Number.isFinite(amount) ? amount : 0)} qua QR SePay`}
          </Button>
          <p className="mt-2 text-center text-xs text-slate-500">Tiền nạp chỉ dùng trên LocalPress, không rút ra tài khoản ngân hàng.</p>
        </div>
      </form>
    </div>
  )
}
