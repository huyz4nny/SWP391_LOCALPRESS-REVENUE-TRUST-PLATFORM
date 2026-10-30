import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { mockStore } from '@/mocks/store'
import { readerApi } from '../api'

const REASONS = [
  { value: 'INCORRECT_INFO', label: 'Sai thông tin' },
  { value: 'TYPO', label: 'Lỗi chính tả' },
  { value: 'IMAGE_ERROR', label: 'Ảnh lỗi' },
  { value: 'OTHER', label: 'Khác' },
]

// UC042 bao loi noi dung bai, 1 PENDING / user+bai, Phan duyet chu khong phai SV3
export function ArticleReportBox({ articleId }: { articleId: string }) {
  const location = useLocation()
  const signedIn = mockStore.getCurrentUser().role !== 'GUEST'
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('INCORRECT_INFO')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (description.trim().length > 1000) {
      setError('Mô tả tối đa 1000 ký tự')
      return
    }
    setSending(true)
    setError('')
    try {
      await readerApi.reportArticle(articleId, reason, description.trim())
      setNotice('Đã gửi báo cáo. Tòa soạn sẽ xem khi xử lý nội dung.')
      setOpen(false)
      setDescription('')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Không gửi được báo cáo')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-6 border-t border-slate-200 pt-4">
      {notice && <p className="text-sm text-slate-700">{notice}</p>}
      {!signedIn ? (
        <Link
          to="/login"
          state={{ from: { pathname: location.pathname } }}
          className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
        >
          Đăng nhập để báo lỗi nội dung bài
        </Link>
      ) : !open ? (
        <button type="button" className="text-sm text-slate-600 hover:text-slate-900 hover:underline" onClick={() => setOpen(true)}>
          Báo lỗi nội dung bài
        </button>
      ) : (
        <form onSubmit={submit} className="max-w-lg space-y-3">
          <label className="block text-sm text-slate-700" htmlFor="article-report-reason">
            Lý do
            <select
              id="article-report-reason"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              {REASONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-700" htmlFor="article-report-note">
            Mô tả (không bắt buộc)
            <Textarea
              id="article-report-note"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1"
            />
          </label>
          {error && <p className="text-sm text-crimson">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" isLoading={sending}>Gửi báo cáo</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
          </div>
        </form>
      )}
    </div>
  )
}
