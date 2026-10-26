import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { APP_CONFIG } from '../app/config'
import { contentApi } from '../features/content/api'
import { httpClient } from '../lib/http/client'

const fetchMock = vi.fn()
const originalMockMode = APP_CONFIG.useMockApi

beforeEach(() => {
  APP_CONFIG.useMockApi = false
  httpClient.setUseMock(false)
  httpClient.setBasicAuth('author@example.test', 'test-password')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  APP_CONFIG.useMockApi = originalMockMode
  httpClient.setUseMock(originalMockMode)
  httpClient.clearBasicAuth()
  vi.unstubAllGlobals()
})

it('submits a saved version through CMS with authentication and no content body', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
    articleId: 1, versionNumber: 5, reviewStatus: 'PENDING', latest: true, published: false,
  }), { headers: { 'Content-Type': 'application/json' } }))

  const result = await contentApi.submitVersionForReview('1', 5)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/api\/v1\/articles\/1\/versions\/5\/submit$/)
  expect(options.method).toBe('POST')
  expect(options.body).toBeUndefined()
  expect(options.headers.Authorization).toMatch(/^Basic /)
  expect(result.reviewStatus).toBe('PENDING')
  expect(result.published).toBe(false)
})

it('does not retry a stale submission after HTTP 409', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
    message: 'Đây không còn là phiên bản mới nhất',
  }), { status: 409, headers: { 'Content-Type': 'application/json' } }))

  await expect(contentApi.submitVersionForReview('1', 4)).rejects.toMatchObject({ status: 409 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('rejects mock mode instead of pretending a real submission succeeded', async () => {
  APP_CONFIG.useMockApi = true
  await expect(contentApi.submitVersionForReview('1', 5)).rejects.toThrow('API thật')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('creates a revision using the displayed latest version as concurrency guard', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
    articleId: 1, versionNumber: 6, reviewStatus: 'DRAFT', latest: true, published: false,
  }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
  const result = await contentApi.restoreVersion('1', 5, {
    expectedLatestVersion: 5, changelog: 'Sửa theo phản hồi kiểm duyệt',
  })
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/articles\/1\/versions\/5\/restore$/)
  expect(options.method).toBe('POST')
  expect(JSON.parse(options.body)).toEqual({ expectedLatestVersion: 5, changelog: 'Sửa theo phản hồi kiểm duyệt' })
  expect(result.versionNumber).toBe(6)
  expect(result.reviewStatus).toBe('DRAFT')
})

it('does not retry revision creation when another action advanced the article', async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Bài viết đã có thay đổi' }), {
    status: 409, headers: { 'Content-Type': 'application/json' },
  }))
  await expect(contentApi.restoreVersion('1', 5, {
    expectedLatestVersion: 5, changelog: 'Sửa theo phản hồi',
  })).rejects.toMatchObject({ status: 409 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
