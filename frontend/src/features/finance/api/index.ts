import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import {
  Order,
  OrderType,
  RefundRequest,
  ReconciliationPeriod,
  GeneralLedgerEntry,
  LedgerSummary,
  ResolveDiscrepancyInput,
  AdvertiserReceivable,
  FinanceAlert,
} from '../types'
import { complaintApi } from './payment'


/** Loại giao dịch backend (ENUM transactions.transaction_type) -> loại đơn hiển thị. */
const mapOrderType = (t: string): OrderType =>
  t === 'AD' ? 'AD_CAMPAIGN' : t === 'ARTICLE' ? 'ARTICLE_PURCHASE' : t === 'TOPUP' ? 'TOPUP' : t === 'REFUND' ? 'REFUND' : 'SUBSCRIPTION'

const TITLE_BY_TYPE: Record<string, string> = {
  SUBSCRIPTION: 'Gói hội viên',
  ARTICLE: 'Mua bài Premium',
  AD: 'Booking quảng cáo',
  TOPUP: 'Nạp tiền vào ví',
  REFUND: 'Hoàn tiền',
}

const titleOf = (tx: any): string =>
  tx.description || `${TITLE_BY_TYPE[tx.transactionType] || tx.transactionType} #${tx.targetId || tx.transactionId || tx.id}`

/**
 * ==============================================================================
 * API CLIENT CHO PHÂN HỆ TÀI CHÍNH & KẾ TOÁN (SV4 - HUY)
 * ==============================================================================
 * Tương thích linh hoạt cả 2 chế độ:
 * - Khi VITE_USE_MOCK_API=false: Gọi trực tiếp Spring Boot REST API (/api/v1/finance/...)
 * - Khi VITE_USE_MOCK_API=true : Gọi bộ Mock Handler nội bộ trong trình duyệt
 */
export const financeApi = {
  getDashboard: async () => {
    const res = await httpClient.get<any>('/finance/dashboard')
    if (APP_CONFIG.useMockApi) {
      // mock đã trả recentOrders dạng Order; khiếu nại mock nằm trong kho riêng của finance (payment.ts)
      const openComplaints = await complaintApi.listForAccountant('OPEN')
      return { ...res, openComplaintCount: openComplaints.length }
    }
    if (res && res.totalRevenue !== undefined) {
      return {
        totalRevenue: Number(res.totalRevenue || 0),
        paidOrdersCount: Number(res.paidOrdersCount || 0),
        pendingOrdersCount: Number(res.pendingOrdersCount || 0),
        refundReviewCount: Number(res.refundReviewCount || 0),
        openComplaintCount: Number(res.openComplaintCount || 0),
        reconciliationDiscrepancy: Number(res.reconciliationDiscrepancy || 0),
        recentOrders: (res.recentOrders || []).map((tx: any) => ({
          id: String(tx.transactionId),
          orderCode: tx.gatewayTransactionId || `TX-${tx.transactionId}`,
          userId: String(tx.userId),
          userName: tx.userName || `Khách hàng #${tx.userId}`,
          userEmail: tx.userEmail || '',
          orderType: mapOrderType(tx.transactionType),
          targetId: String(tx.targetId || ''),
          targetTitle: titleOf(tx),
          amount: Number(tx.amount || 0),
          discount: 0,
          finalAmount: Number(tx.amount || 0),
          paymentStatus: tx.status === 'SUCCESS' ? 'PAID' : tx.status,
          paymentMethod: tx.paymentMethod,
          paymentAttempts: [],
          createdAt: tx.createdAt,
          updatedAt: tx.paidAt || tx.createdAt,
        })),
      }
    }
    return res
  },

  getOrders: async (): Promise<Order[]> => {
    // Mock store lưu sẵn Order ở /finance/orders; backend thật trả transactions ở /finance/ledger
    if (APP_CONFIG.useMockApi) return httpClient.get<Order[]>('/finance/orders')
    const res = await httpClient.get<any>('/finance/ledger', { params: { size: 100 } })
    const list = res?.data?.content || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
    return list.map((tx: any) => ({
      id: String(tx.transactionId || tx.id),
      orderCode: tx.gatewayTransactionId || `TX-${tx.transactionId || tx.id}`,
      userId: String(tx.userId),
      userName: tx.userName || `Khách hàng #${tx.userId}`,
      userEmail: tx.userEmail || '',
      orderType: mapOrderType(tx.transactionType),
      targetId: String(tx.targetId || ''),
      targetTitle: titleOf(tx),
      amount: Number(tx.amount || 0),
      discount: 0,
      finalAmount: Number(tx.amount || 0),
      paymentStatus: tx.status === 'SUCCESS' ? 'PAID' : tx.status,
      paymentMethod: tx.paymentMethod,
      paymentAttempts: [{
        id: `att-${tx.transactionId || tx.id}`,
        orderId: String(tx.transactionId || tx.id),
        method: tx.paymentMethod || 'SEPAY',
        transactionCode: tx.gatewayTransactionId || `TX-${tx.transactionId || tx.id}`,
        amount: Number(tx.amount || 0),
        status: tx.status === 'SUCCESS' ? 'SUCCESS' : tx.status,
        createdAt: tx.createdAt || new Date().toISOString(),
        verifiedAt: tx.paidAt,
      }],
      createdAt: tx.createdAt,
      updatedAt: tx.paidAt || tx.createdAt,
    }))
  },

  getOrderById: async (id: string): Promise<Order> => {
    if (APP_CONFIG.useMockApi) return httpClient.get<Order>(`/finance/orders/${id}`)
    const res = await httpClient.get<any>(`/finance/ledger/${id}`)
    const tx = res?.data || res
    return {
      id: String(tx.transactionId || tx.id),
      orderCode: tx.gatewayTransactionId || `TX-${tx.transactionId || tx.id}`,
      userId: String(tx.userId),
      userName: tx.userName || `Khách hàng #${tx.userId}`,
      userEmail: tx.userEmail || '',
      orderType: mapOrderType(tx.transactionType),
      targetId: String(tx.targetId || ''),
      targetTitle: titleOf(tx),
      amount: Number(tx.amount || 0),
      discount: 0,
      finalAmount: Number(tx.amount || 0),
      paymentStatus: tx.status === 'SUCCESS' ? 'PAID' : tx.status,
      paymentMethod: tx.paymentMethod,
      paymentAttempts: [{
        id: `att-${tx.transactionId || tx.id}`,
        orderId: String(tx.transactionId || tx.id),
        method: tx.paymentMethod || 'SEPAY',
        transactionCode: tx.gatewayTransactionId || `TX-${tx.transactionId || tx.id}`,
        amount: Number(tx.amount || 0),
        status: tx.status === 'SUCCESS' ? 'SUCCESS' : tx.status,
        createdAt: tx.createdAt || new Date().toISOString(),
        verifiedAt: tx.paidAt,
      }],
      createdAt: tx.createdAt,
      updatedAt: tx.paidAt || tx.createdAt,
    }
  },

  getRefunds: async (): Promise<RefundRequest[]> => {
    const res = await httpClient.get<any>('/finance/refunds')
    const list = res?.data || (Array.isArray(res) ? res : [])
    return list
  },

  proposeRefund: async (data: {
    orderId: string
    refundAmount: number
    reason: string
    affectedBenefit: string
    evidenceUrl?: string
  }) => {
    const res = await httpClient.post<any>('/finance/refunds/propose', data)
    return res?.data || res
  },

  reviewRefund: async (id: string, approved: boolean, reviewNotes: string) => {
    const res = await httpClient.post<any>(`/finance/refunds/${id}/review-refund`, { approved, reviewNotes })
    return res?.data || res
  },

  /** UC054: kỳ đối soát theo tháng (yyyy-MM), mặc định tháng hiện tại. */
  getReconciliation: async (month?: string): Promise<ReconciliationPeriod> => {
    const res = await httpClient.get<any>('/finance/reconciliation', { params: { month } })
    return res?.data || res
  },

  /** UC054: gán đơn / cộng ví / giải trình 1 khoản lệch (bắt buộc ghi chú). */
  resolveDiscrepancy: async (input: ResolveDiscrepancyInput): Promise<ReconciliationPeriod> => {
    const res = await httpClient.post<any>('/finance/reconciliation/resolve', input)
    return res?.data || res
  },

  /** UC054: Kế toán trưởng chốt kỳ; còn khoản lệch thì phải xác nhận acknowledgeUnresolved. */
  closeReconciliationPeriod: async (input: { month?: string; acknowledgeUnresolved?: boolean; note?: string } = {}) => {
    const res = await httpClient.post<any>('/finance/reconciliation/close', input)
    return res?.data || res
  },

  /** Tổng của toàn bộ sổ (cùng công thức dashboard, Rule 16). Mock không có endpoint này: trả null, trang tự cộng các dòng. */
  getLedgerSummary: async (): Promise<LedgerSummary | null> => {
    if (APP_CONFIG.useMockApi) return null
    const res = await httpClient.get<any>('/finance/ledger/summary')
    const d = res?.data || res
    return {
      grossRevenue: Number(d.totalGrossRevenue || 0),
      refundedAmount: Number(d.totalRefundedAmount || 0),
      netRevenue: Number(d.netRevenue || 0),
      successCount: Number(d.successCount || 0),
    }
  },

  getLedger: async (): Promise<GeneralLedgerEntry[]> => {
    if (APP_CONFIG.useMockApi) return httpClient.get<GeneralLedgerEntry[]>('/finance/ledger')
    const res = await httpClient.get<any>('/finance/ledger', { params: { size: 100 } })
    const list = res?.data?.content || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
    // Rule 16: tiền nạp ví là công nợ phải trả khách, không phải doanh thu -> không đưa vào sổ quỹ doanh thu.
    // Chỉ lấy giao dịch đã thành công / đã hoàn; đơn chờ hoặc thất bại chưa phát sinh tiền.
    return list
      .filter((tx: any) => tx.transactionType !== 'TOPUP' && ['SUCCESS', 'REFUNDED'].includes(tx.status))
      .map((tx: any) => ({
      id: String(tx.transactionId || tx.id),
      entryCode: tx.gatewayTransactionId || `TX-${tx.transactionId || tx.id}`,
      timestamp: tx.createdAt || new Date().toISOString(),
      referenceType: tx.transactionType === 'AD' ? 'ORDER' : (tx.transactionType === 'REFUND' ? 'REFUND' : 'ORDER'),
      referenceCode: `REF-${tx.targetId || tx.transactionId}`,
      description: `Giao dịch ${tx.transactionType || 'THU'} #${tx.transactionId || tx.id} qua ${tx.paymentMethod || 'Chuyển khoản'}`,
      entryType: tx.transactionType === 'REFUND' ? 'DEBIT' : 'CREDIT',
      amount: Number(tx.amount || 0),
      createdBy: tx.reconciledBy ? `Kế toán #${tx.reconciledBy}` : 'Hệ thống tự động',
    }))
  },

  /** UC053: công nợ quảng cáo theo chiến dịch. */
  getReceivables: async (): Promise<AdvertiserReceivable[]> => {
    const res = await httpClient.get<any>('/finance/receivables')
    const list = res?.data || (Array.isArray(res) ? res : [])
    return list.map((r: any) => ({
      ...r,
      contractValue: Number(r.contractValue || 0),
      paidAmount: Number(r.paidAmount || 0),
      remainingDebt: Number(r.remainingDebt || 0),
      overdueDays: Number(r.overdueDays || 0),
      reminderCount: Number(r.reminderCount || 0),
    }))
  },

  /** UC053: gửi nhắc nợ (SV4 lưu lịch sử + phát ReceivableReminderEvent, SV1 báo doanh nghiệp). */
  sendReceivableReminder: async (campaignId: number, note?: string): Promise<AdvertiserReceivable> => {
    const res = await httpClient.post<any>(`/finance/receivables/${campaignId}/reminders`, { note })
    return res?.data || res
  },

  /** UC060: cảnh báo cuối kỳ. */
  getAlerts: async (): Promise<FinanceAlert[]> => {
    const res = await httpClient.get<any>('/finance/alerts')
    return res?.data || (Array.isArray(res) ? res : [])
  },

  /**
   * UC059: tải CSV giao dịch theo khoảng ngày (yyyy-MM-dd). API thật trả file từ backend;
   * chế độ mock dựng CSV cùng định dạng từ dữ liệu đơn trong trình duyệt.
   */
  exportReport: async (fromDate?: string, toDate?: string): Promise<{ blob: Blob; filename: string }> => {
    if (!APP_CONFIG.useMockApi) {
      const file = await httpClient.getFile('/finance/reports/export', { params: { fromDate, toDate } })
      // Backend cũ chưa expose Content-Disposition qua CORS: tự đặt tên theo khoảng ngày
      return file.filename === 'download'
        ? { ...file, filename: `Bao_cao_tai_chinh_${fromDate || 'dau'}_${toDate || 'nay'}.csv` }
        : file
    }
    const orders = await httpClient.get<Order[]>('/finance/orders')
    const inRange = (iso: string) => {
      const day = iso.slice(0, 10)
      return (!fromDate || day >= fromDate) && (!toDate || day <= toDate)
    }
    const rows = orders.filter((o) => inRange(o.createdAt))
    const BOM = String.fromCharCode(0xfeff) // Excel đọc đúng tiếng Việt UTF-8
    const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const gross = rows.filter((o) => o.paymentStatus === 'PAID' && o.orderType !== 'TOPUP' && o.orderType !== 'REFUND')
      .reduce((sum, o) => sum + o.finalAmount, 0)
    const refunded = rows.filter((o) => o.orderType === 'REFUND' && o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.finalAmount, 0)
    const lines = [
      `Kỳ báo cáo,${cell(fromDate || 'Từ đầu')},${cell(toDate || 'Đến nay')}`,
      'Mã giao dịch,Mã đơn hàng,Thời gian tạo,Loại dòng thu,Số tiền (VNĐ),Trạng thái,Mã khách hàng,Tên khách hàng',
      ...rows.map((o) => [o.id, o.orderCode, o.createdAt, o.orderType, o.finalAmount, o.paymentStatus, o.userId, o.userName].map(cell).join(',')),
      '',
      'Tổng hợp (cùng công thức Dashboard / Sổ quỹ)',
      `Số giao dịch,${rows.length}`,
      `Tổng thu gộp,${gross}`,
      `Đã hoàn,${refunded}`,
      `Doanh thu thuần,${gross - refunded}`,
    ]
    return {
      blob: new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
      filename: `Bao_cao_tai_chinh_${fromDate || 'dau'}_${toDate || 'nay'}.csv`,
    }
  },
}

export * from './payment'
