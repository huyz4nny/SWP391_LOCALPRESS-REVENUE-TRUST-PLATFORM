import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { advertisingApi } from '../api'
import type { AdvertiserContract, CampaignSummary } from '../types'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/format'

function fileLink(url: string) {
  return /^https?:\/\//i.test(url) || /^\/api\//.test(url) ? url : undefined
}
export function AdvertiserDocumentsPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[] | null>(null)
  const [contracts, setContracts] = useState<AdvertiserContract[]>([])
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([advertisingApi.getDocuments(), advertisingApi.getMyContracts()])
      .then(([c, result]) => {
        if (active) {
          setCampaigns(c)
          setContracts(result.items)
          setAvailable(result.available)
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <div className="ad-page">
      <div>
        <h1>Hợp đồng và chứng từ</h1>
        <p className="mt-1 text-sm text-slate-600">Hồ sơ quảng cáo và biên bản nghiệm thu theo từng chiến dịch.</p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!campaigns && !error && <p role="status">Đang tải hồ sơ quảng cáo…</p>}
      {campaigns && (
        <>
          <section className="space-y-3">
            <h2>Hợp đồng</h2>
            {available && contracts.length > 0 ? (
              <div className="ad-table-frame">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Số hợp đồng / ngày ký</th>
                      <th>Chiến dịch</th>
                      <th className="ad-number">Giá trị</th>
                      <th>Tình trạng / file</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c) => (
                      <tr key={c.contractId}>
                        <td>
                          {c.contractNumber}
                          <p className="mt-1 text-xs text-slate-600">{formatDate(c.signingDate)}</p>
                        </td>
                        <td>
                          <Link to={`/advertiser/bookings/${c.campaignId}`}>{c.campaignName}</Link>
                          <p className="mt-1 text-xs text-slate-600">
                            {campaigns.find((r) => r.campaignId === String(c.campaignId))?.stageReason}
                          </p>
                        </td>
                        <td className="ad-number">{formatCurrency(c.contractValue)}</td>
                        <td>
                          {c.status}
                          <p className="mt-1">
                            {fileLink(c.contractFileUrl) ? (
                              <a href={fileLink(c.contractFileUrl)} target="_blank" rel="noopener noreferrer">
                                Có · Mở hợp đồng
                              </a>
                            ) : (
                              'Chưa phát hành file'
                            )}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : campaigns.some((c) => c.contractNumber) ? (
              <div className="ad-table-frame">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Số hợp đồng đã ghi nhận</th>
                      <th>Chiến dịch</th>
                      <th>File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns
                      .filter((c) => c.contractNumber)
                      .map((c) => (
                        <tr key={c.campaignId}>
                          <td>{c.contractNumber}</td>
                          <td>
                            <Link to={`/advertiser/bookings/${c.campaignId}`}>{c.campaignName}</Link>
                          </td>
                          <td>
                            {fileLink(c.contractFileUrl) ? (
                              <a href={fileLink(c.contractFileUrl)} target="_blank" rel="noopener noreferrer">
                                Có · Mở hợp đồng
                              </a>
                            ) : (
                              'Chưa phát hành'
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Chưa có dữ liệu hợp đồng"
                description="Hợp đồng xuất hiện sau khi tòa soạn phát hành và gắn với chiến dịch."
              />
            )}
          </section>
          <section className="space-y-3">
            <h2>Chứng từ theo chiến dịch</h2>
            {campaigns.length === 0 ? (
              <EmptyState title="Chưa có chiến dịch để lập chứng từ" />
            ) : (
              <div className="ad-table-frame">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Chiến dịch</th>
                      <th>Thanh toán / vận hành</th>
                      <th>Hóa đơn mô phỏng</th>
                      <th>Biên nhận</th>
                      <th>Nghiệm thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.campaignId}>
                        <td>
                          <Link to={`/advertiser/bookings/${c.campaignId}`}>{c.campaignName}</Link>
                          <p className="mt-1 text-xs text-slate-600">
                            {formatDate(c.startDate)} – {formatDate(c.endDate)}
                          </p>
                        </td>
                        <td className="space-y-2">
                          <StatusBadge type="payment" status={c.paymentStatus} />
                          <div>
                            <StatusBadge type="stage" status={c.stage} />
                          </div>
                        </td>
                        <td className="text-slate-600">Chưa có dữ liệu</td>
                        <td className="text-slate-600">Chưa có</td>
                        <td>
                          {c.acceptanceAvailable ? (
                            <Link to={`/advertiser/campaigns/${c.campaignId}/acceptance`}>Có · Xem biên bản</Link>
                          ) : (
                            <>
                              <span>
                                {['CANCELLED', 'REJECTED'].includes(c.stage) ? 'Không áp dụng' : 'Chưa phát hành'}
                              </span>
                              <p className="mt-1 max-w-48 text-xs text-slate-600">{c.acceptanceReason}</p>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
