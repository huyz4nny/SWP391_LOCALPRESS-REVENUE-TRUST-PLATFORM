import { httpClient } from '@/lib/http/client'
import { User } from '@/types'
import { UserRole } from '@/app/config'
import { SystemAuditLog, PaywallSettings, AdDeliveryLiveStatus } from '../types'

export const adminApi = {
  getUsers: () => {
    return httpClient.get<User[]>('/auth/users')
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
