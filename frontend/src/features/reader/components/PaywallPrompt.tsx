import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Article } from '../types'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'
import { Crown, Sparkles, Check, Lock, ShieldCheck } from 'lucide-react'

interface PaywallPromptProps {
  article: Article
}

export function PaywallPrompt({ article }: PaywallPromptProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const currentUser = mockStore.getCurrentUser()

  const handlePurchaseSingleArticle = async () => {
    if (currentUser.role === 'GUEST') {
      navigate('/login', { state: { from: { pathname: `/articles/${article.slug}` } } })
      return
    }

    setIsLoading(true)
    try {
      // Create Order for single article
      const order = await httpClient.post<any>('/finance/checkout', {
        orderType: 'ARTICLE_PURCHASE',
        targetId: article.id,
        targetTitle: article.title,
        amount: article.price || 15000,
        paymentMethod: 'VIETQR',
      })
      navigate(`/checkout/${order.id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChooseSubscription = () => {
    navigate('/premium', { state: { returnUrl: `/articles/${article.slug}` } })
  }

  return (
    <div className="relative mt-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-stone-900 via-primary-950 to-stone-900 text-white shadow-2xl border border-amber-500/30 overflow-hidden">
      {/* Decorative gradient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <div className="inline-flex items-center space-x-1.5 bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30 mb-4">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>NỘI DUNG ĐẶC QUYỀN LOCALPRESS PREMIUM</span>
        </div>

        <h3 className="font-serif text-xl sm:text-2xl font-bold leading-tight mb-2">
          Mở khóa bài phóng sự điều tra chuyên sâu
        </h3>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed mb-6">
          Bạn vừa đọc xong phần trích đoạn xem thử miễn phí. Toàn bộ tài liệu, dữ liệu điều tra và phân tích độc quyền của phóng viên tòa soạn được bảo hộ dưới chính sách Paywall chất lượng cao.
        </p>

        {/* Options grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left my-6">
          {/* Option 1: Buy single article */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-amber-400/40 transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Lựa chọn 1: Mua lẻ
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-extrabold text-white">
                  {formatCurrency(article.price || 15000)}
                </span>
                <span className="text-xs text-stone-400 ml-1">/ bài này</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-stone-300">
                <li className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
                  Đọc toàn văn vĩnh viễn bài phóng sự này
                </li>
                <li className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
                  Lưu vào Tủ sách cá nhân của bạn
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePurchaseSingleArticle}
              isLoading={isLoading}
              className="mt-4 w-full border-amber-400/40 text-amber-200 hover:bg-amber-400/10"
            >
              Mua lẻ bài viết ngay
            </Button>
          </div>

          {/* Option 2: Subscription (Best value) */}
          <div className="bg-amber-500/10 border-2 border-amber-500/60 rounded-xl p-5 hover:border-amber-400 transition-all flex flex-col justify-between relative">
            <div className="absolute -top-2.5 right-3 bg-amber-500 text-stone-950 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Khuyên dùng
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                Lựa chọn 2: Gói Độc Giả VIP
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-extrabold text-amber-400">59.000 ₫</span>
                <span className="text-xs text-stone-300 ml-1">/ tháng (từ 1.900đ/ngày)</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-stone-200">
                <li className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
                  Mở khóa 100% bài viết Premium toàn tòa soạn
                </li>
                <li className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
                  Loại bỏ quảng cáo xen bài phiền hà
                </li>
                <li className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
                  Đăng nhập trên 2 thiết bị cá nhân
                </li>
              </ul>
            </div>

            <Button
              variant="gold"
              size="sm"
              onClick={handleChooseSubscription}
              className="mt-4 w-full"
            >
              <Crown className="w-3.5 h-3.5 mr-1" />
              Xem các gói & Đăng ký
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4 text-[11px] text-stone-400 pt-2">
          <span className="flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            Thanh toán an toàn qua VietQR / Chuyển khoản
          </span>
          <span>•</span>
          <span>Hỗ trợ xuất hóa đơn điện tử</span>
        </div>
      </div>
    </div>
  )
}
