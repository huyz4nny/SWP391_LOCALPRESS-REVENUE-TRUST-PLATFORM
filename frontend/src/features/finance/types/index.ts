export type OrderType = 'SUBSCRIPTION' | 'ARTICLE_PURCHASE' | 'AD_CAMPAIGN' | 'REFUND'

// Luồng hiện tại chỉ có SEPAY (QR chuyển khoản); BANK_TRANSFER là bút toán chuyển trả khi hoàn tiền.
// WALLET chỉ còn ở dữ liệu cũ (LocalPress đã bỏ ví, không giữ tiền khách).
// VIETQR / BANK_TRANSFER / MOMO chỉ còn vì CheckoutPage cũ của SV3 (không còn route) và mock store; bỏ khi SV3 xóa trang đó.
export type PaymentMethod = 'SEPAY' | 'WALLET' | 'VIETQR' | 'BANK_TRANSFER' | 'MOMO'

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

/** UC057: INVOICE cho đơn quảng cáo (doanh nghiệp), RECEIPT cho đơn độc giả. */
export type FinancialDocumentType = 'RECEIPT' | 'INVOICE'
/** VOIDED khi đơn đã hoàn tiền toàn phần. */
export type FinancialDocumentStatus = 'ISSUED' | 'VOIDED'

/**
 * Một dòng của GET /finance/documents/mine (bảng financial_documents).
 * Hệ thống tự phát hành khi đơn SUCCESS; thông tin người mua lưu lại tại thời điểm phát hành.
 */
export interface FinancialDocument {
  documentNo: string // HD-2026-000001 (INVOICE), BN-2026-000001 (RECEIPT), tăng liên tục theo năm
  type: FinancialDocumentType
  orderCode: string
  targetType: OrderType
  targetId: string
  description: string
  buyerName: string
  buyerTaxCode?: string
  buyerAddress?: string
  vatRate: number // % lúc phát hành (8 đến 31/12/2026)
  amountBeforeVat: number
  vatAmount: number
  totalAmount: number
  status: FinancialDocumentStatus
  issuedAt: string
  voidedAt?: string
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
export type DiscrepancyAction = 'ASSIGN_ORDER' | 'RETURNED_TO_CUSTOMER' | 'EXPLAINED'

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
  /** RETURNED_TO_CUSTOMER: mã GD ngân hàng của lần chuyển trả khách */
  returnReference?: string
  amount?: number
}

/** UC060: cảnh báo tài chính */
export interface FinanceAlert {
  type: 'REFUND_PENDING' | 'COMPLAINT_OPEN' | 'RECONCILIATION_UNRESOLVED' | 'RIGHTS_GRANT_FAILED' | string
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string
  title: string
  message: string
  count?: number
  actionUrl: string
}

/** GET /finance/ledger/summary: tổng của toàn bộ sổ, không phụ thuộc số dòng đang tải. */
export interface LedgerSummary {
  grossRevenue: number
  refundedAmount: number
  netRevenue: number
  successCount: number
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
// TRANG THANH TOÁN CHUNG /payment/:orderCode (SV4) - không ví, không giữ tiền khách
// =============================================================================

/** Loại đơn theo backend (transactions.transaction_type) */
export type PaymentOrderType = 'SUBSCRIPTION' | 'ARTICLE' | 'AD'

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

/** Kết quả webhook (thật hoặc giả lập) để hiển thị cho người demo */
export interface IpnResult {
  success: boolean
  status: string
  orderCode?: string
  message: string
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
