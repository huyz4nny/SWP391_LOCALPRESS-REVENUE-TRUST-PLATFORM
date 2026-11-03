import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '../mocks/store'
import { handleMockRequest } from '../mocks/handlers'

// Mock GET /finance/documents/mine (UC057) phải trả đúng dạng backend: ApiResponse<FinancialDocument[]>
describe('Mock GET /finance/documents/mine', () => {
  beforeEach(() => {
    mockStore.resetToDefaults()
  })

  it('doanh nghiệp chỉ thấy hóa đơn của mình, có thông tin xuất hóa đơn', async () => {
    mockStore.setCurrentUser('user-adv-1')

    const res = await handleMockRequest('GET', '/api/v1/finance/documents/mine')

    expect(res.success).toBe(true)
    expect(res.data.length).toBeGreaterThan(0)
    const myCodes = new Set(mockStore.getState().orders.filter((o) => o.userId === 'user-adv-1').map((o) => o.orderCode))
    expect(res.data.every((d: any) => myCodes.has(d.orderCode))).toBe(true)
    const invoice = res.data.find((d: any) => d.type === 'INVOICE')
    expect(invoice.documentNo).toMatch(/^HD-\d{4}-\d{6}$/)
    expect(invoice.buyerTaxCode).toBe('0201988888')
    expect(invoice.amountBeforeVat + invoice.vatAmount).toBe(invoice.totalAmount)
    // VAT 8% (NQ 204/2025/QH15), giá đã gồm thuế, cùng công thức backend
    expect(invoice.vatRate).toBe(8)
    expect(invoice.amountBeforeVat).toBe(Math.round((invoice.totalAmount * 100) / 108))
  })

  it('đơn chưa thu không có chứng từ, đơn hoàn toàn phần thì VOIDED', async () => {
    mockStore.setCurrentUser('user-reader-free')
    const orders = mockStore.getState().orders.filter((o) => o.userId === 'user-reader-free')

    const res = await handleMockRequest('GET', '/api/v1/finance/documents/mine')

    const unpaid = orders.filter((o) => !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(o.paymentStatus))
    expect(res.data.some((d: any) => unpaid.some((o) => o.orderCode === d.orderCode))).toBe(false)
    const refunded = orders.find((o) => o.paymentStatus === 'REFUNDED')!
    const voided = res.data.find((d: any) => d.orderCode === refunded.orderCode)
    expect(voided.type).toBe('RECEIPT')
    expect(voided.status).toBe('VOIDED')
    expect(voided.voidedAt).toBeTruthy()
  })

  it('lọc theo type và số chứng từ không trùng giữa các user', async () => {
    mockStore.setCurrentUser('user-adv-1')
    const a = await handleMockRequest('GET', '/api/v1/finance/documents/mine?type=RECEIPT')
    const allA = await handleMockRequest('GET', '/api/v1/finance/documents/mine')
    mockStore.setCurrentUser('user-adv-2')
    const allB = await handleMockRequest('GET', '/api/v1/finance/documents/mine')

    expect(a.data.every((d: any) => d.type === 'RECEIPT')).toBe(true)
    const noA = new Set(allA.data.map((d: any) => d.documentNo))
    expect(allB.data.some((d: any) => noA.has(d.documentNo))).toBe(false)
  })

  it('chi tiết đơn: kế toán xem được chứng từ của đơn đã thu; người khác 403; đơn chưa thu 404', async () => {
    const paid = mockStore.getState().orders.find((o) => o.paymentStatus === 'PAID')!
    const unpaid = mockStore.getState().orders.find((o) => !['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(o.paymentStatus))!
    const stranger = mockStore.getState().users.find((u) => u.role === 'READER' && u.id !== paid.userId)!

    mockStore.setCurrentUser('user-fin-staff')
    const res = await handleMockRequest('GET', `/api/v1/finance/documents/transaction/${paid.id}`)
    expect(res.data.orderCode).toBe(paid.orderCode)
    expect(res.data.documentNo).toMatch(/^(HD|BN)-\d{4}-\d{6}$/)

    await expect(handleMockRequest('GET', `/api/v1/finance/documents/transaction/${unpaid.id}`)).rejects.toMatchObject({ status: 404 })

    mockStore.setCurrentUser(stranger.id)
    await expect(handleMockRequest('GET', `/api/v1/finance/documents/transaction/${paid.id}`)).rejects.toMatchObject({ status: 403 })
  })
})
