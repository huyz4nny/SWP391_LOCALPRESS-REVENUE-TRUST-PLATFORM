import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '../mocks/store'
import { handleMockRequest } from '../mocks/handlers'

// mock của POST /reader/article-purchases và /reader/subscriptions phải giống backend thật của SV3
// trả targetId và giá do server tính và từ chối bài đã có quyền đọc
describe('Mock UC034 mua lẻ bài và UC035 đăng ký gói', () => {
  beforeEach(() => {
    mockStore.resetToDefaults()
  })

  it('bài premium chưa có quyền thì trả targetId và giá lấy từ bài', async () => {
    mockStore.setCurrentUser('user-reader-free')
    const article = mockStore
      .getState()
      .articles.find((a) => a.isPremium && a.price && !mockStore.hasAccessToArticle('user-reader-free', a.id))!

    const res = await handleMockRequest('POST', '/api/v1/reader/article-purchases', { articleId: article.id })

    expect(res.orderType).toBe('ARTICLE')
    expect(res.targetId).toBe(article.id)
    expect(res.amount).toBe(article.price)
  })

  it('bài đã có quyền đọc thì bị chặn 409', async () => {
    mockStore.setCurrentUser('user-reader-premium')
    const owned = mockStore.getState().articles.find((a) => a.isPremium && a.price)!

    await expect(
      handleMockRequest('POST', '/api/v1/reader/article-purchases', { articleId: owned.id }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('bài không tồn tại thì 404', async () => {
    mockStore.setCurrentUser('user-reader-free')

    await expect(
      handleMockRequest('POST', '/api/v1/reader/article-purchases', { articleId: 'khong-co' }),
    ).rejects.toMatchObject({ status: 404 })
  })

  it('đăng ký gói trả giá của gói, khách đang có gói vẫn được mua tiếp để gia hạn', async () => {
    const plan = mockStore.getState().subscriptionPlans.find((p) => p.isActive)!

    mockStore.setCurrentUser('user-reader-free')
    const first = await handleMockRequest('POST', '/api/v1/reader/subscriptions', { planId: plan.id })
    expect(first.orderType).toBe('SUBSCRIPTION')
    expect(first.amount).toBe(plan.price)

    mockStore.setCurrentUser('user-reader-premium')
    const renew = await handleMockRequest('POST', '/api/v1/reader/subscriptions', { planId: plan.id })
    expect(renew.targetId).toBe(plan.id)
  })

  it('gói không tồn tại thì 404', async () => {
    mockStore.setCurrentUser('user-reader-free')

    await expect(
      handleMockRequest('POST', '/api/v1/reader/subscriptions', { planId: 'khong-co' }),
    ).rejects.toMatchObject({ status: 404 })
  })
})
