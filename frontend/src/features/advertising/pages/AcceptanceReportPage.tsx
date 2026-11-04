import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { advertisingApi } from '../api'
import type { AcceptanceReport } from '../types'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/format'

export function AcceptanceReportPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<AcceptanceReport | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setData(null)
    setError('')
    advertisingApi
      .getAcceptance(id!)
      .then((r) => {
        if (active) setData(r)
      })
      .catch((e: Error) => {
        if (active) setError(e.message)
      })
    return () => {
      active = false
    }
  }, [id])
  return (
    <div className="ad-page">
      <div className="ad-no-print flex items-center justify-between gap-3">
        <Link className="text-sm text-primary-900 hover:underline" to="/advertiser/documents">
          Về hợp đồng và chứng từ
        </Link>
        <Button size="sm" disabled={!data} onClick={() => window.print()}>
          In / Lưu PDF
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Đang lập biên bản nghiệm thu…</p>}
      {data && (
        <article className="ad-print space-y-6 text-sm leading-6">
          <header className="border-b border-slate-300 pb-4">
            <p className="font-serif text-lg font-bold">LocalPress</p>
            <h1 className="mt-4">Biên bản nghiệm thu quảng cáo</h1>
            <p className="mt-2 text-slate-600">
              Hợp đồng {data.contractNumber} · Lập lúc {formatDateTime(data.generatedAt)}
            </p>
          </header>
          <section>
            <h2>Bên mua quảng cáo</h2>
            <p>{data.companyName}</p>
            <p>Mã số thuế: {data.taxCode}</p>
            <p>Địa chỉ: {data.address || 'Chưa ghi nhận'}</p>
          </section>
          <section>
            <h2>Phạm vi nghiệm thu</h2>
            <p>Chiến dịch: {data.campaignName}</p>
            <p>Vị trí: {data.slotName}</p>
            <p>
              Lịch: {formatDate(data.startDate)} – {formatDate(data.endDate)}
            </p>
          </section>
          <section>
            <h2>Kết quả toàn kỳ</h2>
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Chỉ số</th>
                  <th className="ad-number">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Lượt hiển thị hợp lệ</td>
                  <td className="ad-number">{data.impressions.toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td>Click hợp lệ</td>
                  <td className="ad-number">{data.clicks.toLocaleString('vi-VN')}</td>
                </tr>
                <tr>
                  <td>CTR (click ÷ impression × 100)</td>
                  <td className="ad-number">{data.ctr.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td>Số ngày có ghi nhận hiển thị</td>
                  <td className="ad-number">{data.servedDays}</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section>
            <h2>Các lần tạm dừng đã ghi nhận</h2>
            {data.pauses.length ? (
              <ul>
                {data.pauses.map((date, index) => (
                  <li key={`${date}:${index}`}>{formatDateTime(date)}</li>
                ))}
              </ul>
            ) : (
              <p>Không có lần tạm dừng được ghi nhận trong nhật ký.</p>
            )}
          </section>
        </article>
      )}
    </div>
  )
}
