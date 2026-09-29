import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { Article, Comment } from '@/features/reader/types'
import { AdBooking, AdCreative } from '@/features/advertising/types'

const EDITORIAL_API_URL = `${APP_CONFIG.apiBaseUrl}/editorial`

export const editorialApi = {
  getArticles: async (): Promise<Article[]> => {
    const res = await fetch(`${EDITORIAL_API_URL}/articles`)
    if (!res.ok) {
      throw new Error('Không thể tải danh sách bài viết từ máy chủ Backend (8080)')
    }
    return res.json()
  },

  createArticle: (data: Partial<Article>) => {
    return httpClient.post<Article>('/editorial/articles', data)
  },

  updateArticle: (id: string, article: Partial<Article>, changelog?: string) => {
    return httpClient.put<Article>(`/editorial/articles/${id}`, { article, changelog })
  },

  updateArticleStatus: async (id: string, status: Article['status'], reviewNotes?: string): Promise<Article> => {
    const res = await fetch(`${EDITORIAL_API_URL}/articles/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewNotes }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Lỗi cập nhật trạng thái bài viết trên Backend')
    }
    return res.json()
  },

  getBookings: () => {
    return httpClient.get<AdBooking[]>('/editorial/bookings')
  },

  sendQuotation: (id: string, finalPrice: number, discountPercent: number, quotationNotes: string) => {
    return httpClient.post<AdBooking>(`/editorial/bookings/${id}/quote`, { finalPrice, discountPercent, quotationNotes })
  },

  reviewCreative: (id: string, approved: boolean, notes: string) => {
    return httpClient.post<AdCreative>(`/editorial/creatives/${id}/review-creative`, { approved, notes })
  },

  getComments: () => {
    return httpClient.get<Comment[]>('/editorial/comments')
  },

  moderateComment: (id: string, status: 'APPROVED' | 'REJECTED') => {
    return httpClient.post<Comment>(`/editorial/comments/${id}/moderate-comment`, { status })
  },

  getAiSuggestions: (topic: string) => {
    return httpClient.post<{ suggestedTitles: string[]; suggestedSapo: string; suggestedTags: string[] }>(
      '/editorial/ai/suggest',
      { topic }
    )
  },
}
