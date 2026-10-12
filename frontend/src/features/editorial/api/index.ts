import { httpClient } from '@/lib/http/client'
import {
  Article,
  Category,
  Comment,
  SubscriptionPlan,
} from '@/features/reader/types'
import { AdBooking, AdCreative } from '@/features/advertising/types'
import type { CoverImageInfoRequest } from '@/features/content/types'

export type EditorialCategoryOption = Pick<Category, 'id' | 'name' | 'slug'>

function coverUploadBody(partName: 'article' | 'request', payload: unknown, file: File, info: CoverImageInfoRequest): FormData {
  const body = new FormData()
  body.append(partName, new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  body.append('file', file)
  body.append('info', new Blob([JSON.stringify(info)], { type: 'application/json' }))
  return body
}

export const editorialApi = {
  createArticleWithCover: (article: Partial<Article>, file: File, info: CoverImageInfoRequest) =>
    httpClient.postFormData<Article>('/editorial/articles', coverUploadBody('article', article, file, info)),

  updateArticleWithCover: (id: string, article: Partial<Article>, file: File, info: CoverImageInfoRequest, changelog?: string) =>
    httpClient.putFormData<Article>(`/editorial/articles/${encodeURIComponent(id)}`,
      coverUploadBody('request', { article, changelog }, file, info)),
  getArticle: (id: string) => {
    return httpClient.get<Article>(`/editorial/articles/${encodeURIComponent(id)}`)
  },

  getCategories: async (): Promise<EditorialCategoryOption[]> => {
    const categories = await httpClient.get<EditorialCategoryOption[]>('/categories')
    return categories.map((category) => ({
      id: `cat-${category.slug}`,
      name: category.name,
      slug: category.slug,
    }))
  },
  getArticles: () => {
    return httpClient.get<Article[]>('/editorial/articles')
  },

  createArticle: (data: Partial<Article>) => {
    return httpClient.post<Article>('/editorial/articles', data)
  },

  updateArticle: (id: string, article: Partial<Article>, changelog?: string, imageInfo?: CoverImageInfoRequest) => {
    return httpClient.put<Article>(`/editorial/articles/${id}`, { article, changelog, imageInfo })
  },

  updateArticleStatus: (id: string, status: Article['status'], reviewNotes?: string) => {
    return httpClient.post<Article>(`/editorial/articles/${id}/status`, { status, reviewNotes })
  },

  // ==========================================
  // UC026: Comment Moderation
  // ==========================================
  getComments: (status?: string) => {
    return httpClient.get<Comment[]>('/editorial/comments', { params: { status } })
  },

  moderateComment: (id: string, status: 'APPROVED' | 'REJECTED' | 'HIDDEN', reason?: string) => {
    return httpClient.post<Comment>(`/editorial/comments/${id}/moderate`, { status, reason })
  },

  // ==========================================
  // UC027: Content Policy (Free / Premium & Price)
  // ==========================================
  updateArticlePolicy: (id: string, accessType: 'FREE' | 'PREMIUM', singlePrice?: number) => {
    return httpClient.put<Article>(`/editorial/articles/${id}/policy`, { accessType, singlePrice })
  },

  // ==========================================
  // UC028: Subscription Plans Management
  // ==========================================
  getSubscriptionPlans: () => {
    return httpClient.get<SubscriptionPlan[]>('/editorial/subscription-plans')
  },

  createSubscriptionPlan: (data: Partial<SubscriptionPlan>) => {
    return httpClient.post<SubscriptionPlan>('/editorial/subscription-plans', data)
  },

  updateSubscriptionPlan: (id: string, data: Partial<SubscriptionPlan>) => {
    return httpClient.put<SubscriptionPlan>(`/editorial/subscription-plans/${id}`, data)
  },

  toggleSubscriptionPlanStatus: (id: string) => {
    return httpClient.post<SubscriptionPlan>(`/editorial/subscription-plans/${id}/toggle-status`)
  },

  // ==========================================
  // Advertising (Iteration 2)
  // ==========================================
  getBookings: () => {
    return httpClient.get<AdBooking[]>('/editorial/bookings')
  },

  sendQuotation: (id: string, finalPrice: number, discountPercent: number, quotationNotes: string) => {
    return httpClient.post<AdBooking>(`/editorial/bookings/${id}/quote`, { finalPrice, discountPercent, quotationNotes })
  },

  reviewCreative: (id: string, approved: boolean, notes: string) => {
    return httpClient.post<AdCreative>(`/editorial/creatives/${id}/review-creative`, { approved, notes })
  },

  getAiSuggestions: (topic: string) => {
    return httpClient.post<{ suggestedTitles: string[]; suggestedSapo: string; suggestedTags: string[] }>(
      '/editorial/ai/suggest',
      { topic }
    )
  },
}
