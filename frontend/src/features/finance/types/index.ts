export type OrderType = 'SUBSCRIPTION' | 'ARTICLE_PURCHASE' | 'AD_CAMPAIGN'

export type PaymentMethod = 'VIETQR' | 'BANK_TRANSFER' | 'VNPAY' | 'MOMO'

export type OrderPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'

export interface PaymentAttempt {
  id: string
  orderId: string
  method: PaymentMethod
  transactionCode: string
  amount: number
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED'
  bankReferenceCode?: string
  receiptImageUrl?: string
  failureReason?: string
  createdAt: string
  verifiedAt?: string
  verifiedBy?: string
}

export interface Order {
  id: string
  orderCode: string
  userId: string
  userName: string
  userEmail: string
  orderType: OrderType
  targetId: string // subscription_id OR purchase_id (article_id) OR campaign_id
  targetTitle: string
  amount: number
  discount: number
  finalAmount: number
  paymentStatus: OrderPaymentStatus
  paymentMethod?: PaymentMethod
  paymentAttempts: PaymentAttempt[]
  invoiceNumber?: string
  invoiceIssuedAt?: string
  createdAt: string
  updatedAt: string
}

export type RefundStatus =
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'

export interface RefundRequest {
  id: string
  orderId: string
  orderCode: string
  transactionId: string
  userId: string
  userName: string
  userEmail: string
  originalAmount: number
  refundAmount: number
  isPartial: boolean
  reason: string
  evidenceUrl?: string
  status: RefundStatus
  affectedBenefit: string // Quyền lợi bị thu hồi (ví dụ: Hủy gói Premium tháng 9, Hủy chiến dịch quảng cáo)
  requestedAt: string
  proposedBy?: string
  proposedByName?: string
  proposedNotes?: string
  reviewedBy?: string
  reviewedByName?: string
  reviewNotes?: string
  resolvedAt?: string
}

export interface ReconciliationDiscrepancy {
  id: string
  transactionCode: string
  orderCode: string
  systemAmount: number
  gatewayAmount: number
  discrepancyAmount: number
  reason: string
  status: 'UNRESOLVED' | 'RESOLVED'
  resolutionNote?: string
  resolvedBy?: string
  resolvedAt?: string
}

export interface ReconciliationPeriod {
  id: string
  periodName: string // e.g. "Kỳ đối soát Tháng 09/2026"
  startDate: string
  endDate: string
  totalSystemRevenue: number
  totalGatewayRevenue: number
  discrepancyTotal: number
  status: 'OPEN' | 'RECONCILED' | 'CLOSED'
  discrepancies: ReconciliationDiscrepancy[]
  closedAt?: string
  closedByName?: string
}

export interface GeneralLedgerEntry {
  id: string
  entryCode: string
  timestamp: string
  referenceType: 'ORDER' | 'REFUND' | 'ADJUSTMENT'
  referenceCode: string
  description: string
  entryType: 'CREDIT' | 'DEBIT' // Thu (Credit) vs Chi/Hoàn (Debit)
  amount: number
  createdBy: string
}
