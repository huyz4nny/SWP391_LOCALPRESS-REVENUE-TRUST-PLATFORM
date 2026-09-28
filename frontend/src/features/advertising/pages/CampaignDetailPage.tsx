import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AdCampaign } from '../types'
import { advertisingApi } from '../api'
import { formatCurrency, formatDate } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { BarChart3, Eye, MousePointerClick, Percent, Calendar, ArrowLeft } from 'lucide-react'

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [campaign, setCampaign] = useState<AdCampaign | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadCampaign(id)
  }, [id])

  const loadCampaign = async (campId: string) => {
    try {
      setLoading(true)
      const data = await advertisingApi.getCampaignById(campId)
      setCampaign(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center animate-pulse">Đang tải dữ liệu chiến dịch...</div>
  }

  if (!campaign) {
    return <div className="py-12 text-center">Không tìm thấy chiến dịch</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <Link to="/advertiser" className="text-xs text-slate-500 hover:text-slate-800 flex items-center">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Tổng quan
            </Link>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs text-slate-500">{campaign.id}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">{campaign.name}</h1>
        </div>

        <Link to={`/advertiser/bookings/${campaign.bookingId}`}>
          <Button variant="outline" size="sm" className="text-xs">
            Xem hồ sơ Booking
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Lượt hiển thị (Impressions)</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{campaign.impressions.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Lượt nhấp (Clicks)</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{campaign.clicks.toLocaleString()}</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <span className="text-xs font-semibold text-slate-500">Tỷ lệ CTR</span>
          <div className="text-2xl font-black text-primary-900 mt-1">{campaign.ctr}%</div>
        </div>
      </div>

      {/* Recharts Performance Visualizer */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center">
            <BarChart3 className="w-4 h-4 mr-1.5 text-primary-900" />
            Biểu đồ lượt xem & nhấp theo ngày
          </h3>
          <span className="text-xs text-slate-400">7 ngày gần nhất</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={campaign.dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="impressions" name="Hiển thị" stroke="#1e3a8a" fillOpacity={1} fill="url(#colorImp)" />
              <Area type="monotone" dataKey="clicks" name="Lượt nhấp" stroke="#0284c7" fillOpacity={1} fill="url(#colorClick)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
