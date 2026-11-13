// Tác dụng: UC034-UC035 — danh sách gói đọc, tạo đơn mua bài lẻ / mua gói (đơn thanh toán do SV4 tạo ở server).
import { httpClient } from '@/lib/http/client'
import { SubscriptionPlan } from '../types'
import { bodyId } from './shared'

// kết quả backend trả sau khi tạo bản ghi chờ thanh toán cho bài lẻ hoặc gói cước
// targetId là purchase_id hoặc subscription_id và amount là giá do server tính nên frontend không tự đặt giá
export type PendingOrderTarget = {
  orderType: 'ARTICLE' | 'SUBSCRIPTION'
  targetId: string | number
  amount: number
  title: string
  orderCode: string
}

function scopeLine(dto: { accessScope?: string; categoryName?: string | null }): string {
  if (dto.accessScope === 'CATEGORY' && dto.categoryName) {
    return `Đọc bài Premium thuộc chuyên mục ${dto.categoryName}`
  }
  return 'Đọc bài Premium toàn trang'
}

function mapPublicPlan(dto: Partial<SubscriptionPlan> & {
  id?: string | number
  accessScope?: string
  categoryName?: string | null
  hasAdFree?: boolean
  hasAudio?: boolean
  status?: string
}): SubscriptionPlan {
  // mock đã có sẵn mô tả, backend thật trả phạm vi gói để không ghi nhầm gói chuyên mục thành toàn trang
  if (dto.features && dto.features.length > 0 && !dto.accessScope) {
    return {
      id: String(dto.id ?? ''),
      name: dto.name ?? '',
      code: dto.code ?? `PLAN_${dto.id}`,
      price: Number(dto.price ?? 0),
      durationDays: Number(dto.durationDays ?? 0),
      description: dto.description ?? '',
      features: dto.features,
      isPopular: dto.isPopular,
      isActive: dto.isActive ?? true,
    }
  }
  const line = scopeLine(dto)
  const features = [line]
  if (dto.hasAdFree) features.push('Không hiện quảng cáo')
  if (dto.hasAudio) features.push('Nghe audio')
  features.push(`Thời hạn ${Number(dto.durationDays ?? 0)} ngày`)
  return {
    id: String(dto.id ?? ''),
    name: dto.name ?? '',
    code: dto.code ?? `PLAN_${dto.id}`,
    price: Number(dto.price ?? 0),
    durationDays: Number(dto.durationDays ?? 0),
    description: line,
    features,
    isActive: dto.status === 'ACTIVE' || dto.isActive === true,
  }
}

export const purchaseApi = {
  getSubscriptionPlans: async () => {
    const data = await httpClient.get<Array<Partial<SubscriptionPlan>>>('/subscription-plans')
    return (data ?? []).map(mapPublicPlan)
  },

  // UC034: server tạo purchase PENDING + đơn SV4, trả orderCode. FE không gọi /finance/checkout.
  createArticlePurchase: (articleId: string) => {
    return httpClient.post<PendingOrderTarget>('/reader/article-purchases', {
      articleId: bodyId(articleId),
    })
  },

  // UC035: server tạo subscription PENDING + đơn SV4, trả orderCode.
  createSubscription: (planId: string) => {
    return httpClient.post<PendingOrderTarget>('/reader/subscriptions', {
      planId: bodyId(planId),
    })
  },
}
