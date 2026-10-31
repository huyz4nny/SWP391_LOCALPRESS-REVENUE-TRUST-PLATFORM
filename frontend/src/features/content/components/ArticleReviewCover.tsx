import { useEffect, useState } from 'react'
import { contentApi } from '../api'

interface Props {
  articleId: string
  versionNumber: number
  imageUrl: string
  altText: string
  caption?: string | null
  source?: string | null
}

export function reviewCoverKind(imageUrl: string): 'none' | 'stored' | 'external' | 'invalid' {
  if (!imageUrl.trim()) return 'none'
  if (imageUrl.startsWith('/api/v1/content/images/')) return 'stored'
  try {
    const url = new URL(imageUrl)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? 'external' : 'invalid'
  } catch { return 'invalid' }
}

export function ArticleReviewCover({ articleId, versionNumber, imageUrl, altText, caption, source }: Props) {
  const kind = reviewCoverKind(imageUrl)
  const [storedUrl, setStoredUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (kind !== 'stored') return
    let active = true
    let objectUrl: string | null = null
    void contentApi.getReviewCoverImage(articleId, versionNumber).then(blob => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setStoredUrl(objectUrl)
    }).catch(() => {
      if (active) setError('Không tải được ảnh bìa. Vui lòng kiểm tra lại ảnh hoặc thử lại sau.')
    })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [articleId, versionNumber, imageUrl, kind])

  if (kind === 'none') return null
  const src = kind === 'external' ? imageUrl : storedUrl
  return (
    <figure className="space-y-2">
      {kind === 'invalid' || error ? (
        <p role="alert" className="text-sm text-red-700">{error || 'Đường dẫn ảnh bìa không hợp lệ.'}</p>
      ) : src ? (
        <img src={src} alt={altText} className="max-h-[32rem] w-full rounded-lg object-contain"
          referrerPolicy="no-referrer" onError={() => setError('Không tải được ảnh bìa. Vui lòng kiểm tra lại đường dẫn ảnh.')} />
      ) : <p role="status" className="text-sm text-slate-500">Đang tải ảnh bìa...</p>}
      {caption && <figcaption className="text-sm text-slate-600">{caption}</figcaption>}
      {source && <p className="text-sm text-slate-500">Nguồn ảnh: {source}</p>}
    </figure>
  )
}
