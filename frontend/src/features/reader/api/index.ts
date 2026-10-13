import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { Article, Category, SubscriptionPlan, Comment, ReaderEntitlement } from '../types'

type ArticleDto = Partial<Article> & {
  summary?: string
  coverImageUrl?: string
  viewCount?: number
  isLocked?: boolean
  accessType?: string
  singlePrice?: number
  price?: number
}

type SpringPage<T> = {
  content?: T[]
  last?: boolean
  number?: number
  totalElements?: number
}

export type ArticlePage = {
  items: Article[]
  page: number
  hasMore: boolean
  total: number
}

function unwrapList<T>(data: T[] | SpringPage<T> | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.content)) return data.content
  return []
}

function mapArticle(dto: ArticleDto): Article {
  const sapo = dto.sapo || dto.summary || ''
  const coverImage = dto.coverImage || dto.coverImageUrl || ''
  const views = dto.views ?? dto.viewCount ?? 0
  const isPremium = dto.isPremium ?? dto.accessType === 'PREMIUM'
  const isLocked = dto.isLocked ?? (isPremium && !dto.content)
  return {
    id: String(dto.id ?? ''),
    title: dto.title ?? '',
    slug: dto.slug ?? '',
    sapo,
    content: isLocked ? undefined : dto.content,
    previewContent: dto.previewContent ?? (isLocked ? sapo : dto.content ?? sapo),
    authorId: dto.authorId ? String(dto.authorId) : '',
    authorName: dto.authorName ?? '',
    categoryId: dto.categoryId ? String(dto.categoryId) : '',
    categoryName: dto.categoryName ?? '',
    categorySlug: dto.categorySlug ?? '',
    coverImage,
    tags: dto.tags ?? [],
    isPremium,
    isLocked,
    price: Number(dto.price ?? dto.singlePrice ?? 0),
    status: dto.status ?? 'PUBLISHED',
    views,
    publishedAt: dto.publishedAt ?? null,
    createdAt: dto.createdAt ?? dto.publishedAt ?? '',
    updatedAt: dto.updatedAt ?? dto.publishedAt ?? '',
    readTimeMinutes: dto.readTimeMinutes ?? 5,
    currentVersion: dto.currentVersion ?? 1,
  }
}

function mapCategory(dto: Partial<Category> & { id?: string | number; description?: string; articleCount?: number }): Category {
  return {
    id: String(dto.id ?? ''),
    name: dto.name ?? '',
    slug: dto.slug ?? '',
    description: dto.description ?? '',
    articleCount: dto.articleCount ?? 0,
    iconName: dto.iconName,
    isFeatured: dto.isFeatured,
  }
}

function mapComment(dto: Partial<Comment> & { id?: string | number; articleId?: string | number; userId?: string | number }): Comment {
  return {
    id: String(dto.id ?? ''),
    articleId: String(dto.articleId ?? ''),
    articleTitle: dto.articleTitle,
    userId: String(dto.userId ?? ''),
    userName: dto.userName ?? '',
    userAvatar: dto.userAvatar,
    content: dto.content ?? '',
    status: dto.status ?? 'APPROVED',
    createdAt: dto.createdAt ?? '',
    likeCount: dto.likeCount ?? 0,
    reported: dto.reported ?? false,
    reportReason: dto.reportReason,
  }
}

export const readerApi = {
  getArticles: async (params?: { category?: string; search?: string; isPremium?: boolean }) => {
    const data = await httpClient.get<ArticleDto[] | SpringPage<ArticleDto>>('/articles', {
      params: {
        category: params?.category,
        search: params?.search,
        isPremium: params?.isPremium,
      },
    })
    return unwrapList(data).map(mapArticle)
  },

  /** Lấy theo trang (Spring Page: content/last/number/totalElements). Mock API trả mảng nên coi như 1 trang. */
  getArticlesPage: async (params: { category?: string; search?: string; isPremium?: boolean; page?: number; size?: number }): Promise<ArticlePage> => {
    const data = await httpClient.get<ArticleDto[] | SpringPage<ArticleDto>>('/articles', {
      params: {
        category: params.category,
        search: params.search,
        isPremium: params.isPremium,
        page: params.page ?? 0,
        size: params.size ?? 20,
      },
    })
    const items = unwrapList(data).map(mapArticle)
    if (Array.isArray(data)) {
      return { items, page: 0, hasMore: false, total: items.length }
    }
    return {
      items,
      page: data?.number ?? params.page ?? 0,
      hasMore: data?.last === false,
      total: data?.totalElements ?? items.length,
    }
  },

  getArticleBySlug: async (slug: string) => {
    const data = await httpClient.get<ArticleDto>(`/articles/${encodeURIComponent(slug)}`)
    return mapArticle(data)
  },

  getCategories: async () => {
    const data = await httpClient.get<Array<Partial<Category>>>('/categories')
    return unwrapList(data).map(mapCategory)
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

  getComments: async (articleId: string) => {
    // Backend thật: GET /api/v1/comments/article/{id} (public, chỉ trả bình luận APPROVED - Rule 12).
    // Mock API vẫn dùng đường dẫn cũ /reader/comments/{id}.
    const path = APP_CONFIG.useMockApi
      ? `/reader/comments/${encodeURIComponent(articleId)}`
      : `/comments/article/${encodeURIComponent(articleId)}`
    const data = await httpClient.get<Array<Partial<Comment>>>(path)
    return unwrapList(data).map(mapComment)
  },

  postComment: (articleId: string, content: string) => {
    return httpClient.post<Comment>('/reader/comments', { articleId, content })
  },
}
