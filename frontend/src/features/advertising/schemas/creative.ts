import { z } from 'zod'

// Khớp mặc định backend (localpress.advertising.creative.max-bytes); server vẫn là nơi kiểm tra cuối cùng.
export const CREATIVE_MAX_BYTES = 2 * 1024 * 1024
export const CREATIVE_TYPES = ['image/jpeg', 'image/png']

export const creativeSchema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề banner').max(255, 'Tiêu đề tối đa 255 ký tự'),
  targetUrl: z.string().trim().max(2048, 'URL tối đa 2048 ký tự').refine((value) => {
    try {
      const url = new URL(value)
      return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname)
    } catch {
      return false
    }
  }, 'URL đích phải bắt đầu bằng http:// hoặc https://'),
  file: z.instanceof(File, { message: 'Vui lòng chọn ảnh banner' })
    .refine((file) => CREATIVE_TYPES.includes(file.type), 'Banner chỉ nhận ảnh JPEG hoặc PNG')
    .refine((file) => file.size <= CREATIVE_MAX_BYTES, `Ảnh banner tối đa ${CREATIVE_MAX_BYTES / 1024} KB`),
})

export type CreativeInput = z.infer<typeof creativeSchema>

/** "728x90" -> { width: 728, height: 90 } */
export function parseDimensions(dimensions?: string) {
  const match = dimensions?.match(/^(\d+)\s*x\s*(\d+)$/i)
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null
}
