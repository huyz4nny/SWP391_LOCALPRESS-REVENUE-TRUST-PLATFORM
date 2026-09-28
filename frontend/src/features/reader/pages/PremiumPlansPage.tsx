import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SEED_SUBSCRIPTION_PLANS } from '@/mocks/data/seed'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'
import { Crown, Check, Sparkles, HelpCircle, ShieldCheck, Zap } from 'lucide-react'

export function PremiumPlansPage() {
  const navigate = useNavigate()
  const [plans] = useState(SEED_SUBSCRIPTION_PLANS)
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const currentUser = mockStore.getCurrentUser()

  const handleSelectPlan = async (plan: (typeof SEED_SUBSCRIPTION_PLANS)[0]) => {
    if (currentUser.role === 'GUEST') {
      navigate('/login', { state: { from: { pathname: '/premium' } } })
      return
    }

    setLoadingPlanId(plan.id)
    try {
      const order = await httpClient.post<any>('/finance/checkout', {
        orderType: 'SUBSCRIPTION',
        targetId: plan.id,
        targetTitle: plan.name,
        amount: plan.price,
        paymentMethod: 'VIETQR',
      })
      navigate(`/checkout/${order.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingPlanId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-12">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-1.5 bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-amber-300">
          <Crown className="w-3.5 h-3.5 text-amber-700" />
          <span>ĐẶC QUYỀN HỘI VIÊN LOCALPRESS</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl font-black text-stone-950 tracking-tight leading-tight">
          Nâng tầm trải nghiệm tin tức với gói Hội Viên Premium
        </h1>
        <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
          Đồng hành cùng báo chí địa phương chất lượng cao. Tiếp cận các tuyến bài điều tra, hồ sơ kinh tế độc quyền và phân tích chuyên gia sâu sắc không giới hạn.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => {
          const isPopular = plan.isPopular
          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                isPopular
                  ? 'bg-gradient-to-b from-stone-900 to-stone-950 text-white shadow-2xl border-2 border-amber-500 scale-105 z-10'
                  : 'bg-white text-stone-900 shadow-sm border border-stone-200 hover:shadow-md'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 font-black text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center shadow-md">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Được độc giả chọn nhiều nhất
                </div>
              )}

              <div>
                <h3 className={`font-serif text-xl font-bold ${isPopular ? 'text-amber-400' : 'text-stone-900'}`}>
                  {plan.name}
                </h3>
                <p className={`mt-2 text-xs leading-relaxed ${isPopular ? 'text-stone-400' : 'text-stone-500'}`}>
                  {plan.description}
                </p>

                <div className="mt-6 pb-6 border-b border-stone-200/20">
                  <div className="flex items-baseline">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className={`text-xs ml-1.5 ${isPopular ? 'text-stone-400' : 'text-stone-500'}`}>
                      / {plan.durationDays} ngày
                    </span>
                  </div>
                  <div className={`text-[11px] mt-1 ${isPopular ? 'text-amber-300' : 'text-stone-400'}`}>
                    ~ {Math.round(plan.price / plan.durationDays).toLocaleString()} ₫ mỗi ngày
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isPopular ? 'text-stone-400' : 'text-stone-600'}`}>
                    Đặc quyền gói:
                  </span>
                  <ul className="space-y-2.5 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className={`w-4 h-4 mr-2 shrink-0 ${isPopular ? 'text-amber-400' : 'text-emerald-600'}`} />
                        <span className={isPopular ? 'text-stone-200' : 'text-stone-700'}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <Button
                  variant={isPopular ? 'gold' : 'primary'}
                  className="w-full text-sm font-bold py-2.5"
                  onClick={() => handleSelectPlan(plan)}
                  isLoading={loadingPlanId === plan.id}
                >
                  <Crown className="w-4 h-4 mr-1.5" />
                  Đăng ký gói này
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust factors */}
      <div className="bg-stone-100 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-stone-600">
        <div className="flex flex-col items-center">
          <ShieldCheck className="w-6 h-6 text-primary-900 mb-2" />
          <h4 className="font-bold text-stone-900 mb-1">Thanh toán tức thì & An toàn</h4>
          <p className="text-stone-500">Hỗ trợ quét mã VietQR tự động kích hoạt tài khoản trong 30 giây.</p>
        </div>
        <div className="flex flex-col items-center">
          <Zap className="w-6 h-6 text-amber-600 mb-2" />
          <h4 className="font-bold text-stone-900 mb-1">Đa thiết bị cá nhân</h4>
          <p className="text-stone-500">Đăng nhập tối đa 2 thiết bị đồng thời (Máy tính và Điện thoại thông minh).</p>
        </div>
        <div className="flex flex-col items-center">
          <HelpCircle className="w-6 h-6 text-primary-900 mb-2" />
          <h4 className="font-bold text-stone-900 mb-1">Chính sách hoàn tiền minh bạch</h4>
          <p className="text-stone-500">Hỗ trợ khiếu nại và hoàn tiền theo quy định tài chính của tòa soạn.</p>
        </div>
      </div>
    </div>
  )
}
