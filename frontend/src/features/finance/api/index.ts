import { httpClient } from '@/lib/http/client'
import {
  Order,
  RefundRequest,
  ReconciliationPeriod,
  GeneralLedgerEntry,
} from '../types'

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
          orderType: tx.transactionType === 'AD' ? 'AD_CAMPAIGN' : (tx.transactionType === 'ARTICLE' ? 'ARTICLE_PURCHASE' : 'SUBSCRIPTION'),
          targetId: String(tx.targetId || ''),
          targetTitle: `Giao dịch ${tx.transactionType} #${tx.transactionId}`,
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
    const res = await httpClient.get<any>('/finance/manual-transfers/pending')
    const list = res?.data?.content || (Array.isArray(res) ? res : [])
    return list.map((tx: any) => ({
      id: String(tx.transactionId || tx.id),
      orderCode: tx.gatewayTransactionId || `TX-${tx.transactionId || tx.id}`,
      userId: String(tx.userId),
      userName: `Khách hàng #${tx.userId}`,
      userEmail: `user${tx.userId}@localpress.vn`,
      orderType: tx.transactionType === 'AD' ? 'AD_CAMPAIGN' : (tx.transactionType === 'ARTICLE' ? 'ARTICLE_PURCHASE' : 'SUBSCRIPTION'),
      targetId: String(tx.targetId || ''),
      targetTitle: `Đơn ${tx.transactionType} #${tx.targetId || tx.transactionId}`,
      amount: Number(tx.amount || 0),
      discount: 0,
      finalAmount: Number(tx.amount || 0),
      paymentStatus: tx.status === 'SUCCESS' ? 'PAID' : tx.status,
      paymentMethod: tx.paymentMethod,
      paymentAttempts: [],
      createdAt: tx.createdAt,
      updatedAt: tx.paidAt || tx.createdAt,
    }))
  },

  getOrderById: (id: string) => {
    return httpClient.get<Order>(`/finance/ledger/${id}`)
  },

  verifyBankTransfer: (orderId: string) => {
    return httpClient.post<any>(`/finance/manual-transfers/${orderId}/confirm`, {
      bankReferenceCode: `CONFIRM-TX-${orderId}`,
      bankCode: 'VCB',
      note: 'Xác nhận chuyển khoản từ Backoffice',
    })
  },

  getRefunds: () => {
    return httpClient.get<RefundRequest[]>('/finance/refunds')
  },

  proposeRefund: (data: {
    orderId: string
    refundAmount: number
    reason: string
    affectedBenefit: string
    evidenceUrl?: string
  }) => {
    return httpClient.post<RefundRequest>('/finance/refunds/propose', data)
  },

  reviewRefund: (id: string, approved: boolean, reviewNotes: string) => {
    return httpClient.post<RefundRequest>(`/finance/refunds/${id}/review-refund`, { approved, reviewNotes })
  },

  getReconciliation: () => {
    return httpClient.get<ReconciliationPeriod>('/finance/reconciliation')
  },

  resolveDiscrepancy: (discrepancyId: string, note: string) => {
    return httpClient.post<ReconciliationPeriod>('/finance/reconciliation/resolve', { discrepancyId, note })
  },

  closeReconciliationPeriod: () => {
    return httpClient.post<ReconciliationPeriod>('/finance/reconciliation/close')
  },

  getLedger: async () => {
    const res = await httpClient.get<any>('/finance/ledger')
    const list = res?.data?.content || (Array.isArray(res) ? res : [])
    return list.map((tx: any) => ({
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
}
