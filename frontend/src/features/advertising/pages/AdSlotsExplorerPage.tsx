import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AdSlot } from '../types'
import { advertisingApi } from '../api'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Building2, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react'

export function AdSlotsExplorerPage() {
  const [slots, setSlots] = useState<AdSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSlots()
  }, [])

  const loadSlots = async () => {
    try {
      setLoading(true)
      const data = await advertisingApi.getSlots()
      setSlots(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Danh mục Vị trí Quảng cáo & Sức chứa
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Tra cứu kích thước chuẩn, đơn giá niêm yết và tình trạng slot trống trước khi gửi booking
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {slots.map((slot) => {
          const isAvailable = slot.currentBookings < slot.maxCapacity
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
                  {isAvailable ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Còn {slot.maxCapacity - slot.currentBookings} chỗ trống
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Hết chỗ
                    </span>
                  )}
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
                    <span className="text-slate-500">Sức chứa tối đa:</span>
                    <span className="text-slate-700">{slot.maxCapacity} chiến dịch luân phiên</span>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-[11px] text-slate-400 block">Đơn giá niêm yết:</span>
                  <div className="text-2xl font-black text-primary-950">
                    {formatCurrency(slot.pricePerDay)}{' '}
                    <span className="text-xs font-normal text-slate-500">/ ngày</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <Link to={`/advertiser/bookings/new?slotId=${slot.id}`} className="block">
                  <Button className="w-full text-xs font-bold" disabled={!isAvailable}>
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                    Đặt giữ chỗ vị trí này
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
