import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '../mocks/store'
import { handleMockRequest } from '../mocks/handlers'

// mock UC038 lưu bài và UC040 theo dõi chuyên mục phải giống backend thật của SV3
// PUT và DELETE idempotent, khách chưa đăng nhập bị 401, feed chỉ gồm bài của chuyên mục đang theo dõi
describe('Mock UC038 lưu bài và UC040 theo dõi chuyên mục', () => {
  beforeEach(() => {
    mockStore.resetToDefaults()
  })

  it('khách chưa đăng nhập bị 401', async () => {
    mockStore.setCurrentUser('user-guest')

    await expect(handleMockRequest('GET', '/api/v1/reader/saved-articles/ids')).rejects.toMatchObject({ status: 401 })
    await expect(handleMockRequest('PUT', '/api/v1/reader/followed-categories/cat-kinh-te')).rejects.toMatchObject({ status: 401 })
  })

  it('lưu hai lần vẫn chỉ có một bản ghi và bài vừa lưu lên đầu, bỏ lưu hai lần không lỗi', async () => {
    mockStore.setCurrentUser('user-reader-free')
    const article = mockStore
      .getState()
      .articles.find((a) => a.status === 'PUBLISHED' && !mockStore.getEntitlements('user-reader-free').bookmarkedArticleIds.includes(a.id))!

    await handleMockRequest('PUT', `/api/v1/reader/saved-articles/${article.id}`)
    const second = await handleMockRequest('PUT', `/api/v1/reader/saved-articles/${article.id}`)
    expect(second.saved).toBe(true)

    const ids: string[] = await handleMockRequest('GET', '/api/v1/reader/saved-articles/ids')
    expect(ids[0]).toBe(article.id)
    expect(ids.filter((id) => id === article.id)).toHaveLength(1)

    await handleMockRequest('DELETE', `/api/v1/reader/saved-articles/${article.id}`)
    const again = await handleMockRequest('DELETE', `/api/v1/reader/saved-articles/${article.id}`)
    expect(again.saved).toBe(false)
    const after: string[] = await handleMockRequest('GET', '/api/v1/reader/saved-articles/ids')
    expect(after).not.toContain(article.id)
  })

  it('lưu bài không tồn tại thì 404', async () => {
    mockStore.setCurrentUser('user-reader-free')

    await expect(handleMockRequest('PUT', '/api/v1/reader/saved-articles/khong-co')).rejects.toMatchObject({ status: 404 })
  })

  it('feed chỉ gồm bài đã xuất bản của chuyên mục đang theo dõi', async () => {
    mockStore.setCurrentUser('user-reader-free')
    const followed = new Set(mockStore.getEntitlements('user-reader-free').followedCategoryIds)

    const feed: Array<{ categoryId: string; status: string }> = await handleMockRequest('GET', '/api/v1/reader/feed')

    expect(feed.length).toBeGreaterThan(0)
    feed.forEach((a) => {
      expect(followed.has(a.categoryId)).toBe(true)
      expect(a.status).toBe('PUBLISHED')
    })
  })

  it('theo dõi rồi bỏ theo dõi cập nhật danh sách, chuyên mục không tồn tại thì 404', async () => {
    mockStore.setCurrentUser('user-reader-free')
    const target = mockStore
      .getState()
      .categories.find((c) => !mockStore.getEntitlements('user-reader-free').followedCategoryIds.includes(c.id))!

    await handleMockRequest('PUT', `/api/v1/reader/followed-categories/${target.id}`)
    const list: Array<{ id: string }> = await handleMockRequest('GET', '/api/v1/reader/followed-categories')
    expect(list.map((c) => c.id)).toContain(target.id)

    await handleMockRequest('DELETE', `/api/v1/reader/followed-categories/${target.id}`)
    const after: Array<{ id: string }> = await handleMockRequest('GET', '/api/v1/reader/followed-categories')
    expect(after.map((c) => c.id)).not.toContain(target.id)

    await expect(handleMockRequest('PUT', '/api/v1/reader/followed-categories/khong-co')).rejects.toMatchObject({ status: 404 })
  })
})
