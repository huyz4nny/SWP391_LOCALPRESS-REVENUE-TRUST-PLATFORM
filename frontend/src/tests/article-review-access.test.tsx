import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { canEditOwnedDraft, loadArticleEditorAccess, type ReviewArticle } from '@/features/content/articleEditorAccess'
import { ArticleReviewPreview } from '@/features/content/components/ArticleReviewPreview'

const originalMock = APP_CONFIG.useMockApi
const article: ReviewArticle = {
  id: '10', authorId: '4', authorName: 'Phóng viên', title: 'Bản nháp của phóng viên',
  slug: 'draft-10', sapo: 'Sapo', content: 'Nội dung nháp', previewContent: '',
  categoryId: '2', categoryName: 'Kinh tế', categorySlug: 'kinh-te', coverImage: '',
  tags: [], isPremium: false, price: 0, status: 'DRAFT', views: 0, publishedAt: null,
  createdAt: '2026-10-31T10:00:00', updatedAt: '2026-10-31T10:00:00', readTimeMinutes: 1,
  currentVersion: 1, versions: [],
}

afterEach(() => {
  APP_CONFIG.useMockApi = originalMock
  httpClient.setUseMock(originalMock)
  httpClient.clearBasicAuth()
  vi.unstubAllGlobals()
})

it('loads another author draft through editorial API, not the owner-only CMS API', async () => {
  APP_CONFIG.useMockApi = false
  httpClient.setUseMock(false)
  httpClient.setBasicAuth('bientap@localpress.vn', 'seed-test')
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(article), {
    headers: { 'Content-Type': 'application/json' },
  }))
  vi.stubGlobal('fetch', fetch)
  const result = await loadArticleEditorAccess('10', '3')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/editorial\/articles\/10$/)
  expect(result.article.id).toBe('10')
  expect(result.editable).toBe(false)
})

it('does not hide genuine API failures or fall back to mock article data', async () => {
  APP_CONFIG.useMockApi = false
  httpClient.setUseMock(false)
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Không tìm thấy bài viết' }), { status: 404 })))
  await expect(loadArticleEditorAccess('9999', '3')).rejects.toMatchObject({ status: 404 })
})

it('keeps own draft editable but another author draft read-only', () => {
  expect(canEditOwnedDraft(article, '4')).toBe(true)
  expect(canEditOwnedDraft(article, '3')).toBe(false)
})

it('does not offer content editing for pending, approved, rejected or taken-down articles', () => {
  for (const status of ['IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED', 'UNPUBLISHED'] as const) {
    expect(canEditOwnedDraft({ ...article, status }, '4')).toBe(false)
  }
})

it('allows an own newer published draft but never the published approved version', () => {
  const version = { versionNumber: 2, title: 'v2', sapo: '', content: '', changelog: '', createdAt: '', createdBy: '4' }
  expect(canEditOwnedDraft({ ...article, status: 'PUBLISHED', currentVersion: 2,
    versions: [{ ...version, reviewStatus: 'DRAFT' }] }, '4')).toBe(true)
  expect(canEditOwnedDraft({ ...article, status: 'PUBLISHED', currentVersion: 2,
    versions: [{ ...version, reviewStatus: 'APPROVED' }] }, '4')).toBe(false)
})

it('renders the editorial draft as read-only and escapes unsafe content', () => {
  const html = renderToStaticMarkup(<MemoryRouter><ArticleReviewPreview article={{ ...article, content: '<script>alert(1)</script>' }} /></MemoryRouter>)
  expect(html).toContain('Bản nháp của phóng viên')
  expect(html).toContain('Bản nháp')
  expect(html).toContain('&lt;script&gt;')
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('<form')
  expect(html).not.toContain('<textarea')
  expect(html).not.toContain('Lưu bản nháp')
})
