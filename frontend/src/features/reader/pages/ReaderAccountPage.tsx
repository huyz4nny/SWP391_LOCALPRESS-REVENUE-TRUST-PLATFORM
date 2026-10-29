import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { APP_CONFIG } from '@/app/config'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/features/identity/api'
import { mockStore } from '@/mocks/store'
import { useReaderLibrary } from '../hooks/useReaderLibrary'
import { useReaderSubscription } from '../hooks/useReaderSubscription'

function phoneError(raw: string): string | null {
  const compact = raw.trim().replace(/[\s.-]/g, '')
  if (!compact) return null
  let local = compact
  if (local.startsWith('+84')) local = `0${local.slice(3)}`
  else if (local.startsWith('84') && local.length > 9) local = `0${local.slice(2)}`
  if (/^0(3|5|7|8|9)\d{8}$/.test(local) || /^02\d{8,9}$/.test(local)) return null
  return 'Số điện thoại không đúng định dạng Việt Nam'
}

export function ReaderAccountPage() {
  const session = mockStore.getCurrentUser()
  const library = useReaderLibrary()
  const subscription = useReaderSubscription()
  const [name, setName] = useState(session.name)
  const [email, setEmail] = useState(session.email)
  const [phone, setPhone] = useState(session.phone || '')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    authApi.getMe()
      .then((user) => {
        if (cancelled) return
        setName(user.name || '')
        setEmail(user.email || '')
        setPhone(user.phone || '')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [session.id])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const fullName = name.trim()
    if (!fullName || fullName.length > 150) {
      setError(fullName ? 'Họ tên tối đa 150 ký tự' : 'Vui lòng nhập họ tên')
      return
    }
    const invalidPhone = phoneError(phone)
    if (invalidPhone) {
      setError(invalidPhone)
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const user = await authApi.updateMe({ fullName, phone: phone.trim() })
      mockStore.setRealUser({
        ...session,
        ...user,
        createdAt: session.createdAt || new Date().toISOString(),
      })
      setName(user.name || fullName)
      setPhone(user.phone || '')
      setNotice('Đã lưu hồ sơ')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Không lưu được hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  const plan = subscription.primary

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-slate-900">Hồ sơ độc giả</h2>
        <p className="mt-1 text-sm text-slate-500">
          Thông tin tài khoản đang đăng nhập
        </p>
      </div>

      <div className={`flex flex-col justify-between gap-4 rounded-lg border p-4 sm:flex-row sm:items-center ${
        plan ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
      }`}>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {!subscription.loaded
              ? 'Đang tải gói đang dùng'
              : plan
                ? plan.planName
                : 'Chưa có gói đang hiệu lực'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {!subscription.loaded
              ? '...'
              : plan
                ? `Đọc được đến hết ngày ${formatDate(plan.endDate)}`
                : 'Bạn đang đọc bài miễn phí và bản xem trước.'}
          </p>
        </div>
        {subscription.loaded && (
          <Link
            to={plan ? '/account/subscription' : '/premium'}
            className="text-sm font-medium text-primary-900 hover:underline"
          >
            {plan ? 'Quản lý gói' : 'Xem các gói đọc'}
          </Link>
        )}
      </div>

      <form onSubmit={save} className="max-w-lg space-y-4">
        <div>
          <Label htmlFor="name">Họ và tên</Label>
          <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} disabled />
        </div>
        <div>
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} />
        </div>
        {error && <p className="text-sm text-crimson">{error}</p>}
        {notice && <p className="text-sm text-slate-700">{notice}</p>}
        <Button type="submit" isLoading={saving}>Lưu hồ sơ</Button>
      </form>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <div className="text-lg font-semibold text-slate-900 num">{library.purchasedCount}</div>
          <div className="text-xs text-slate-500">Bài mua lẻ</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <div className="text-lg font-semibold text-slate-900 num">{library.savedIds.length}</div>
          <div className="text-xs text-slate-500">Bài đã lưu</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <div className="text-lg font-semibold text-slate-900 num">{library.historyCount}</div>
          <div className="text-xs text-slate-500">Bài đã đọc</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-center">
          <div className="text-lg font-semibold text-slate-900 num">
            {APP_CONFIG.useMockApi ? mockStore.getEntitlements(session.id).activeDevices.length : '—'}
          </div>
          <div className="text-xs text-slate-500">Thiết bị</div>
        </div>
      </div>
    </div>
  )
}
