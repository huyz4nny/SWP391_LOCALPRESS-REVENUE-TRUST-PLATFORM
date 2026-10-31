// Tác dụng: hộp khóa bài Premium (UC034) — mua lẻ tạo purchase PENDING rồi `/payment`, hoặc sang `/premium`.
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Article } from '../types'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { paymentPath } from '@/features/finance/api/payment'
import { mockStore } from '@/mocks/store'
import { readerApi } from '../api'
import { Crown, Sparkles, Check, Lock, ShieldCheck } from 'lucide-react'

interface PaywallPromptProps {
  article: Article
}

// UC034 khung mua le khi bai Premium con khoa. 2 nut: mua le (SV3+SV4) va xem goi (qua /premium)
export function PaywallPrompt({ article }: PaywallPromptProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const currentUser = mockStore.getCurrentUser()

  const handlePurchaseSingleArticle = async () => {
    // chua login thi sang /login, xong quay lai dung bai nay
    if (currentUser.role === 'GUEST') {
      navigate('/login', { state: { from: { pathname: `/articles/${article.slug}` } } })
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const target = await readerApi.createArticlePurchase(article.id)
      navigate(paymentPath({ orderCode: target.orderCode }), { state: { returnUrl: `/articles/${article.slug}` } })
    } catch (err) {
      // các lỗi như đã mua rồi hoặc đã có gói bao trùm được hiện cho khách thay vì chỉ ghi console
      console.error(err)
      setError(err instanceof Error ? err.message : 'Không thể tạo đơn mua bài, vui lòng thử lại')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChooseSubscription = () => {
    navigate('/premium', { state: { returnUrl: `/articles/${article.slug}` } })
  }

  // khung den duoi preview: 2 the mua le / xem goi
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

        {/* 2 the: mua le ben trai, goi VIP ben phai */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left my-6">
          {/* the Mua le: gia bai + nut Mua le bai viet ngay */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-amber-400/40 transition-all flex flex-col justify-between">
            <div>
              <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Lựa chọn 1: Mua lẻ
              </div>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-extrabold text-white">
                  {formatCurrency(article.price)}
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

            {/* nut tao don mua le roi sang /payment */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePurchaseSingleArticle}
              isLoading={isLoading}
              className="mt-4 w-full border-amber-400/40 text-amber-200 hover:bg-amber-400/10"
            >
              Mua lẻ bài viết ngay
            </Button>
            {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          </div>

          {/* the goi VIP + nhan Khuyen dung + nut Xem cac goi */}
          <div className="bg-amber-500/10 border-2 border-amber-500/60 rounded-xl p-5 hover:border-amber-400 transition-all flex flex-col justify-between relative">
            <div className="absolute -top-2.5 right-3 bg-amber-500 text-stone-950 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              Khuyên dùng
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                Lựa chọn 2: Gói Độc Giả VIP
              </div>
              <div className="mt-1 text-sm text-amber-100">
                Giá và phạm vi theo từng gói đang bán
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-stone-200">
                <li className="flex items-center">
                  <Check className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
                  Đọc các bài thuộc phạm vi của gói đã mua
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
