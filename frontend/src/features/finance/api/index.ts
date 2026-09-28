import { httpClient } from '@/lib/http/client'
import {
  Order,
  RefundRequest,
  ReconciliationPeriod,
  GeneralLedgerEntry,
} from '../types'

export const financeApi = {
  getDashboard: () => {
    return httpClient.get<{
      totalRevenue: number
      paidOrdersCount: number
      pendingOrdersCount: number
      refundReviewCount: number
      reconciliationDiscrepancy: number
      recentOrders: Order[]
    }>('/finance/dashboard')
  },

  getOrders: () => {
    return httpClient.get<Order[]>('/finance/orders')
  },

  getOrderById: (id: string) => {
    return httpClient.get<Order>(`/finance/orders/${id}`)
  },

  verifyBankTransfer: (orderId: string) => {
    return httpClient.post<Order>(`/finance/orders/${orderId}/verify-bank-transfer`)
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

  getLedger: () => {
    return httpClient.get<GeneralLedgerEntry[]>('/finance/ledger')
  },
}
