import { useEffect, useRef, useState } from 'react'
import { mockStore } from '@/mocks/store'
import { APP_CONFIG } from '@/app/config'
import { adDeliveryApi, type AdOffer } from './adDeliveryApi'
import { ExternalLink, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  slotCode: 'SLOT-TOP-LEADERBOARD' | 'SLOT-ARTICLE-INLINE' | 'SLOT-SIDEBAR-STICKY'
  className?: string
}
export function AdSlotBanner({ slotCode, className = '' }: Props) {
  const [offer, setOffer] = useState<AdOffer | null>(null)
  const seen = useRef(new Map<string, Promise<unknown>>())
  const userId = mockStore.getCurrentUser().id
  useEffect(() => {
    if (APP_CONFIG.useMockApi) return
    let active = true
    setOffer(null)
    void adDeliveryApi.serve(slotCode)
      .then(data => { if (active) setOffer(data) })
      .catch(() => { if (active) setOffer(null) })
    return () => { active = false }
  }, [slotCode, userId])
  const state = APP_CONFIG.useMockApi ? mockStore.getState() : null
  const mockSlot = state?.adSlots.find(s => s.code === slotCode)
  const booking = state?.bookings.find(b => b.slotCode === slotCode && b.deliveryStatus === 'LIVE')
  const campaign = booking ? state?.campaigns.find(c => c.bookingId === booking.id) : null
  const mockCreative = campaign?.creatives.find(c => c.isActiveServing)
  const creative = APP_CONFIG.useMockApi
    ? mockCreative && { ...mockCreative, companyName: booking?.companyName }
    : offer?.creative
  const slot = APP_CONFIG.useMockApi ? mockSlot : offer?.slot
  function impression(): Promise<unknown> {
    const token = offer?.trackingToken
    if (!token) return Promise.resolve()
    const existing = seen.current.get(token)
    if (existing) return existing
    const request = adDeliveryApi.impression(token)
    seen.current.set(token, request)
    return request
  }
  if (!APP_CONFIG.useMockApi && offer?.hidden) return null
  if (creative) return (
    <div className={'relative overflow-hidden rounded border border-slate-200 bg-white ' + className}>
      <span className="absolute right-1 top-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-xs text-white">Quảng cáo · {creative.companyName}</span>
      <a href={creative.targetUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => {
        if (APP_CONFIG.useMockApi) { if (campaign) campaign.clicks += 1; return }
        if (offer?.trackingToken) {
          const token = offer.trackingToken
          void impression().then(() => adDeliveryApi.click(token)).catch(() => {})
        }
      }}>
        <img src={creative.imageUrl} alt={creative.title} className="max-h-[200px] w-full object-cover" onLoad={() => {
          if (!APP_CONFIG.useMockApi) void impression().catch(() => {})
        }} />
      </a>
    </div>
  )
  return (
    <div className={'flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center text-xs text-slate-500 ' + className}>
      <div className="mb-1 flex items-center gap-1.5 font-semibold"><Megaphone className="h-4 w-4" />Vị trí quảng cáo: {slot?.name || slotCode}</div>
      <p className="mb-2">{slot?.dimensions || 'Chưa có quảng cáo phù hợp'}</p>
      <Link to={slot ? '/advertiser/bookings/new?slotId=' + slot.id : '/advertiser/bookings/new'} className="inline-flex items-center gap-1 text-primary-900 underline">
        Liên hệ đặt vị trí này <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  )
}
