import React from 'react'
import { mockStore } from '@/mocks/store'
import { ExternalLink, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'

interface AdSlotBannerProps {
  slotCode: 'SLOT-TOP-LEADERBOARD' | 'SLOT-ARTICLE-INLINE' | 'SLOT-SIDEBAR-STICKY'
  className?: string
}

export function AdSlotBanner({ slotCode, className = '' }: AdSlotBannerProps) {
  const state = mockStore.getState()
  const slot = state.adSlots.find((s) => s.code === slotCode)
  const booking = state.bookings.find(
    (b) => b.slotCode === slotCode && b.deliveryStatus === 'LIVE'
  )
  const campaign = booking ? state.campaigns.find((c) => c.bookingId === booking.id) : null
  const activeCreative = campaign?.creatives.find((c) => c.isActiveServing)

  if (activeCreative && campaign) {
    return (
      <div className={`relative overflow-hidden rounded border border-slate-200 bg-white group ${className}`}>
        <div className="absolute top-1 right-1 z-10 bg-slate-900/70 text-[10px] text-white px-1.5 py-0.5 rounded tracking-wider uppercase font-medium backdrop-blur-xs">
          Được tài trợ • {booking?.companyName}
        </div>
        <a
          href={activeCreative.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            campaign.clicks += 1
            mockStore.getState().adDeliveryStatus.forEach((stat) => {
              if (stat.slotCode === slotCode) stat.todayClicks += 1
            })
          }}
          className="block transition-transform duration-300 group-hover:opacity-95"
        >
          <img
            src={activeCreative.imageUrl}
            alt={activeCreative.title}
            className="w-full h-auto object-cover max-h-[140px] md:max-h-[200px]"
          />
        </a>
      </div>
    )
  }

  // Placeholder when empty or waiting for approval
  return (
    <div
      className={`border border-dashed border-slate-300 bg-slate-50/70 rounded-md p-4 text-center flex flex-col items-center justify-center text-xs text-slate-500 hover:bg-slate-100 transition-colors ${className}`}
    >
      <div className="flex items-center space-x-1.5 text-slate-600 font-semibold mb-1">
        <Megaphone className="w-4 h-4 text-primary-700" />
        <span>Vị trí quảng cáo: {slot?.name || slotCode}</span>
      </div>
      <p className="text-[11px] text-slate-400 mb-2">
        Kích thước chuẩn {slot?.dimensions} • Tiếp cận hàng chục ngàn độc giả địa phương mỗi ngày
      </p>
      <Link
        to={`/advertiser/bookings/new?slotId=${slot?.id}`}
        className="inline-flex items-center font-medium text-primary-800 hover:text-primary-900 hover:underline text-xs bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs"
      >
        <span>Liên hệ đặt vị trí này</span>
        <ExternalLink className="w-3 h-3 ml-1" />
      </Link>
    </div>
  )
}
