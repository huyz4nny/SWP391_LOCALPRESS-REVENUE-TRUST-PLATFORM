import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '../mocks/store'
import { handleMockRequest } from '../mocks/handlers'

// Mock GET /finance/orders/me phải trả đúng dạng backend thật: ApiResponse<Page<OrderStatusResponse>>
describe('Mock GET /finance/orders/me', () => {
  beforeEach(() => {
    mockStore.resetToDefaults()
  })

  it('chỉ trả đơn của user đang đăng nhập, dạng trang, mới nhất trước', async () => {
    mockStore.setCurrentUser('user-reader-premium')
    const mine = mockStore.getState().orders.filter((o) => o.userId === 'user-reader-premium')

    const res = await handleMockRequest('GET', '/api/v1/finance/orders/me')

    expect(res.success).toBe(true)
    expect(res.data.totalElements).toBe(mine.length)
    expect(res.data.content.length).toBe(mine.length)
    const codes = new Set(mine.map((o) => o.orderCode))
    expect(res.data.content.every((o: any) => codes.has(o.orderCode))).toBe(true)
    const created = res.data.content.map((o: any) => o.createdAt)
    expect([...created].sort().reverse()).toEqual(created)
  })

  it('lọc theo type, nhận cả alias ARTICLE_PURCHASE và trả orderType theo backend', async () => {
    mockStore.setCurrentUser('user-reader-premium')

    const res = await handleMockRequest('GET', '/api/v1/finance/orders/me?type=ARTICLE')
    const alias = await handleMockRequest('GET', '/api/v1/finance/orders/me?type=ARTICLE_PURCHASE')

    expect(res.data.content.every((o: any) => o.orderType === 'ARTICLE')).toBe(true)
    expect(alias.data.totalElements).toBe(res.data.totalElements)
  })

  it('phân trang theo page/size', async () => {
    mockStore.setCurrentUser('user-reader-premium')
    const all = await handleMockRequest('GET', '/api/v1/finance/orders/me')

    const first = await handleMockRequest('GET', '/api/v1/finance/orders/me?page=0&size=1')

    expect(first.data.content.length).toBe(Math.min(1, all.data.totalElements))
    expect(first.data.totalPages).toBe(all.data.totalElements)
    expect(first.data.content[0]?.orderCode).toBe(all.data.content[0]?.orderCode)
  })
})
