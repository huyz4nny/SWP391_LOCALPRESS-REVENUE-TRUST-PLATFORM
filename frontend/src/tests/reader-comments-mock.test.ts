import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '../mocks/store'
import { handleMockRequest } from '../mocks/handlers'

describe('Mock UC041 bình luận và UC042 báo cáo', () => {
  beforeEach(() => {
    mockStore.resetToDefaults()
  })

  it('khách không gửi được, bình luận mới ở PENDING và không nằm trong danh sách đã duyệt', async () => {
    mockStore.setCurrentUser('user-guest')
    await expect(handleMockRequest('POST', '/api/v1/reader/comments', { articleId: 'art-001', content: 'Xin chào' }))
      .rejects.toMatchObject({ status: 401 })

    mockStore.setCurrentUser('user-reader-free')
    const created = await handleMockRequest('POST', '/api/v1/reader/comments', { articleId: 'art-001', content: '  Góc nhìn mới  ' })
    expect(created.status).toBe('PENDING')
    expect(created.content).toBe('Góc nhìn mới')

    const approved = await handleMockRequest('GET', '/api/v1/reader/comments/art-001')
    expect(approved.some((c: { id: string }) => c.id === created.id)).toBe(false)

    const mine = await handleMockRequest('GET', '/api/v1/reader/comments/mine?articleId=art-001')
    expect(mine.some((c: { id: string; status: string }) => c.id === created.id && c.status === 'PENDING')).toBe(true)
  })

  it('sửa bình luận của mình đưa về PENDING, sửa của người khác bị chặn', async () => {
    mockStore.setCurrentUser('user-reader-free')
    const edited = await handleMockRequest('PUT', '/api/v1/reader/comments/cmt-001', { content: 'Đã viết lại' })
    expect(edited.status).toBe('PENDING')
    expect(edited.content).toBe('Đã viết lại')

    mockStore.setCurrentUser('user-reader-premium')
    await expect(handleMockRequest('PUT', '/api/v1/reader/comments/cmt-001', { content: 'Chiếm bình luận' }))
      .rejects.toMatchObject({ status: 403 })
  })

  it('chỉ báo cáo comment đang hiện, rejected và hidden không mở lại', async () => {
    mockStore.setCurrentUser('user-reader-premium')
    const reported = await handleMockRequest('POST', '/api/v1/reader/comments/cmt-001/report', { reason: 'Nội dung không phù hợp' })
    expect(reported.status).toBe('PENDING')
    const hiddenFromPublic = await handleMockRequest('GET', '/api/v1/reader/comments/art-001')
    expect(hiddenFromPublic.some((c: { id: string }) => c.id === 'cmt-001')).toBe(false)

    await expect(handleMockRequest('POST', '/api/v1/reader/comments/cmt-001/report', { reason: 'Báo lần nữa' }))
      .rejects.toMatchObject({ status: 409 })

    const comments = mockStore.getState().comments
    const rejectedIndex = comments.findIndex((c) => c.id === 'cmt-003')
    mockStore.getState().comments = comments.map((c, i) => (i === rejectedIndex ? { ...c, status: 'REJECTED' as const } : c))
    await expect(handleMockRequest('POST', '/api/v1/reader/comments/cmt-003/report', { reason: 'Mở lại' }))
      .rejects.toMatchObject({ status: 409 })
    expect(mockStore.getState().comments.find((c) => c.id === 'cmt-003')?.status).toBe('REJECTED')

    mockStore.getState().comments = mockStore.getState().comments.map((c) => (
      c.id === 'cmt-003' ? { ...c, status: 'HIDDEN' as const } : c
    ))
    await expect(handleMockRequest('POST', '/api/v1/reader/comments/cmt-003/report', { reason: 'Mở lại' }))
      .rejects.toMatchObject({ status: 409 })
    expect(mockStore.getState().comments.find((c) => c.id === 'cmt-003')?.status).toBe('HIDDEN')
  })

  it('không báo cáo bình luận của chính mình', async () => {
    mockStore.setCurrentUser('user-reader-free')
    await expect(handleMockRequest('POST', '/api/v1/reader/comments/cmt-001/report', { reason: 'Tự báo' }))
      .rejects.toMatchObject({ status: 409 })
    expect(mockStore.getState().comments.find((c) => c.id === 'cmt-001')?.status).toBe('APPROVED')
  })
})
