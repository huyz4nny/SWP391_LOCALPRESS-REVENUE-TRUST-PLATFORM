import { httpClient } from '@/lib/http/client'
import { AppApiError } from '@/lib/http/errors'
import type {
  AdvertiserDashboardData,
  DailyPerformance,
  CancellationQuote,
  CancellationRequest,
  NotificationPage,
  AcceptanceReport,
  CampaignSummary,
  AdvertiserContract,
} from '../types'

export interface PerformanceFilter {
  from: string
  to: string
  campaignId?: string
}
export const portalApi = {
  getDashboard: (params: PerformanceFilter) =>
    httpClient.get<AdvertiserDashboardData>('/advertiser/dashboard', { params: { ...params } }),
  getPerformance: (params: PerformanceFilter) =>
    httpClient.get<DailyPerformance[]>('/advertiser/performance', { params: { ...params } }),
  getCancellationQuote: (id: string) =>
    httpClient.get<CancellationQuote>(`/advertiser/campaigns/${id}/cancellation-quote`),
  cancelCampaign: (id: string, reason: string) =>
    httpClient.post<CancellationRequest>(`/advertiser/campaigns/${id}/cancel`, { reason, acknowledged: true }),
  getMyRequests: () => httpClient.get<CancellationRequest[]>('/advertiser/requests'),
  getNotifications: (page = 0) =>
    httpClient.get<NotificationPage>('/advertiser/notifications', { params: { page, size: 20 } }),
  getUnreadCount: () => httpClient.get<number>('/advertiser/notifications/unread-count'),
  markNotificationRead: (id: string) => httpClient.post<void>(`/advertiser/notifications/${id}/read`),
  markAllNotificationsRead: () => httpClient.post<void>('/advertiser/notifications/read-all'),
  getAcceptance: (id: string) => httpClient.get<AcceptanceReport>(`/advertiser/campaigns/${id}/acceptance`),
  getDocuments: () => httpClient.get<CampaignSummary[]>('/advertiser/documents'),
  getMyContracts: async () => {
    try {
      return { available: true, items: await httpClient.get<AdvertiserContract[]>('/advertiser/contracts') }
    } catch (error) {
      // shortcut: endpoint SV2 chưa nằm trên main; nối dữ liệu khi nhánh hợp đồng được tích hợp.
      if (error instanceof AppApiError && error.status === 404)
        return { available: false, items: [] as AdvertiserContract[] }
      throw error
    }
  },
}
