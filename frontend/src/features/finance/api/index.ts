import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import {
  Order,
  OrderType,
  RefundRequest,
  ReconciliationPeriod,
  GeneralLedgerEntry,
} from '../types'


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
    if (APP_CONFIG.useMockApi) return res // mock đã trả recentOrders dạng Order
    if (res && res.totalRevenue !== undefined) {
      return {
        totalRevenue: Number(res.totalRevenue || 0),
        paidOrdersCount: Number(res.paidOrdersCount || 0),
        pendingOrdersCount: Number(res.pendingOrdersCount || 0),
        refundReviewCount: Number(res.refundReviewCount || 0),
        reconciliationDiscrepancy: Number(res.reconciliationDiscrepancy || 0),
        recentOrders: (res.recentOrders || []).map((tx: any) => ({
          id: String(tx.transactionId),
          orderCode: tx.gatewayTransactionId || `TX-${tx.transactionId}`,
          userId: String(tx.userId),
          userName: `Khách hàng #${tx.userId}`,
          userEmail: `user${tx.userId}@localpress.vn`,
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
      userName: `Khách hàng #${tx.userId}`,
      userEmail: `user${tx.userId}@localpress.vn`,
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
        method: tx.paymentMethod || 'BANK_TRANSFER',
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
      userName: `Khách hàng #${tx.userId}`,
      userEmail: `user${tx.userId}@localpress.vn`,
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
        method: tx.paymentMethod || 'BANK_TRANSFER',
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

  getReconciliation: async (): Promise<ReconciliationPeriod> => {
    const res = await httpClient.get<any>('/finance/reconciliation')
    return res?.data || res
  },

  resolveDiscrepancy: async (discrepancyId: string, note: string) => {
    const res = await httpClient.post<any>('/finance/reconciliation/resolve', { discrepancyId, note })
    return res?.data || res
  },

  closeReconciliationPeriod: async () => {
    const res = await httpClient.post<any>('/finance/reconciliation/close')
    return res?.data || res
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

  getReceivables: async () => {
    const res = await httpClient.get<any>('/finance/receivables')
    return res?.data || (Array.isArray(res) ? res : [])
  },

  getAlerts: async () => {
    const res = await httpClient.get<any>('/finance/alerts')
    return res?.data || (Array.isArray(res) ? res : [])
  },

  createOrder: async (data: {
    orderType: string
    targetId: number
    amount: number
    paymentMethod?: string
    bankCode?: string
    description?: string
    successUrl?: string
    errorUrl?: string
    cancelUrl?: string
  }) => {
    const res = await httpClient.post<any>('/finance/orders', data)
    return res?.data || res
  },

  getOrderStatus: async (orderId: string | number) => {
    const res = await httpClient.get<any>(`/finance/orders/${orderId}`)
    return res?.data || res
  },

  getOrderStatusByCode: async (orderCode: string) => {
    const res = await httpClient.get<any>(`/finance/orders/code/${orderCode}/status`)
    return res?.data || res
  },
}

export * from './payment'
