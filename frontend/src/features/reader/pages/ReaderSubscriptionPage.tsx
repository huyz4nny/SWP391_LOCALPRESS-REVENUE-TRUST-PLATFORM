import React from 'react'
import { Link } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Crown, CheckCircle2, ShieldAlert, Sparkles, ArrowRight } from 'lucide-react'

export function ReaderSubscriptionPage() {
  const currentUser = mockStore.getCurrentUser()
  const entitlement = mockStore.getEntitlements(currentUser.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Gói đọc & Đặc quyền VIP</h2>
        <p className="text-xs text-stone-500 mt-1">
          Quản lý thời hạn và các đặc quyền hội viên của tài khoản
        </p>
      </div>

      {entitlement.hasSubscription ? (
        <div className="bg-gradient-to-br from-stone-900 via-primary-950 to-stone-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-amber-500/40 relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="bg-amber-500 text-stone-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center">
                <Crown className="w-3.5 h-3.5 mr-1" />
                Gói Đang Hoạt Động
              </span>
              <span className="text-xs text-stone-400">
                Hiệu lực đến: <strong className="text-amber-300 font-bold">{formatDate(entitlement.subscriptionExpiresAt)}</strong>
              </span>
            </div>

            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              {entitlement.subscriptionPlanName}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-stone-200">
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                Đọc không giới hạn toàn bộ bài viết điều tra
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                Loại bỏ quảng cáo xen kẽ trong bài viết
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                Giới hạn tối đa 2 thiết bị cá nhân đồng thời
              </div>
              <div className="flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2 shrink-0" />
                Được ưu tiên kiểm duyệt bình luận nhanh
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 flex flex-wrap items-center justify-between gap-4">
              <Link
                to="/premium"
                className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-2xs"
              >
                Gia hạn hoặc nâng cấp gói
              </Link>
              <Link
                to="/account/support"
                className="text-xs text-stone-400 hover:text-stone-200 underline"
              >
                Yêu cầu khiếu nại hoặc hoàn tiền gói
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Crown className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Bạn chưa có gói Hội Viên Premium
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-md mx-auto">
              Đăng ký ngay hôm nay từ 59.000 ₫/tháng để ủng hộ báo chí địa phương độc lập và đọc trọn vẹn mọi chuyên đề điều tra.
            </p>
          </div>
          <Link
            to="/premium"
            className="inline-flex items-center bg-primary-900 hover:bg-primary-800 text-white font-bold text-xs px-6 py-2.5 rounded-lg shadow-sm"
          >
            <Crown className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Xem các gói đọc & Đăng ký ngay
          </Link>
        </div>
      )}
    </div>
  )
}
