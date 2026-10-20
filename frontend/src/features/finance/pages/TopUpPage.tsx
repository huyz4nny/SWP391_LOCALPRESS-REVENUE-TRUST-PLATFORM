import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Wallet } from 'lucide-react'
import { mockStore } from '@/mocks/store'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paymentApi } from '../api/payment'

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
    <div className="max-w-xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Wallet className="w-5 h-5 mr-2 text-gold" />
            Nạp tiền vào Ví LocalPress
          </CardTitle>
          <p className="text-xs text-stone-500">
            Số dư hiện tại: <span className="font-semibold text-stone-800">{balance === null ? '—' : formatCurrency(balance)}</span>.
            Dùng số dư để mua bài Premium, gói hội viên hoặc thanh toán quảng cáo mà không cần quét QR mỗi lần.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label className="mb-2 block">Chọn nhanh</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setValue('amount', p, { shouldValidate: true })}
                    className={`rounded-lg border-2 py-2 text-sm font-semibold cursor-pointer transition-all ${
                      amount === p ? 'border-primary-900 bg-primary-50/50 text-primary-900' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {formatCurrency(p)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="amount">Hoặc nhập số tiền khác (VND)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                step={1000}
                className="mt-1"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-xs text-crimson mt-1">{errors.amount.message}</p>}
            </div>

            {submitError && (
              <div className="flex items-center text-sm text-crimson bg-red-50 border border-red-200 rounded p-3">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {submitError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo mã QR...' : `Tiếp tục: nạp ${formatCurrency(Number.isFinite(amount) ? amount : 0)} qua QR SePay`}
            </Button>
            <p className="text-[11px] text-stone-500 text-center">
              Tiền nạp chỉ dùng để thanh toán trên LocalPress, không rút ra tài khoản ngân hàng.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
