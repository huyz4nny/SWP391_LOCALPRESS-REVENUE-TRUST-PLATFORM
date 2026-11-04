import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { User } from '@/types'
import { UserRole } from '@/app/config'
import type { AdSlotConfig, AdSlotConfigInput } from '../types'
import { SystemAuditLog, PaywallSettings, AdDeliveryLiveStatus } from '../types'

export const adminApi = {
  accountAction: (userId: string, action: 'LOCK' | 'UNLOCK' | 'REVOKE', reason: string) => {
    if (APP_CONFIG.useMockApi) throw new Error('Quản lý trạng thái tài khoản cần API thật.')
    return httpClient.post<{ userId: number; status: string; revokedDevices: number }>(`/admin/users/${encodeURIComponent(userId)}/account-action`, { action, reason })
  },
  getAdSlots: async (): Promise<AdSlotConfig[]> => {
    if (APP_CONFIG.useMockApi) throw new Error('Cấu hình vị trí quảng cáo cần VITE_USE_MOCK_API=false và backend đang chạy.')
    return httpClient.get<AdSlotConfig[]>('/admin/ad-slots')
  },
  updateAdSlot: async (id: string, input: AdSlotConfigInput): Promise<AdSlotConfig> => {
    if (APP_CONFIG.useMockApi) throw new Error('Cần bật API thật để lưu cấu hình vị trí quảng cáo.')
    return httpClient.put<AdSlotConfig>(`/admin/ad-slots/${encodeURIComponent(id)}`, input)
  },
  getUsers: () => {
    return httpClient.get<User[]>(APP_CONFIG.useMockApi ? '/auth/users' : '/admin/users')
  },

  updateUserRole: (userId: string, role: UserRole) => {
    return httpClient.put<User>(`/admin/users/${userId}/update-role`, { role })
  },

  getPaywallSettings: () => {
    return httpClient.get<PaywallSettings>('/admin/paywall-settings')
  },

  updatePaywallSettings: (settings: Partial<PaywallSettings>) => {
    return httpClient.put<PaywallSettings>('/admin/paywall-settings', settings)
  },

  getAdDeliveryStatus: () => {
    return httpClient.get<AdDeliveryLiveStatus[]>('/admin/ad-delivery-status')
  },

  getAuditLogs: () => {
    return httpClient.get<SystemAuditLog[]>('/admin/audit-logs')
  },
}
