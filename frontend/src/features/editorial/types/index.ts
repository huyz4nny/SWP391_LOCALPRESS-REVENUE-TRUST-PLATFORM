export interface CampaignEligibility {
  campaignId: number
  advertiserId: number
  companyName: string
  campaignName: string
  slotCode: string
  slotName: string
  startDate: string
  endDate: string
  quotedAmount: number
  status: string

  // 5 Gatekeeper Conditions
  paymentPassed: boolean
  paymentStatus: string
  paymentMessage: string

  quotationPassed: boolean
  quotationStatus: string
  quotationMessage: string

  contractPassed: boolean
  contractReference: string | null
  contractFileUrl: string | null
  contractMessage: string

  creativePassed: boolean
  creativeVersion: number | null
  creativeReviewStatus: string | null
  creativeScanStatus: string | null
  creativeMediaUrl: string | null
  creativeTargetUrl: string | null
  creativeMessage: string

  slotPassed: boolean
  slotStatus: string
  slotMessage: string

  dateRangeValid: boolean
  overallEligible: boolean
  canActivate: boolean
}

export interface CampaignControl {
  campaignId: number
  advertiserId: number
  companyName: string
  campaignName: string
  slotCode: string
  slotName: string
  startDate: string
  endDate: string
  amount: number
  status: string
  suspensionReason: string | null
  totalPlannedDays: number
  elapsedDays: number
  makeGoodDaysAdded: number
  lastControlledAt?: string
}

export interface SuspendCampaignRequest {
  reason: string
}

export interface MakeGoodRequest {
  extraDays: number
  reason: string
}

export interface ContractAddendum {
  addendumId?: number
  campaignId?: number
  addendumNumber: string
  effectiveDate: string
  adjustmentType: string
  notes?: string
  createdAt?: string
}

export interface EditorialContract {
  contractId?: number
  campaignId: number
  advertiserId: number
  companyName: string
  taxCode: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  campaignName: string
  slotCode: string
  slotName: string
  contractReference: string | null
  contractNumber?: string | null
  signingDate?: string
  contractFileUrl: string | null
  contractValue: number
  startDate: string
  endDate: string
  quotationStatus: string
  paymentStatus: string
  status: string
  contractStatus?: string
  addendums: ContractAddendum[]
}

export interface CreateContractRequest {
  campaignId: number
  contractNumber: string
  signingDate: string
  contractValue: number
  contractFileUrl?: string
  notes?: string
}

export interface UpdateContractRequest {
  contractReference: string
  contractFileUrl?: string
  signingDate?: string
  contractValue?: number
}

export interface CreateContractAddendumRequest {
  addendumNumber: string
  effectiveDate: string
  adjustmentType: string
  notes?: string
}

export interface AdvertiserVip {
  advertiserId: number
  companyName: string
  taxCode: string
  contactPerson: string
  email: string
  phone: string
  totalSpent: number
  campaignCount: number
  vipTier: 'STANDARD' | 'SILVER' | 'GOLD' | 'DIAMOND' | string
  vipDiscountPercent: number
}

export interface UpdateVipTierRequest {
  vipTier: string
  vipDiscountPercent: number
  notes?: string
}

export interface SlotOccupancy {
  slotCode: string
  slotName: string
  dimensions: string
  capacity: number
  basePrice: number
  pricingType: string
  activeCampaignsCount: number
  occupancyPercentage: number
  status: 'NORMAL' | 'NEAR_FULL' | 'FULL' | string
}

export interface UrgentItem {
  id: string
  type: 'ARTICLE' | 'BOOKING' | 'CREATIVE' | 'COMMENT' | string
  title: string
  description: string
  priority: 'HIGH' | 'URGENT' | 'NORMAL' | string
  link: string
  createdAt: string
}

export interface EditorialDashboardOverview {
  b2bTotalSigned: number
  b2bActualPaid: number
  b2bReceivables: number
  b2cSubscriptions: number
  b2cSingleArticles: number
  totalPlatformRevenue: number
  slotOccupancies: SlotOccupancy[]
  pendingArticlesCount: number
  pendingBookingsCount: number
  pendingCreativesCount: number
  pendingCommentsCount: number
  urgentItems: UrgentItem[]
}
