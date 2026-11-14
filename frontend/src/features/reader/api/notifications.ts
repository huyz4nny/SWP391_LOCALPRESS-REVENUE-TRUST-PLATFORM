// Tác dụng: UC040 + UC046 — thông báo trong app của độc giả (bài mới trong chuyên mục theo dõi, kết quả hoàn tiền).
import { httpClient } from '@/lib/http/client'
import { idSegment } from './shared'

export type ReaderNotificationType = 'ARTICLE_PUBLISHED' | 'REFUND_COMPLETED' | 'REFUND_REJECTED' | string

export type ReaderNotification = {
  id: string
  type: ReaderNotificationType
  title: string
  content: string
  linkUrl: string | null
  read: boolean
  createdAt: string
}

type ReaderNotificationDto = Partial<Omit<ReaderNotification, 'id'>> & { id?: string | number }

function mapNotification(dto: ReaderNotificationDto): ReaderNotification {
  return {
    id: String(dto.id ?? ''),
    type: dto.type ?? '',
    title: dto.title ?? '',
    content: dto.content ?? '',
    linkUrl: dto.linkUrl ?? null,
    read: Boolean(dto.read),
    createdAt: dto.createdAt ?? '',
  }
}

export const notificationsApi = {
  // 50 thông báo mới nhất của người đang đăng nhập
  getNotifications: async (): Promise<ReaderNotification[]> => {
    const data = await httpClient.get<ReaderNotificationDto[]>('/reader/notifications')
    return (data ?? []).map(mapNotification)
  },

  // số chưa đọc cho chấm đỏ trên menu tài khoản
  getUnreadNotificationCount: async (): Promise<number> => {
    const data = await httpClient.get<{ count?: number }>('/reader/notifications/unread-count')
    return Number(data?.count ?? 0)
  },

  markNotificationRead: (notificationId: string) => {
    return httpClient.put<void>(`/reader/notifications/${idSegment(notificationId)}/read`)
  },

  markAllNotificationsRead: () => {
    return httpClient.put<void>('/reader/notifications/read-all')
  },
}
