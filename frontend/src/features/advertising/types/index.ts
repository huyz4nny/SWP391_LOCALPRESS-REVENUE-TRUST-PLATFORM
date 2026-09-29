export type BookingStatus =
  | 'SUBMITTED' // Mới gửi yêu cầu
  | 'QUOTED'    // Tòa soạn đã gửi báo giá & điều khoản
  | 'CONFIRMED' // Khách đã chấp nhận báo giá
  | 'REJECTED'  // Từ chối
  | 'CANCELLED' // Đã hủy

export type PaymentStatus =
  | 'UNPAID'
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export type DeliveryStatus =
  | 'NOT_STARTED'  // Chưa đến lịch
  | 'ELIGIBLE'     // Đủ điều kiện (Đã thanh toán + Creative duyệt + Đến ngày)
  | 'LIVE'         // Đang phát
  | 'PAUSED'       // Tạm dừng
  | 'COMPLETED'    // Đã kết thúc

export type CreativeStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'

export interface AdSlot {
  id: string
  name: string
  code: string
  dimensions: string
  width?: number
  height?: number
  pricePerDay: number
  pricingType?: 'CPD' | 'CPM' | 'CPC' | 'FLAT_FEE'
  deviceType?: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'ALL'
  description?: string
  locationNote: string
  categoryName?: string | null
  inventoryMode?: 'EXCLUSIVE' | 'ROTATING'
  maxCapacity: number
  currentBookings?: number
  isActive: boolean
}

export interface AdvertiserProfile {
  id: string
  companyName: string
  taxCode: string
  contactPerson: string
  email: string
  phone: string
  address: string
  businessLicenseUrl: string
  businessSector: string
  invoiceName: string
  invoiceTaxCode: string
  invoiceAddress: string
  invoiceEmail: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
}

export type AdvertiserProfileInput = Omit<AdvertiserProfile, 'id' | 'verificationStatus'>

export interface AdvertiserProfileChange {
  id: string
  action: 'CREATE' | 'UPDATE'
  oldValue: AdvertiserProfile | null
  newValue: AdvertiserProfile
  createdAt: string
}

export interface AdCreative {
  id: string
  campaignId: string
  versionNumber: number
  title: string
  imageUrl: string
  targetUrl: string
  width: number
  height: number
  fileSizeKb: number
  status: CreativeStatus
  reviewNotes?: string
  uploadedAt: string
  reviewedAt?: string
  reviewedBy?: string
  isActiveServing: boolean // Is this the currently served creative?
}

export interface AdBooking {
  id: string
  advertiserId: string
  companyName: string
  contactPerson: string
  contactPhone: string
  contactEmail: string
  slotId: string
  slotName: string
  slotCode: string
  startDate: string
  endDate: string
  daysCount: number
  standardPrice: number
  discountPercent?: number
  finalPrice: number
  quotationNotes?: string
  bookingStatus: BookingStatus
  paymentStatus: PaymentStatus
  deliveryStatus: DeliveryStatus
  paymentId?: string
  campaignId?: string
  termsAccepted: boolean
  createdAt: string
  updatedAt: string
}

export interface AdCampaign {
  id: string
  bookingId: string
  advertiserId: string
  companyName: string
  slotId: string
  slotName: string
  name: string
  startDate: string
  endDate: string
  totalBudget: number
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  activeCreativeVersion?: number
  creatives: AdCreative[]
  impressions: number
  clicks: number
  ctr: number // Click through rate %
  dailyStats: {
    date: string
    impressions: number
    clicks: number
    ctr: number
  }[]
  createdAt: string
  updatedAt: string
}
