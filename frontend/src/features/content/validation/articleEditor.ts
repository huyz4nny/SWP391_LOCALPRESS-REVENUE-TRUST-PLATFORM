import { z } from 'zod'

const requiredText = (label: string, max: number) => z.string()
  .max(max, `${label} tối đa ${max} ký tự`)
  .refine((value) => value.trim().length > 0, `Vui lòng nhập ${label}`)

export const articleEditorSchema = z.object({
  title: requiredText('tiêu đề bài viết', 255),
  sapo: requiredText('đoạn mở đầu (Sapo)', 2000),
  content: requiredText('nội dung bài viết', 100000),
  categoryId: z.string().min(1, 'Vui lòng chọn chuyên mục'),
  coverImage: z.string().max(1000, 'URL ảnh tối đa 1000 ký tự'),
  coverFile: z.custom<File | null>((value) => value === null || value instanceof File,
    'File ảnh không hợp lệ'),
  coverAltText: z.string().max(300, 'Văn bản thay thế tối đa 300 ký tự'),
  coverCaption: z.string().max(500, 'Chú thích ảnh tối đa 500 ký tự'),
  coverSource: z.string().max(300, 'Nguồn ảnh tối đa 300 ký tự'),
  tags: z.string(),
  isPremium: z.boolean(),
  price: z.number({ invalid_type_error: 'Vui lòng nhập giá hợp lệ' }).finite('Giá phải là số hữu hạn')
    .min(0, 'Giá không được âm').max(9999999999.99, 'Giá tối đa 9999999999.99')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001,
      'Giá tối đa 2 chữ số thập phân'),
  changelog: z.string().max(2000, 'Ghi chú thay đổi tối đa 2000 ký tự'),
}).superRefine((data, ctx) => {
  const issue = (field: keyof typeof data, message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message })
  if (data.isPremium && data.price <= 0) issue('price', 'Bài Premium cần giá lớn hơn 0')
  const tags = data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  if (tags.length > 50) issue('tags', 'Tối đa 50 thẻ tag')
  if (tags.some((tag) => tag.length > 100)) issue('tags', 'Mỗi thẻ tag tối đa 100 ký tự')
  if ((data.coverFile || data.coverImage.trim()) && !data.coverAltText.trim()) {
    issue('coverAltText', 'Vui lòng nhập văn bản thay thế cho ảnh')
  }
  if (data.coverFile) {
    if (data.coverFile.size === 0) issue('coverFile', 'File ảnh không được rỗng')
    if (data.coverFile.size > 5 * 1024 * 1024) issue('coverFile', 'Ảnh tối đa 5 MiB')
    if (data.coverFile.type && !['image/jpeg', 'image/png'].includes(data.coverFile.type)) {
      issue('coverFile', 'Chỉ chấp nhận ảnh JPEG hoặc PNG')
    }
  } else if (data.coverImage.trim()) {
    const url = data.coverImage.trim()
    const storedImage = /^\/api\/v1\/content\/images\/[0-9a-f-]{36}\.png$/i.test(url)
    let externalImage = false
    try { externalImage = ['http:', 'https:'].includes(new URL(url).protocol) } catch { /* invalid URL */ }
    if (!storedImage && !externalImage) issue('coverImage', 'URL ảnh phải là HTTP hoặc HTTPS hợp lệ')
  }
})

export type ArticleEditorValues = z.infer<typeof articleEditorSchema>

/** Map Bean Validation paths to the existing editor controls. */
export function editorFieldForApiError(path: string): keyof ArticleEditorValues | null {
  const fields: Record<string, keyof ArticleEditorValues> = {
    categoryId: 'categoryId', title: 'title', sapo: 'sapo', content: 'content', tags: 'tags',
    price: 'price', premiumPriceValid: 'price', changelog: 'changelog', coverImageUrl: 'coverImage',
    altText: 'coverAltText', caption: 'coverCaption', imageSource: 'coverSource', file: 'coverFile',
  }
  const normalized = path.replace(/^(request|article)\./, '').replace(/^(imageInfo|info)\./, '')
  return fields[normalized.split(/[.[]/)[0]] ?? null
}

export async function checkCoverDimensions(file: File): Promise<string | null> {
  try {
    const image = await createImageBitmap(file)
    try {
      return image.width > 4096 || image.height > 4096 ? 'Mỗi chiều ảnh tối đa 4096 pixel' : null
    } finally { image.close() }
  } catch {
    return 'Không đọc được ảnh. Vui lòng chọn file JPEG hoặc PNG hợp lệ'
  }
}
