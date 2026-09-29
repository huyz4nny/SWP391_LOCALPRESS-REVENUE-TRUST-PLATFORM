import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AdSlot } from '../types'
import { advertisingApi } from '../api'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'
import { APP_CONFIG } from '@/app/config'

export function AdSlotsExplorerPage() {
  const [slots, setSlots] = useState<AdSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSlots()
  }, [])

  const loadSlots = async () => {
    try {
      setLoading(true)
      const data = await advertisingApi.getSlots()
      setSlots(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tải được danh mục vị trí')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Danh mục Vị trí Quảng cáo
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tra cứu kích thước, thiết bị hỗ trợ và đơn giá niêm yết. Lịch trống được kiểm tra khi chọn ngày booking.
        </p>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Đang tải vị trí...</p>}
      {!loading && !error && slots.length === 0 && <p className="text-sm text-slate-500">Chưa có vị trí quảng cáo đang mở.</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((slot) => {
          const unit = { CPD: '/ ngày', CPM: '/ 1.000 lượt hiển thị', CPC: '/ lượt nhấp', FLAT_FEE: '/ gói' }[slot.pricingType || 'CPD']
          return (
            <div
              key={slot.id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-primary-900 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                    {slot.code}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {slot.deviceType || 'ALL'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900">{slot.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{slot.description}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kích thước chuẩn:</span>
                    <strong className="text-slate-800">{slot.dimensions}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vị trí hiển thị:</span>
                    <span className="text-slate-700 text-right">{slot.locationNote}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chuyên mục:</span>
                    <span className="text-slate-700 text-right">{slot.categoryName || 'Tất cả chuyên mục'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hình thức:</span>
                    <span className="text-slate-700">{slot.inventoryMode === 'ROTATING' ? 'Luân phiên' : 'Độc quyền'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sức chứa tối đa:</span>
                    <span className="text-slate-700">{slot.maxCapacity} chiến dịch</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] text-slate-400 block">Đơn giá niêm yết:</span>
                  <div className="text-2xl font-black text-primary-950">
                    {formatCurrency(slot.pricePerDay)}{' '}
                    <span className="text-xs font-normal text-slate-500">{unit}</span>
                  </div>
                </div>
              </div>

              {APP_CONFIG.useMockApi && slot.pricingType !== 'CPM' && slot.pricingType !== 'CPC' &&
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link to={`/advertiser/bookings/new?slotId=${slot.id}`} className="block">
                    <Button className="w-full text-xs font-bold">
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Chọn lịch quảng cáo
                    </Button>
                  </Link>
                </div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
