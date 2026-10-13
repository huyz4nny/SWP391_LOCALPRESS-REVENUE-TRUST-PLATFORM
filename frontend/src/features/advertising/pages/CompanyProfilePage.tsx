import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { advertisingApi } from '../api'
import { AdvertiserProfile, AdvertiserProfileChange, AdvertiserProfileInput } from '../types'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { mockStore } from '@/mocks/store'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateTime } from '@/lib/format'
import { AppApiError } from '@/lib/http/errors'
import { companyProfileSchema } from '../schemas/companyProfile'

const emptyProfile: AdvertiserProfileInput = {
  companyName: '', taxCode: '', contactPerson: '', email: '', phone: '', address: '', businessLicenseUrl: '',
  businessSector: '', invoiceName: '', invoiceTaxCode: '', invoiceAddress: '', invoiceEmail: '',
}

const historyFields = [
  ['companyName', 'Tên doanh nghiệp'], ['taxCode', 'Mã số thuế'],
  ['businessSector', 'Lĩnh vực kinh doanh'], ['contactPerson', 'Người liên hệ'],
  ['email', 'Email liên hệ'], ['phone', 'Số điện thoại'], ['address', 'Địa chỉ'],
  ['businessLicenseUrl', 'Giấy phép kinh doanh'], ['invoiceName', 'Tên xuất hóa đơn'],
  ['invoiceTaxCode', 'Mã số thuế hóa đơn'], ['invoiceAddress', 'Địa chỉ hóa đơn'],
  ['invoiceEmail', 'Email nhận hóa đơn'], ['verificationStatus', 'Trạng thái xác minh'],
] as const

export function CompanyProfilePage() {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<AdvertiserProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: emptyProfile,
    mode: 'onTouched',
  })
  const [status, setStatus] = useState<AdvertiserProfile['verificationStatus'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<AdvertiserProfileChange[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  const loadHistory = useCallback(() => advertisingApi.getProfileHistory()
    .then(setHistory)
    .catch((error) => {
      setHistoryError(error instanceof Error ? error.message : 'Không tải được lịch sử thay đổi')
    })
    .finally(() => setHistoryLoading(false)), [])

  useEffect(() => {
    advertisingApi.getProfile()
      .then((data) => {
        if (data) {
          reset({ ...data, address: data.address || '', businessLicenseUrl: data.businessLicenseUrl || '',
            businessSector: data.businessSector || '',
            invoiceName: data.invoiceName || data.companyName,
            invoiceTaxCode: data.invoiceTaxCode || data.taxCode,
            invoiceAddress: data.invoiceAddress || data.address || '',
            invoiceEmail: data.invoiceEmail || data.email })
          setStatus(data.verificationStatus)
        }
      })
      .catch((error) => {
        if (error.status !== 404) setMessage(error.message || 'Không tải được hồ sơ doanh nghiệp')
      })
      .finally(() => setLoading(false))
    void loadHistory()
  }, [reset, loadHistory])

  const save = async (profile: AdvertiserProfileInput) => {
    setMessage('')
    try {
      const updated = await advertisingApi.saveProfile(profile)
      reset(updated)
      setStatus(updated.verificationStatus)
      mockStore.updateCurrentCompanyName(updated.companyName)
      setMessage('Đã lưu hồ sơ doanh nghiệp')
      setHistoryLoading(true)
      setHistoryError('')
      await loadHistory()
    } catch (error) {
      if (error instanceof AppApiError && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in companyProfileSchema.shape) {
            setError(field as keyof AdvertiserProfileInput, { type: 'server', message })
          }
        }
      }
      setMessage(error instanceof Error ? error.message : 'Không lưu được hồ sơ')
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
      <form onSubmit={handleSubmit(save)} noValidate className="space-y-4">
        <fieldset disabled={isSubmitting} className="space-y-4">
        {([
          ['companyName', 'Tên doanh nghiệp', 'text'],
          ['taxCode', 'Mã số thuế', 'text'],
          ['businessSector', 'Lĩnh vực kinh doanh', 'text'],
          ['contactPerson', 'Người liên hệ', 'text'],
          ['email', 'Email liên hệ', 'email'],
          ['phone', 'Số điện thoại', 'tel'],
          ['address', 'Địa chỉ', 'text'],
          ['businessLicenseUrl', 'Liên kết giấy phép kinh doanh', 'url'],
          ['invoiceName', 'Tên xuất hóa đơn', 'text'],
          ['invoiceTaxCode', 'Mã số thuế xuất hóa đơn', 'text'],
          ['invoiceAddress', 'Địa chỉ xuất hóa đơn', 'text'],
          ['invoiceEmail', 'Email nhận hóa đơn', 'email'],
        ] as const).map(([field, label, type]) => (
          <div key={field}>
            <Label htmlFor={field} required={field !== 'address' && field !== 'businessLicenseUrl'}>{label}</Label>
            <Input id={field} type={type} {...register(field)}
              error={errors[field]?.message} aria-invalid={Boolean(errors[field])}
              required={field !== 'address' && field !== 'businessLicenseUrl'}
              maxLength={{ companyName: 255, taxCode: 50, businessSector: 150,
                contactPerson: 150, email: 255, phone: 20, address: 500,
                businessLicenseUrl: 1000, invoiceName: 255, invoiceTaxCode: 50,
                invoiceAddress: 500, invoiceEmail: 255 }[field]} />
          </div>
        ))}
        </fieldset>
        {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
        <Button type="submit" isLoading={isSubmitting}>Lưu hồ sơ</Button>
      </form>
      <section aria-label="Lịch sử thay đổi hồ sơ" className="space-y-3 border-t pt-5">
        <h2 className="font-semibold text-slate-900">Lịch sử thay đổi</h2>
        {historyLoading && <p role="status" className="text-sm text-slate-500">Đang tải lịch sử...</p>}
        {historyError && <div role="alert" className="space-y-2 text-sm text-red-700">
          <p>Không tải được lịch sử thay đổi: {historyError}</p>
          <Button type="button" variant="outline" onClick={() => {
            setHistoryLoading(true)
            setHistoryError('')
            void loadHistory()
          }}>Thử lại</Button>
        </div>}
        {!historyLoading && !historyError && history.length === 0 && <EmptyState title="Chưa có thay đổi nào được ghi nhận" />}
        {!historyLoading && !historyError && history.map((entry) => (
          <div key={entry.id} className="rounded border border-slate-200 p-3 text-sm">
            <p className="font-medium">{entry.action === 'CREATE' ? 'Tạo hồ sơ' : 'Cập nhật hồ sơ'} · {formatDateTime(entry.createdAt)}</p>
            <ul className="mt-1 space-y-1 text-slate-600">
              {historyFields.filter(([field]) => entry.oldValue?.[field] !== entry.newValue[field]).map(([field, label]) => (
                <li key={field}>{label}: {entry.oldValue ? `${entry.oldValue[field] || '—'} → ` : ''}{entry.newValue[field] || '—'}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  )
}
