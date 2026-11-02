// Tác dụng: trang `/account/subscription` (UC044) — gói đang hiệu lực, tắt gia hạn, link mua gói / khiếu nại.
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { ReaderSubscription } from '../api'
import { useReaderSubscription } from '../hooks/useReaderSubscription'

function scopeText(item: ReaderSubscription) {
  if (item.accessScope === 'CATEGORY' && item.categoryName) {
    return `Đọc bài Premium thuộc chuyên mục ${item.categoryName}`
  }
  return 'Đọc bài Premium toàn trang'
}

function PlanFacts({ item }: { item: ReaderSubscription }) {
  const facts = [scopeText(item)]
  if (item.hasAdFree) facts.push('Không hiện quảng cáo khi đọc bài')
  if (item.hasAudio) facts.push('Gói có bản nghe')
  return (
    <ul className="space-y-1 text-sm text-slate-700">
      {facts.map((fact) => (
        <li key={fact}>{fact}</li>
      ))}
    </ul>
  )
}

// trang /account/subscription: the goi dang dung + ky xep sau + nut tat gia han
export function ReaderSubscriptionPage() {
  const subscription = useReaderSubscription()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    subscription.reload()
  }, [subscription.reload])

  const cancel = async () => {
    if (!confirmId) return
    setSaving(true)
    setActionError('')
    try {
      await subscription.cancelAutoRenew(confirmId)
      setConfirmId(null)
    } catch (err) {
      setActionError(err instanceof Error && err.message ? err.message : 'Không tắt được gia hạn')
    } finally {
      setSaving(false)
    }
  }

  if (!subscription.loaded) {
    return <p className="text-sm text-slate-500">Đang tải gói đang dùng...</p>
  }

  if (subscription.error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-crimson">{subscription.error}</p>
        <Button variant="outline" size="sm" onClick={subscription.reload}>Tải lại</Button>
      </div>
    )
  }

  const primary = subscription.primary

  return (
    <div className="space-y-6">
      {/* tieu de trang goi hoi vien */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-slate-900">Gói hội viên</h2>
        <p className="mt-1 text-sm text-slate-500">
          Gói đang hiệu lực, ngày hết hạn và gia hạn kỳ sau
        </p>
      </div>

      {!primary && subscription.others.length === 0 ? (
        <div className="rounded-lg border border-slate-200 p-6 text-center">
          {/* hop rong: chua co goi + nut Xem cac goi doc */}
          <h3 className="font-serif text-xl font-bold text-slate-900">Chưa có gói đang dùng</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Bạn vẫn đọc được bài miễn phí và bản xem trước. Mua gói để đọc bài Premium trong phạm vi của gói.
          </p>
          <Link
            to="/premium"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-primary-900 px-4 text-sm font-medium text-white hover:bg-primary-800"
          >
            Xem các gói đọc
          </Link>
        </div>
      ) : primary ? (
        <section className="rounded-lg border border-slate-200 p-5">
          {/* the goi dang hieu luc: badge vang + ten + ngay het han */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="gold">Đang hiệu lực</Badge>
            <span className="text-sm text-slate-600">
              Đến hết ngày <span className="font-medium text-slate-900">{formatDate(primary.endDate)}</span>
            </span>
          </div>
          <h3 className="mt-3 font-serif text-2xl font-bold text-slate-900">{primary.planName}</h3>
          <p className="mt-1 text-sm text-slate-500 num">{formatCurrency(primary.price)}</p>
          <div className="mt-4">
            <PlanFacts item={primary} />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            Từ {formatDate(primary.startDate)} đến {formatDate(primary.endDate)}.
            {primary.autoRenew
              ? ' Gia hạn tự động đang bật cho kỳ sau.'
              : ' Gia hạn tự động đang tắt. Bạn vẫn đọc được đến hết ngày trên.'}
          </p>
          {actionError && <p className="mt-3 text-sm text-crimson">{actionError}</p>}
          {/* hang nut: Mua hoac doi goi / Tat gia han / Khieu nai */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <Link to="/premium" className="text-sm font-medium text-primary-900 hover:underline">
              Mua hoặc đổi gói
            </Link>
            {primary.autoRenew && (
              <Button variant="outline" size="sm" onClick={() => setConfirmId(primary.subscriptionId)}>
                Tắt gia hạn
              </Button>
            )}
            <Link to="/account/support" className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
              Khiếu nại thanh toán
            </Link>
          </div>
        </section>
      ) : null}

      {subscription.others.length > 0 && (
        <section className="space-y-2">
          {/* list ky xep sau / ky khac: nhan Dang hieu luc hoac Chua toi ngay bat dau */}
          <h3 className="text-sm font-medium text-slate-900">Kỳ khác còn hiệu lực hoặc sắp bắt đầu</h3>
          {subscription.others.map((item) => (
            <div key={item.subscriptionId} className="rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{item.planName}</span>
                <span className="text-xs text-slate-500">{item.inEffect ? 'Đang hiệu lực' : 'Chưa tới ngày bắt đầu'}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{scopeText(item)}</p>
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(item.startDate)} – {formatDate(item.endDate)}. {item.autoRenew ? 'Có gia hạn' : 'Không gia hạn'}
              </p>
              {item.autoRenew && (
                <Button className="mt-2" variant="outline" size="sm" onClick={() => setConfirmId(item.subscriptionId)}>
                  Tắt gia hạn kỳ này
                </Button>
              )}
            </div>
          ))}
        </section>
      )}

      {/* hop xac nhan tat gia han */}
      <ConfirmDialog
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={cancel}
        title="Tắt gia hạn tự động"
        message="Kỳ đã trả tiền vẫn đọc được đến hết ngày hết hạn. Kỳ sau sẽ không tự tạo."
        confirmText="Tắt gia hạn"
        isLoading={saving}
      />
    </div>
  )
}
