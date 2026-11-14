// Tác dụng: UC044 — gói đang dùng của độc giả và tắt gia hạn tự động.
import { httpClient } from '@/lib/http/client'
import { idSegment } from './shared'

export type ReaderSubscription = {
  subscriptionId: string
  planName: string
  price: number
  accessScope: string
  categoryName: string | null
  startDate: string
  endDate: string
  autoRenew: boolean
  hasAdFree: boolean
  hasAudio: boolean
  inEffect: boolean
}

type ReaderSubscriptionDto = {
  subscriptionId?: string | number
  planName?: string
  price?: number
  accessScope?: string
  categoryName?: string | null
  startDate?: string
  endDate?: string
  autoRenew?: boolean
  hasAdFree?: boolean
  hasAudio?: boolean
  inEffect?: boolean
}

function mapSubscription(dto: Partial<ReaderSubscriptionDto> | null | undefined): ReaderSubscription {
  return {
    subscriptionId: String(dto?.subscriptionId ?? ''),
    planName: dto?.planName ?? '',
    price: Number(dto?.price ?? 0),
    accessScope: dto?.accessScope ?? 'ALL',
    categoryName: dto?.categoryName ?? null,
    startDate: dto?.startDate ?? '',
    endDate: dto?.endDate ?? '',
    autoRenew: Boolean(dto?.autoRenew),
    hasAdFree: Boolean(dto?.hasAdFree),
    hasAudio: Boolean(dto?.hasAudio),
    inEffect: Boolean(dto?.inEffect),
  }
}

export const subscriptionApi = {
  // UC044 gói ACTIVE chưa hết hạn của user đang đăng nhập
  getMySubscriptions: async (): Promise<ReaderSubscription[]> => {
    const data = await httpClient.get<Array<Partial<ReaderSubscriptionDto>>>('/reader/subscriptions/me')
    return (data ?? []).map(mapSubscription)
  },

  // UC044 tắt gia hạn kỳ sau, quyền đọc giữ đến endDate
  cancelAutoRenew: async (subscriptionId: string): Promise<ReaderSubscription> => {
    const data = await httpClient.post<Partial<ReaderSubscriptionDto>>(
      `/reader/subscriptions/${idSegment(subscriptionId)}/cancel-auto-renew`,
    )
    return mapSubscription(data)
  },
}
