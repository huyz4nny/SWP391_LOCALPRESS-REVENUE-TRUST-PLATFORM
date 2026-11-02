import { httpClient } from '@/lib/http/client'

export interface AdOffer {
  slot: { id: string; name: string; dimensions: string }
  creative: { title: string; imageUrl: string; targetUrl: string; companyName?: string } | null
  trackingToken: string | null
  hidden: boolean
}
export const adDeliveryApi = {
  serve: (slotCode: string) => httpClient.get<AdOffer>('/delivery/ad-slots/' + encodeURIComponent(slotCode) + '/serve'),
  impression: (token: string) => httpClient.post<{ recorded: boolean }>('/delivery/impressions', { token }),
  click: (token: string) => httpClient.post<{ recorded: boolean }>('/delivery/clicks', { token }),
}
