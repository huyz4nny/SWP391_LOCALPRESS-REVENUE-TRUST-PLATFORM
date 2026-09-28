import React, { useState } from 'react'
import { mockStore } from '@/mocks/store'
import { formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Crown, ShieldCheck, Mail, Phone, Calendar, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ReaderAccountPage() {
  const currentUser = mockStore.getCurrentUser()
  const entitlement = mockStore.getEntitlements(currentUser.id)

  const [name, setName] = useState(currentUser.name)
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [isSaved, setIsSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    currentUser.name = name
    currentUser.phone = phone
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Hồ sơ độc giả</h2>
        <p className="text-xs text-stone-500 mt-1">
          Quản lý thông tin cá nhân và thiết lập tài khoản đọc báo LocalPress
        </p>
      </div>

      {/* Subscription Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        entitlement.hasSubscription
          ? 'bg-amber-50/80 border-amber-300 text-amber-950'
          : 'bg-stone-50 border-stone-200 text-stone-800'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            entitlement.hasSubscription ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-600'
          }`}>
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">
              {entitlement.hasSubscription
                ? `Hội viên VIP: ${entitlement.subscriptionPlanName}`
                : 'Tài khoản Độc giả Tiêu chuẩn (Miễn phí)'}
            </h4>
            <p className="text-xs opacity-80">
              {entitlement.hasSubscription
                ? `Hạn dùng đến hết ngày ${formatDate(entitlement.subscriptionExpiresAt)}`
                : 'Bạn đang đọc bài miễn phí và các bản xem trước. Nâng cấp để đọc toàn bộ phóng sự.'}
            </p>
          </div>
        </div>

        {entitlement.hasSubscription ? (
          <Link
            to="/account/subscription"
            className="text-xs font-semibold text-amber-800 hover:underline shrink-0"
          >
            Quản lý gói VIP →
          </Link>
        ) : (
          <Link
            to="/premium"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 transition-colors shadow-2xs"
          >
            Nâng cấp Premium
          </Link>
        )}
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleSave} className="space-y-4 max-w-lg">
        <div>
          <Label htmlFor="name">Họ và tên</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <Label htmlFor="email">Địa chỉ Email (Cố định)</Label>
          <Input id="email" value={currentUser.email} disabled className="bg-stone-100 cursor-not-allowed" />
        </div>

        <div>
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <Button type="submit">Lưu thay đổi</Button>
          {isSaved && <span className="text-xs text-emerald-600 font-semibold">✓ Đã lưu thành công!</span>}
        </div>
      </form>

      {/* Summary stats */}
      <div className="pt-6 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="p-3 bg-stone-50 rounded-lg">
          <div className="text-lg font-bold text-stone-900">{entitlement.purchasedArticleIds.length}</div>
          <div className="text-[11px] text-stone-500">Bài mua lẻ</div>
        </div>
        <div className="p-3 bg-stone-50 rounded-lg">
          <div className="text-lg font-bold text-stone-900">{entitlement.bookmarkedArticleIds.length}</div>
          <div className="text-[11px] text-stone-500">Bài đã lưu</div>
        </div>
        <div className="p-3 bg-stone-50 rounded-lg">
          <div className="text-lg font-bold text-stone-900">{entitlement.readingHistory.length}</div>
          <div className="text-[11px] text-stone-500">Bài đã đọc</div>
        </div>
        <div className="p-3 bg-stone-50 rounded-lg">
          <div className="text-lg font-bold text-stone-900">{entitlement.activeDevices.length}/2</div>
          <div className="text-[11px] text-stone-500">Thiết bị đang dùng</div>
        </div>
      </div>
    </div>
  )
}
