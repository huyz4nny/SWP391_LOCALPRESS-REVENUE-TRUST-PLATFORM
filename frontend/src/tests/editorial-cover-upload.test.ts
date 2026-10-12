import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { httpClient } from '../lib/http/client'
import { editorialApi } from '../features/editorial/api'
import { contentApi } from '../features/content/api'

describe('Editorial cover upload transport', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    httpClient.setUseMock(false)
    httpClient.setBasicAuth('editor@example.test', 'test-password')
    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => new Response('{}', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    httpClient.clearBasicAuth()
    vi.unstubAllGlobals()
  })

  it('creates a draft and file with POST multipart and authentication', async () => {
    const file = new File(['image'], 'cover.png', { type: 'image/png' })
    await editorialApi.createArticleWithCover({ title: 'Title', categoryId: 'cat-thoi-su' }, file,
      { altText: 'Alt', caption: 'Caption', imageSource: 'Source' })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/editorial/articles')
    expect(options.method).toBe('POST')
    expect(options.headers.has('Content-Type')).toBe(false)
    expect(options.headers.get('Authorization')).toMatch(/^Basic /)
    expect(options.body.get('file').name).toBe('cover.png')
    expect(JSON.parse(await options.body.get('article').text()).title).toBe('Title')
    expect(JSON.parse(await options.body.get('info').text()).altText).toBe('Alt')
  })

  it('updates an existing draft with PUT and the wrapped request contract', async () => {
    const file = new File(['image'], 'cover.png', { type: 'image/png' })
    await editorialApi.updateArticleWithCover('6', { title: 'Title' }, file, { altText: 'Alt' }, 'Metadata')
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('/editorial/articles/6')
    expect(options.method).toBe('PUT')
    expect(options.headers.has('Content-Type')).toBe(false)
    expect(JSON.parse(await options.body.get('request').text()))
      .toEqual({ article: { title: 'Title' }, changelog: 'Metadata' })
  })

  it('loads a stored private cover as an authenticated image blob', async () => {
    fetchMock.mockImplementation(async () => new Response(new Uint8Array([137, 80, 78, 71]), {
      status: 200, headers: { 'Content-Type': 'image/png' },
    }))
    const blob = await contentApi.getCoverImage('/api/v1/content/images/540e77d7-dbba-4d77-84b0-f95837150b35.png')
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.get('Authorization')).toMatch(/^Basic /)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe(4)
  })
})
