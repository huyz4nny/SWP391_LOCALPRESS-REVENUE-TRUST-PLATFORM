import { httpClient } from '@/lib/http/client'
import { Article, Comment } from '@/features/reader/types'
import { AdBooking, AdCreative } from '@/features/advertising/types'

export const editorialApi = {
  getArticles: () => {
    return httpClient.get<Article[]>('/editorial/articles')
  },

  createArticle: (data: Partial<Article>) => {
    return httpClient.post<Article>('/editorial/articles', data)
  },

  updateArticle: (id: string, article: Partial<Article>, changelog?: string) => {
    return httpClient.put<Article>(`/editorial/articles/${id}`, { article, changelog })
  },

  updateArticleStatus: (id: string, status: Article['status'], reviewNotes?: string) => {
    return httpClient.post<Article>(`/editorial/articles/${id}/status`, { status, reviewNotes })
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
