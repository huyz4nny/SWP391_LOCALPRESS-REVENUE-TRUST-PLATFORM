import React, { useState, useEffect } from 'react'
import { AdDeliveryLiveStatus } from '../types'
import { adminApi } from '../api'
import { formatDateTime } from '@/lib/format'
import { Activity, Megaphone, CheckCircle2, PauseCircle, Clock } from 'lucide-react'

export function AdDeliveryMonitorPage() {
  const [stats, setStats] = useState<AdDeliveryLiveStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getAdDeliveryStatus()
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Giám sát Động cơ Phân phối Quảng cáo (Ad Delivery Engine)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi trạng thái phục vụ banner theo thời gian thực, kiểm soát xoay vòng slot và thống kê click fraud
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((slot) => {
          const isServing = slot.status === 'SERVING'
          return (
            <div
              key={slot.slotId}
              className={`p-6 rounded-xl border bg-white shadow-2xs space-y-4 ${
                isServing ? 'border-sky-300 ring-2 ring-sky-50' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-500">{slot.slotCode}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center ${
                    isServing
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isServing ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                  {isServing ? 'ĐANG PHỤC VỤ (ONLINE)' : 'CHỜ CHIẾN DỊCH (IDLE)'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900">{slot.slotName}</h3>
                <div className="text-xs text-slate-500 mt-1">
                  Sức chứa hiện tại: <strong>{slot.currentActiveCampaigns} / {slot.maxCapacity}</strong> chiến dịch luân phiên
                </div>
              </div>

              {isServing && slot.lastServedCreativeTitle ? (
                <div className="p-3 bg-sky-50 rounded-lg border border-sky-100 text-xs space-y-1">
                  <span className="text-[10px] text-sky-600 font-semibold uppercase block">
                    Banner phát gần nhất:
                  </span>
                  <div className="font-bold text-slate-900 truncate">
                    {slot.lastServedCreativeTitle}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Lúc: {formatDateTime(slot.lastServedAt)}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-400 italic text-center">
                  Hiện tại vị trí này đang để trống hoặc chưa có banner được duyệt.
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Hiển thị hôm nay</span>
                  <span className="font-bold text-slate-900">{slot.todayImpressions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Lượt nhấp</span>
                  <span className="font-bold text-slate-900">{slot.todayClicks.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Tỷ lệ CTR</span>
                  <span className="font-bold text-primary-900">{slot.todayCtr}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
