import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '../mocks/store'
import { handleMockRequest, pushMockReaderNotification } from '../mocks/handlers'

// mock thông báo trong app (UC040 bài mới, UC046 kết quả hoàn tiền) phải giống backend thật của SV3
describe('Mock thông báo của độc giả', () => {
  beforeEach(() => {
    mockStore.resetToDefaults()
  })

  it('khách chưa đăng nhập bị 401', async () => {
    mockStore.setCurrentUser('user-guest')

    await expect(handleMockRequest('GET', '/api/v1/reader/notifications')).rejects.toMatchObject({ status: 401 })
  })

  it('đếm chưa đọc, đánh dấu một và đánh dấu tất cả', async () => {
    mockStore.setCurrentUser('user-reader-free')
    const userId = mockStore.getCurrentUser().id
    pushMockReaderNotification(userId, {
      type: 'REFUND_COMPLETED', title: 'Đã hoàn tiền 15.000 ₫', content: 'Kế toán đã duyệt', linkUrl: '/account/orders',
    })
    pushMockReaderNotification(userId, {
      type: 'ARTICLE_PUBLISHED', title: 'Bài mới', content: 'Có bài mới', linkUrl: '/articles/bai-moi',
    })

    const items = await handleMockRequest('GET', '/api/v1/reader/notifications')
    expect(items[0].type).toBe('ARTICLE_PUBLISHED')
    expect((await handleMockRequest('GET', '/api/v1/reader/notifications/unread-count')).count).toBe(2)

    await handleMockRequest('PUT', `/api/v1/reader/notifications/${items[0].id}/read`)
    expect((await handleMockRequest('GET', '/api/v1/reader/notifications/unread-count')).count).toBe(1)

    await handleMockRequest('PUT', '/api/v1/reader/notifications/read-all')
    expect((await handleMockRequest('GET', '/api/v1/reader/notifications/unread-count')).count).toBe(0)
  })

  it('đánh dấu thông báo không tồn tại thì 404', async () => {
    mockStore.setCurrentUser('user-reader-free')

    await expect(handleMockRequest('PUT', '/api/v1/reader/notifications/khong-co/read')).rejects.toMatchObject({ status: 404 })
  })
})
