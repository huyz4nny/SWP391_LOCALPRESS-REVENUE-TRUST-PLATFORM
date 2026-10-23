import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { contentApi } from '../features/content/api'
import { httpClient } from '../lib/http/client'

const fetchMock = vi.fn()
const request = { categoryId: 2, title: 'Title', sapo: 'Sapo', content: 'Content',
  coverImageUrl: '', tags: ['Hai Phong'], isPremium: false, price: 0 }
beforeEach(() => {
  httpClient.setUseMock(false)
  httpClient.setBasicAuth('author@example.test', 'test-password')
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { httpClient.clearBasicAuth(); vi.unstubAllGlobals() })
it('saves existing content to CMS PUT rather than editorial', async () => {
  await contentApi.saveDraft('8', request)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/api\/v1\/articles\/8$/)
  expect(options.method).toBe('PUT')
  expect(JSON.parse(options.body)).toEqual(request)
})
it('uploads content and image together with browser multipart boundary', async () => {
  await contentApi.saveDraft('8', request, new File(['image'], 'cover.png', { type: 'image/png' }), { altText: 'Alt' })
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/articles\/8$/)
  expect(options.method).toBe('PUT')
  expect(options.headers.has('Content-Type')).toBe(false)
  expect(options.headers.get('Authorization')).toMatch(/^Basic /)
  expect(JSON.parse(await options.body.get('request').text()).categoryId).toBe(2)
  expect(JSON.parse(await options.body.get('info').text()).altText).toBe('Alt')
})
it('creates a draft through the CMS editor endpoint', async () => {
  await contentApi.saveDraft(undefined, request)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/articles\/drafts$/)
  expect(options.method).toBe('POST')
})
