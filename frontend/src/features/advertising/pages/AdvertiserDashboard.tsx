import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { advertisingApi } from '../api'
import type { AdBooking, AdvertiserDashboardData, DailyPerformance } from '../types'
import { downloadCsv, toCsv } from '../lib/csv'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'

function localDate(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date)
}
export function AdvertiserDashboard() {
  const [from, setFrom] = useState(() => localDate(-29))
  const [to, setTo] = useState(() => localDate())
  const [campaignId, setCampaignId] = useState('')
  const [choices, setChoices] = useState<AdBooking[]>([])
  const [data, setData] = useState<AdvertiserDashboardData | null>(null)
  const [daily, setDaily] = useState<DailyPerformance[]>([])
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    setData(null)
    setDaily([])
    setError('')
    const params = { from, to, campaignId: campaignId || undefined }
    Promise.all([
      advertisingApi.getDashboard(params),
      advertisingApi.getPerformance(params),
      advertisingApi.getMyBookings(),
    ])
      .then(([dashboard, performance, bookings]) => {
        if (active) {
          setData(dashboard)
          setDaily(performance)
          setChoices(bookings)
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [from, to, campaignId, refresh])
  const exportCsv = () =>
    downloadCsv(
      `hieu-suat-${from}-${to}.csv`,
      toCsv(
        daily.map((row) => ({ ...row })),
        [
          ['campaignName', 'Chiến dịch'],
          ['date', 'Ngày'],
          ['impressions', 'Lượt hiển thị'],
          ['clicks', 'Click hợp lệ'],
          ['ctr', 'CTR (%)'],
        ],
      ),
    )
  return (
    <div className="ad-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1>Tổng quan quảng cáo</h1>
          <p className="mt-1 text-sm text-slate-600">Hiệu suất và tiến độ các chiến dịch của doanh nghiệp.</p>
        </div>
        <Link to="/advertiser/bookings/new">
          <Button size="sm">Đặt vị trí mới</Button>
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-slate-600">
          Từ ngày
          <input className="ad-filter" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs text-slate-600">
          Đến ngày
          <input className="ad-filter" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="grid min-w-0 flex-1 basis-48 gap-1 text-xs text-slate-600">
          Chiến dịch
          <select className="ad-filter" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Tất cả chiến dịch</option>
            {choices.map((b) => (
              <option key={b.id} value={b.campaignId ?? b.id}>
                {b.campaignName || b.slotName}
              </option>
            ))}
          </select>
        </label>
        <Button variant="outline" size="sm" onClick={() => setRefresh((n) => n + 1)}>
          Tải lại
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!data && !error && (
        <p role="status" className="text-sm text-slate-600">
          Đang tải hiệu suất quảng cáo…
        </p>
      )}
      {data && (
        <>
          <dl className="grid grid-cols-2 divide-x divide-slate-200 rounded-lg border border-slate-200 lg:grid-cols-4">
            {[
              ['Lượt hiển thị', data.impressions.toLocaleString('vi-VN')],
              ['Click hợp lệ', data.clicks.toLocaleString('vi-VN')],
              ['CTR trong kỳ', `${data.ctr.toFixed(2)}%`],
              ['Đã thanh toán cho chiến dịch', formatCurrency(data.totalPaid)],
            ].map(([label, value]) => (
              <div key={label} className="p-4">
                <dt className="text-xs text-slate-600">{label}</dt>
                <dd className="mt-2 break-words text-xl font-medium tabular-nums lg:text-2xl">{value}</dd>
              </div>
            ))}
          </dl>
          <section className="space-y-3">
            <h2>Tiến độ chiến dịch</h2>
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(data.stageCounts).map(([stage, count]) => (
                <span key={stage} className="flex items-center gap-1.5">
                  <StatusBadge type="stage" status={stage} />
                  <span className="tabular-nums">{count}</span>
                </span>
              ))}
            </div>
            {data.campaigns.length === 0 ? (
              <EmptyState
                title="Chưa có chiến dịch trong khoảng ngày này"
                description="Chọn khoảng ngày khác hoặc đặt vị trí quảng cáo mới."
              />
            ) : (
              <div className="ad-table-frame">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Chiến dịch / vị trí</th>
                      <th>Tiến độ</th>
                      <th className="ad-number">Hiển thị</th>
                      <th className="ad-number">Click</th>
                      <th className="ad-number">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((c) => (
                      <tr key={c.campaignId}>
                        <td>
                          <Link to={`/advertiser/bookings/${c.campaignId}`}>{c.campaignName}</Link>
                          <div className="mt-1 text-xs text-slate-600">
                            {c.slotName}
                            <br />
                            {formatDate(c.startDate)} – {formatDate(c.endDate)}
                          </div>
                        </td>
                        <td>
                          <StatusBadge type="stage" status={c.stage} />
                          <p className="mt-1 max-w-56 text-xs text-slate-600">{c.stageReason}</p>
                        </td>
                        <td className="ad-number">{c.impressions.toLocaleString('vi-VN')}</td>
                        <td className="ad-number">{c.clicks.toLocaleString('vi-VN')}</td>
                        <td className="ad-number">{c.ctr.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2>Hiệu suất theo ngày</h2>
              <Button size="sm" variant="outline" onClick={exportCsv} disabled={daily.length === 0}>
                Xuất CSV
              </Button>
            </div>
            {daily.length === 0 ? (
              <EmptyState title="Chưa ghi nhận lượt hiển thị trong kỳ" />
            ) : (
              <div className="ad-table-frame max-h-96">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Chiến dịch</th>
                      <th className="ad-number">Hiển thị</th>
                      <th className="ad-number">Click</th>
                      <th className="ad-number">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((r) => (
                      <tr key={`${r.campaignId}:${r.date}`}>
                        <td>{formatDate(r.date)}</td>
                        <td>{r.campaignName}</td>
                        <td className="ad-number">{r.impressions.toLocaleString('vi-VN')}</td>
                        <td className="ad-number">{r.clicks.toLocaleString('vi-VN')}</td>
                        <td className="ad-number">{r.ctr.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <aside className="space-y-1 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-600">
            <h2>Định nghĩa chỉ số</h2>
            <p>
              Impression = lượt banner được hiển thị hợp lệ. Click hợp lệ = click đã qua bộ lọc của hệ thống phát. CTR =
              click ÷ impression × 100, tính trên tổng.
            </p>
            <p>
              Tổng đã thanh toán tính cho các chiến dịch có lịch giao với kỳ chọn; đây là tổng tiền chiến dịch, không
              phải tiền thu riêng trong kỳ.
            </p>
            {!data.excludedEventsAvailable && <p>Sự kiện bị loại: Chưa có dữ liệu.</p>}
            <p>Cập nhật lúc {formatDateTime(data.generatedAt)}</p>
          </aside>
        </>
      )}
    </div>
  )
}
