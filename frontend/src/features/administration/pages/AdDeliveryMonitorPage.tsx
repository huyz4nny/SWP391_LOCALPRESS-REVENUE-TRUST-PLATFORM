import { useEffect, useState } from 'react'
import type { AdDeliveryLiveStatus } from '../types'
import { adminApi } from '../api'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'

export function AdDeliveryMonitorPage() {
  const [stats, setStats] = useState<AdDeliveryLiveStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    void adminApi.getAdDeliveryStatus().then(data => {
      if (active) setStats(data)
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Không tải được trạng thái quảng cáo')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
      <div><h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Giám sát phân phối quảng cáo</h1>
        <p className="mt-2 text-sm text-slate-600">Chiến dịch đủ điều kiện phát và lượt hiển thị, lượt nhấp đã ghi nhận trong ngày.</p>
        <p className="mt-1 text-xs text-slate-500">Đủ điều kiện phát không đồng nghĩa banner đang được một độc giả xem.</p></div>
      <Button variant="outline" disabled={loading} onClick={() => {
        setLoading(true); setError(''); setRefresh(value => value + 1)
      }}>Làm mới dữ liệu</Button>
    </header>
    {error && <p role="alert" className="text-crimson">{error}</p>}
    {loading && <p role="status">Đang tải trạng thái quảng cáo...</p>}
    {!loading && !error && stats.length === 0 && <EmptyState title="Chưa có vị trí quảng cáo" />}
    {!loading && !error && <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {stats.map(slot => {
        const disabled = slot.status === 'INACTIVE'
        const overCapacity = slot.status === 'OVER_CAPACITY'
        const eligible = slot.currentActiveCampaigns > 0 && !disabled
        const badge = disabled ? 'DISABLED' : overCapacity ? 'OVER_CAPACITY' : eligible ? 'ELIGIBLE' : 'NOT_STARTED'
        return <section key={slot.slotId} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs text-slate-500">{slot.slotCode}</span>
            <StatusBadge type="delivery" status={badge} />
          </div>
          <h2 className="text-base font-bold text-slate-900">{slot.slotName}</h2>
          <p className="text-sm text-slate-600">Chiến dịch đủ điều kiện: <strong>{slot.currentActiveCampaigns}</strong> · Sức chứa: <strong>{slot.maxCapacity}</strong></p>
          <p className={overCapacity ? 'text-sm text-crimson' : 'text-sm text-slate-600'}>
            {disabled ? 'Vị trí đã tắt; không nhận booking mới và không phân phối banner.'
              : overCapacity ? 'Số chiến dịch đủ điều kiện vượt sức chứa. Cần kiểm tra lịch đặt chỗ.'
              : eligible ? 'Có banner đủ điều kiện để phân phối cho độc giả không có quyền miễn quảng cáo.'
              : 'Chưa có banner đáp ứng đầy đủ điều kiện phát tại thời điểm cập nhật.'}
          </p>
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-sm">
            <div><span className="block text-xs text-slate-500">Hiển thị hôm nay</span><strong>{slot.todayImpressions.toLocaleString('vi-VN')}</strong></div>
            <div><span className="block text-xs text-slate-500">Lượt nhấp</span><strong>{slot.todayClicks.toLocaleString('vi-VN')}</strong></div>
            <div><span className="block text-xs text-slate-500">CTR</span><strong>{slot.todayCtr.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%</strong></div>
          </div>
        </section>
      })}
    </div>}
  </div>
}
