import { useEffect, useState } from 'react'
import { advertisingApi } from '../api'
import { AdvertiserProfile, AdvertiserProfileInput } from '../types'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { mockStore } from '@/mocks/store'

const emptyProfile: AdvertiserProfileInput = {
  companyName: '', taxCode: '', contactPerson: '', email: '', phone: '', address: '', businessLicenseUrl: '',
}

export function CompanyProfilePage() {
  const [profile, setProfile] = useState<AdvertiserProfileInput>(emptyProfile)
  const [status, setStatus] = useState<AdvertiserProfile['verificationStatus'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    advertisingApi.getProfile()
      .then((data) => {
        if (data) {
          setProfile(data)
          setStatus(data.verificationStatus)
        }
      })
      .catch((error) => {
        if (error.status !== 404) setMessage(error.message || 'Không tải được hồ sơ doanh nghiệp')
      })
      .finally(() => setLoading(false))
  }, [])

  const change = (field: keyof AdvertiserProfileInput, value: string) =>
    setProfile((current) => ({ ...current, [field]: value }))

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const updated = await advertisingApi.saveProfile(profile)
      setProfile(updated)
      setStatus(updated.verificationStatus)
      mockStore.updateCurrentCompanyName(updated.companyName)
      setMessage('Đã lưu hồ sơ doanh nghiệp')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không lưu được hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Đang tải hồ sơ...</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hồ sơ doanh nghiệp</h1>
        <p className="mt-1 text-sm text-slate-500">Thông tin pháp nhân và liên hệ dùng cho quảng cáo.</p>
        {status && <p className="mt-2 text-xs text-slate-600">Trạng thái xác minh: {status}</p>}
      </div>
      <form onSubmit={save} className="space-y-4">
        {([
          ['companyName', 'Tên doanh nghiệp', 'text'],
          ['taxCode', 'Mã số thuế', 'text'],
          ['contactPerson', 'Người liên hệ', 'text'],
          ['email', 'Email liên hệ', 'email'],
          ['phone', 'Số điện thoại', 'tel'],
          ['address', 'Địa chỉ', 'text'],
          ['businessLicenseUrl', 'Liên kết giấy phép kinh doanh', 'url'],
        ] as const).map(([field, label, type]) => (
          <div key={field}>
            <Label htmlFor={field} required={field !== 'address' && field !== 'businessLicenseUrl'}>{label}</Label>
            <Input id={field} type={type} value={profile[field] || ''}
              onChange={(event) => change(field, event.target.value)}
              required={field !== 'address' && field !== 'businessLicenseUrl'}
              maxLength={{ companyName: 255, taxCode: 50, contactPerson: 150, email: 255,
                phone: 20, address: 500, businessLicenseUrl: 1000 }[field]} />
          </div>
        ))}
        {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
        <Button type="submit" isLoading={saving}>Lưu hồ sơ</Button>
      </form>
    </div>
  )
}
