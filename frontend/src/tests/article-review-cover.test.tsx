import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { contentApi } from '@/features/content/api'
import { ArticleReviewCover, reviewCoverKind } from '@/features/content/components/ArticleReviewCover'

const originalMock=APP_CONFIG.useMockApi
afterEach(() => {
  APP_CONFIG.useMockApi=originalMock
  httpClient.setUseMock(originalMock)
  httpClient.clearBasicAuth()
  vi.unstubAllGlobals()
})

it('renders an external cover image, alt text, caption and source', () => {
  const html=renderToStaticMarkup(<MemoryRouter><ArticleReviewCover articleId="1" versionNumber={5}
    imageUrl="https://images.example.test/cover.png" altText="Cảng Lạch Huyện"
    caption="Cảng biển Hải Phòng" source="Phóng viên" /></MemoryRouter>)
  expect(html).toContain('<img')
  expect(html).toContain('src="https://images.example.test/cover.png"')
  expect(html).toContain('alt="Cảng Lạch Huyện"')
  expect(html).toContain('<figcaption')
  expect(html).toContain('Nguồn ảnh: Phóng viên')
})

it('loads private covers through the authenticated article/version endpoint', async () => {
  APP_CONFIG.useMockApi=false
  httpClient.setUseMock(false)
  httpClient.setBasicAuth('bientap@localpress.vn','test-only')
  const fetch=vi.fn().mockResolvedValue(new Response(new Uint8Array([137,80,78,71]),{
    headers:{'Content-Type':'image/png'},
  }))
  vi.stubGlobal('fetch',fetch)
  const blob=await contentApi.getReviewCoverImage('10',1)
  expect(blob.type).toBe('image/png')
  expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/content\/articles\/10\/versions\/1\/cover-image$/)
  expect(fetch.mock.calls[0][1].headers.get('Authorization')).toMatch(/^Basic /)
})

it('never uses a private image URL as an unauthenticated img src', () => {
  const path='/api/v1/content/images/11111111-1111-1111-1111-111111111111.png'
  expect(reviewCoverKind(path)).toBe('stored')
  const html=renderToStaticMarkup(<ArticleReviewCover articleId="10" versionNumber={1} imageUrl={path} altText="Cover" />)
  expect(html).toContain('Đang tải ảnh bìa')
  expect(html).not.toContain('<img')
})

it('rejects unsafe URLs and handles missing images', () => {
  for(const url of ['javascript:alert(1)','data:text/html,x','file:///secret','https://user:pass@example.test/a.png']) {
    expect(reviewCoverKind(url)).toBe('invalid')
  }
  expect(reviewCoverKind('')).toBe('none')
  const html=renderToStaticMarkup(<ArticleReviewCover articleId="1" versionNumber={1} imageUrl="javascript:alert(1)" altText="Cover" />)
  expect(html).toContain('Đường dẫn ảnh bìa không hợp lệ')
  expect(html).not.toContain('<img')
})
