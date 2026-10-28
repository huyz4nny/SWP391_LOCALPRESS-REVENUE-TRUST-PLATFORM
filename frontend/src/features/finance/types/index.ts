export type OrderType = 'SUBSCRIPTION' | 'ARTICLE_PURCHASE' | 'AD_CAMPAIGN' | 'TOPUP' | 'REFUND'

export type PaymentMethod = 'SEPAY' | 'VIETQR' | 'BANK_TRANSFER' | 'MANUAL_BANK_TRANSFER' | 'VNPAY' | 'MOMO'

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
  | 'PENDING'
  | 'REQUESTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'COMPLETED'
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

/** BANK_NOT_RECORDED: SePay báo có tiền, hệ thống chưa ghi · RECORDED_WITHOUT_BANK: ghi theo khiếu nại, SePay chưa báo */
export type DiscrepancyType = 'BANK_NOT_RECORDED' | 'RECORDED_WITHOUT_BANK'
export type DiscrepancyAction = 'ASSIGN_ORDER' | 'CREDIT_WALLET' | 'EXPLAINED'

export interface ReconciliationDiscrepancy {
  id: string
  itemType?: DiscrepancyType
  transactionCode: string
  orderCode: string
  systemAmount: number
  gatewayAmount: number
  discrepancyAmount: number
  reason: string
  status: 'UNRESOLVED' | 'RESOLVED'
  action?: DiscrepancyAction
  actionRef?: string
  actionResult?: string
  resolutionNote?: string
  resolvedBy?: string
  resolvedAt?: string
}

export interface ReconciliationPeriod {
  id: string
  month?: string // yyyy-MM
  periodName: string // e.g. "Kỳ đối soát Tháng 09/2026"
  startDate: string
  endDate: string
  totalSystemRevenue: number
  totalGatewayRevenue: number
  discrepancyTotal: number
  unresolvedCount?: number
  status: 'OPEN' | 'RECONCILED' | 'CLOSED'
  discrepancies: ReconciliationDiscrepancy[]
  closedAt?: string
  closedByName?: string
  closeNote?: string
  recentMonths?: string[]
}

export interface ResolveDiscrepancyInput {
  discrepancyId: string
  note: string
  action: DiscrepancyAction
  orderCode?: string
  userId?: number
  amount?: number
}

/** UC053: công nợ quảng cáo theo chiến dịch */
export interface AdvertiserReceivable {
  campaignId: number
  campaignName: string
  advertiserId: number
  companyName: string
  taxCode?: string
  contactPerson?: string
  email?: string
  phone?: string
  contractReference?: string
  contractValue: number
  paidAmount: number
  remainingDebt: number
  startDate: string
  dueDate: string
  overdueDays: number
  paymentStatus?: string
  campaignStatus?: string
  debtGroup: 'PAID_IN_FULL' | 'IN_TERM' | 'OVERDUE'
  reminderCount: number
  lastReminderAt?: string
}

/** UC060: cảnh báo tài chính */
export interface FinanceAlert {
  type: 'REFUND_PENDING' | 'COMPLAINT_OPEN' | 'DEBT_OVERDUE' | 'RECONCILIATION_UNRESOLVED' | string
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string
  title: string
  message: string
  count?: number
  actionUrl: string
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

// =============================================================================
// TRANG THANH TOÁN CHUNG /payment/:orderCode & VÍ LOCALPRESS (SV4)
// =============================================================================

/** Loại đơn theo backend (transactions.transaction_type) */
export type PaymentOrderType = 'SUBSCRIPTION' | 'ARTICLE' | 'AD' | 'TOPUP'

export interface PaymentOrderView {
  transactionId: string
  orderCode: string
  orderType: PaymentOrderType
  targetId?: string
  description?: string
  amount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  isPaid: boolean
  expired: boolean
  paymentMethod?: string
  qrCodeUrl?: string
  bankCode?: string
  accountNumber?: string
  accountName?: string
  transferContent: string
  /** Đơn TOPUP nạp bù: mã đơn sẽ được tự trả khi tiền nạp về */
  topupForOrder?: string
  createdAt?: string
  expiresAt?: string
  paidAt?: string
}

export interface PaymentStatusView {
  orderCode: string
  status: PaymentOrderView['status']
  isPaid: boolean
  expired: boolean
  paymentMethod?: string
}

export interface WalletEntry {
  entryId: string
  transactionId: string
  direction: 'CREDIT' | 'DEBIT'
  amount: number
  balanceAfter: number
  reason?: string
  createdAt: string
}

export interface WalletInfo {
  balance: number
  entries: WalletEntry[]
}

/** Kết quả webhook (thật hoặc giả lập) để hiển thị cho người demo */
export interface IpnResult {
  success: boolean
  status: string
  orderCode?: string
  message: string
  /** Nạp bù: kết quả tự trả đơn (PAID, ALREADY_PAID, ORDER_EXPIRED, INSUFFICIENT) */
  autoPay?: string
  paidOrder?: string
}

/** Khiếu nại "đã chuyển tiền nhưng chưa được ghi nhận" (UC051) */
export interface PaymentComplaint {
  complaintId: string
  userId: string
  orderCode?: string
  amount: number
  transferredAt: string
  bankReference: string
  note?: string
  status: 'OPEN' | 'RESOLVED' | 'REJECTED'
  resolution?: string
  resolutionNote?: string
  resolvedAt?: string
  createdAt: string
}

export interface CreateComplaintInput {
  orderCode?: string
  amount: number
  transferredAt: string
  bankReference: string
  note?: string
}

// =============================================================================
// NHẬT KÝ SEPAY (UC048, UC049)
// =============================================================================

export interface SepayLog {
  logId: string
  /** WEBHOOK = SePay gọi vào, API_SYNC = LocalPress hỏi API SePay, SIMULATION = nút demo */
  source: 'WEBHOOK' | 'API_SYNC' | 'SIMULATION'
  sepayId: number | null
  authOk: boolean
  gateway: string | null
  transferType: string | null
  amount: number | null
  content: string | null
  referenceCode: string | null
  transactionDate: string | null
  orderCode: string | null
  resultStatus: string
  resultMessage: string | null
  rawPayload: string | null
  remoteIp: string | null
  receivedAt: string
}

export interface SepayStatus {
  webhookKeyConfigured: boolean
  apiTokenConfigured: boolean
  accountNumber: string | null
  webhookPath: string
  lastWebhookAt: string | null
  mock?: boolean
}
