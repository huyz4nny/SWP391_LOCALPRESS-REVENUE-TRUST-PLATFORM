import { afterEach, expect, it, vi } from 'vitest'
import { articleEditorSchema, checkCoverDimensions, editorFieldForApiError } from '../features/content/validation/articleEditor'

const valid = { title: 'Title', sapo: 'Sapo', content: 'Content', categoryId: 'cat-thoi-su',
  coverImage: '', coverFile: null, coverAltText: '', coverCaption: '', coverSource: '',
  tags: '', isPremium: false, price: 0, changelog: '' }
afterEach(() => vi.unstubAllGlobals())
it('accepts a complete draft without an optional image or tags', () => {
  expect(articleEditorSchema.safeParse(valid).success).toBe(true)
})
it.each(['title', 'sapo', 'content', 'categoryId'] as const)('rejects missing required field %s', (field) => {
  const result = articleEditorSchema.safeParse({ ...valid, [field]: '' })
  expect(result.success).toBe(false)
  if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true)
})
it.each(['title', 'sapo', 'content'] as const)('rejects whitespace-only %s', (field) => {
  expect(articleEditorSchema.safeParse({ ...valid, [field]: ' \n\t ' }).success).toBe(false)
})
it.each([['title', 255], ['sapo', 2000], ['content', 100000], ['changelog', 2000],
  ['coverAltText', 300], ['coverCaption', 500], ['coverSource', 300]] as const)(
  'checks %s maximum length including boundary', (field, max) => {
    expect(articleEditorSchema.safeParse({ ...valid, [field]: 'x'.repeat(max) }).success).toBe(true)
    expect(articleEditorSchema.safeParse({ ...valid, [field]: 'x'.repeat(max + 1) }).success).toBe(false)
  })
it('rejects invalid Premium prices', () => {
  for (const price of [0, -1, NaN, Infinity, 10000000000, 1.234]) {
    expect(articleEditorSchema.safeParse({ ...valid, isPremium: true, price }).success).toBe(false)
  }
  expect(articleEditorSchema.safeParse({ ...valid, isPremium: true, price: 15000 }).success).toBe(true)
})
it('enforces count and length of tags', () => {
  expect(articleEditorSchema.safeParse({ ...valid, tags: Array(51).fill('tag').join(',') }).success).toBe(false)
  expect(articleEditorSchema.safeParse({ ...valid, tags: 'x'.repeat(101) }).success).toBe(false)
  expect(articleEditorSchema.safeParse({ ...valid, tags: 'Hai Phong, Tin tuc' }).success).toBe(true)
})
it('requires alt text and HTTP URL for external cover', () => {
  expect(articleEditorSchema.safeParse({ ...valid, coverImage: 'https://example.test/a.png' }).success).toBe(false)
  expect(articleEditorSchema.safeParse({ ...valid, coverImage: 'javascript:alert(1)', coverAltText: 'Alt' }).success).toBe(false)
  expect(articleEditorSchema.safeParse({ ...valid, coverImage: 'https://example.test/a.png', coverAltText: 'Alt' }).success).toBe(true)
})
it('rejects empty, oversized and unsupported upload files', () => {
  for (const file of [new File([], 'empty.png', { type: 'image/png' }),
    new File(['pdf'], 'a.pdf', { type: 'application/pdf' }),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' })]) {
    expect(articleEditorSchema.safeParse({ ...valid, coverFile: file, coverAltText: 'Alt' }).success).toBe(false)
  }
})
it('checks dimensions and releases decoded image', async () => {
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4097, height: 100, close }))
  expect(await checkCoverDimensions(new File(['x'], 'a.png'))).toContain('4096')
  expect(close).toHaveBeenCalledOnce()
})
it('shows an error for corrupt image bytes', async () => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
  expect(await checkCoverDimensions(new File(['bad'], 'a.png'))).toContain('Không đọc được ảnh')
})
it('maps nested backend field errors to visible inputs', () => {
  expect(editorFieldForApiError('imageInfo.altText')).toBe('coverAltText')
  expect(editorFieldForApiError('info.caption')).toBe('coverCaption')
  expect(editorFieldForApiError('tags[0]')).toBe('tags')
  expect(editorFieldForApiError('price')).toBe('price')
  expect(editorFieldForApiError('coverImageUrl')).toBe('coverImage')
  expect(editorFieldForApiError('unknown')).toBe(null)
})
