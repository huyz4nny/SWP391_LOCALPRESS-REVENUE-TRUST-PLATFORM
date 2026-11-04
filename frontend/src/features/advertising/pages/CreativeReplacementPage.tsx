import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { advertisingApi } from '../api'
import type { AdCampaign } from '../types'
import { CreativeUploadForm } from '../components/CreativeUploadForm'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDateTime } from '@/lib/format'

export function CreativeReplacementPage() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setCampaign(null)
    setError('')
    advertisingApi
      .getCampaignById(id!)
      .then((c) => {
        if (active) setCampaign(c)
      })
      .catch((e: Error) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [id, revision])
  const active = campaign?.creatives.find((c) => c.isActiveServing)
  const pending = campaign?.creatives.find((c) => c.status === 'IN_REVIEW')
  const approved = campaign?.creatives.some((c) => c.status === 'APPROVED')
  return (
    <div className="ad-page">
      <div>
        <Link to={`/advertiser/bookings/${id}`} className="text-sm text-primary-900 hover:underline">
          Về chi tiết chiến dịch
        </Link>
        <h1 className="mt-2">Thay banner</h1>
        <p className="mt-1 text-sm text-slate-600">{campaign?.name}</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!campaign && !error && <p role="status">Đang tải banner…</p>}
      {campaign && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              ['Bản đang phát', active],
              ['Bản chờ duyệt', pending],
            ].map(([title, creative]) => {
              const c = typeof creative === 'object' ? creative : undefined
              return (
                <section key={String(title)} className="space-y-3">
                  <h2>{String(title)}</h2>
                  {c ? (
                    <div className="space-y-2 rounded-lg border border-slate-200 p-4">
                      <img className="max-h-40 w-full object-contain" src={c.imageUrl} alt={c.title} />
                      <p className="text-sm">
                        v{c.versionNumber} · {c.title}
                      </p>
                      <p className="break-all text-xs text-slate-600">{c.targetUrl}</p>
                      <StatusBadge type="creative" status={c.status} />
                    </div>
                  ) : (
                    <EmptyState
                      title={title === 'Bản đang phát' ? 'Chưa có banner đang phát' : 'Không có bản chờ duyệt'}
                      description={title === 'Bản đang phát' ? campaign.stageReason : undefined}
                    />
                  )}
                </section>
              )
            })}
          </div>
          {approved && !['CANCELLED', 'COMPLETED', 'REJECTED', 'PAUSED'].includes(campaign.status) ? (
            pending ? (
              <p className="text-sm text-slate-600">
                Đã có banner chờ duyệt. Bạn có thể gửi bản thay thế tiếp theo sau khi có kết quả.
              </p>
            ) : (
              <CreativeUploadForm
                key={revision}
                campaign={campaign}
                replacement
                onUploaded={() => setRevision((r) => r + 1)}
              />
            )
          ) : (
            <p className="text-sm text-slate-600">
              Thay banner cần một phiên bản đã được duyệt và chiến dịch còn nhận thay đổi.
            </p>
          )}
          <section className="space-y-3">
            <h2>Lịch sử phiên bản</h2>
            <div className="ad-table-frame">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Phiên bản</th>
                    <th>Trạng thái</th>
                    <th>Lý do / thời điểm mong muốn</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.creatives.map((c) => (
                    <tr key={c.id}>
                      <td>
                        v{c.versionNumber} · {c.title}
                        <div className="mt-1 text-xs text-slate-600">{formatDateTime(c.uploadedAt)}</div>
                      </td>
                      <td>
                        <StatusBadge type="creative" status={c.status} />
                        <p className="mt-1 text-xs text-slate-600">{c.reviewNotes}</p>
                      </td>
                      <td>
                        {c.replacementReason || 'Nộp ban đầu'}
                        <p className="mt-1 text-xs text-slate-600">
                          {c.requestedEffectiveAt ? formatDateTime(c.requestedEffectiveAt) : 'Không hẹn thời điểm'}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
