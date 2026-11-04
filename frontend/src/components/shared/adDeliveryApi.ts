import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'

export interface AdOffer {
  slot: { id: string; name: string; dimensions: string; status?: 'ACTIVE' | 'INACTIVE' }
  creative: { title: string; imageUrl: string; targetUrl: string; companyName?: string } | null
  trackingToken: string | null
  hidden: boolean
}
export function resolveAdImageUrl(imageUrl: string): string {
  const internalImage = /^\/api\/v1\/ad-slots\/creative-files\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/
  if (!internalImage.test(imageUrl)) return imageUrl
  return APP_CONFIG.apiBaseUrl.replace(/\/$/, '') + imageUrl.slice('/api/v1'.length)
}

export const adDeliveryApi = {
  serve: (slotCode: string) => httpClient.get<AdOffer>('/delivery/ad-slots/' + encodeURIComponent(slotCode) + '/serve'),
  impression: (token: string) => httpClient.post<{ recorded: boolean }>('/delivery/impressions', { token }),
  click: (token: string) => httpClient.post<{ recorded: boolean }>('/delivery/clicks', { token }),
}
