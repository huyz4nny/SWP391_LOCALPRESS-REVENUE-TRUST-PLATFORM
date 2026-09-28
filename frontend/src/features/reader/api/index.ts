import { httpClient } from '@/lib/http/client'
import { Article, Category, SubscriptionPlan, Comment, ReaderEntitlement } from '../types'

export const readerApi = {
  getArticles: (params?: { category?: string; search?: string; isPremium?: boolean }) => {
    return httpClient.get<Article[]>('/articles', { params })
  },

  getArticleBySlug: (slug: string) => {
    return httpClient.get<Article>(`/articles/${slug}`)
  },

  getCategories: () => {
    return httpClient.get<Category[]>('/categories')
  },

  getSubscriptionPlans: () => {
    return httpClient.get<SubscriptionPlan[]>('/subscription-plans')
  },

  getEntitlements: () => {
    return httpClient.get<ReaderEntitlement>('/reader/entitlements')
  },

  toggleBookmark: (articleId: string) => {
    return httpClient.post<{ bookmarked: boolean }>(`/reader/bookmarks/${articleId}`)
  },

  getComments: (articleId: string) => {
    return httpClient.get<Comment[]>(`/reader/comments/${articleId}`)
  },

  postComment: (articleId: string, content: string) => {
    return httpClient.post<Comment>('/reader/comments', { articleId, content })
  },
}
