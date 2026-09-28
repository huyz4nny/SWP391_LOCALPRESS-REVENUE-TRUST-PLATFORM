import { UserRole } from '@/app/config'

export interface SystemAuditLog {
  id: string
  userId: string
  userName: string
  userRole: UserRole
  action: string
  module: 'EDITORIAL' | 'ADVERTISING' | 'FINANCE' | 'SECURITY' | 'PAYWALL'
  description: string
  ipAddress: string
  timestamp: string
}

export interface PaywallSettings {
  previewWordLimit: number
  maxDevicesAllowed: number
  paywallEnabled: boolean
  pricePerArticleDefault: number
  watermarkEnabled: boolean
  lastUpdatedAt: string
  updatedBy: string
}

export interface AdDeliveryLiveStatus {
  slotId: string
  slotName: string
  slotCode: string
  currentActiveCampaigns: number
  maxCapacity: number
  status: 'SERVING' | 'IDLE' | 'WAITING_PAYMENT' | 'OVER_CAPACITY'
  todayImpressions: number
  todayClicks: number
  todayCtr: number
  lastServedCreativeTitle?: string
  lastServedAt?: string
}
