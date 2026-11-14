// Tác dụng: UC037-UC040 — tủ sách: bài đã mua, bài đã lưu, lịch sử đọc, chuyên mục theo dõi và feed.
import { httpClient } from '@/lib/http/client'
import { ArticleDto, ArticlePage, SpringPage, idSegment, toArticlePage, unwrapList } from './shared'

// chuyên mục độc giả đang theo dõi ở UC040, articleCount là số bài đang xuất bản
export type FollowedCategory = {
  id: string
  name: string
  slug: string
  description: string
  articleCount: number
  followedAt: string | null
}

export type ReadingHistoryItem = {
  articleId: string
  title: string
  slug: string
  isPremium: boolean
  categoryName: string
  categorySlug: string
  lastReadAt: string | null
}

type ReadingHistoryItemDto = Partial<ReadingHistoryItem> & { articleId?: string | number }

function mapHistoryItem(dto: ReadingHistoryItemDto): ReadingHistoryItem {
  return {
    articleId: String(dto.articleId ?? ''),
    title: dto.title ?? '',
    slug: dto.slug ?? '',
    isPremium: Boolean(dto.isPremium),
    categoryName: dto.categoryName ?? '',
    categorySlug: dto.categorySlug ?? '',
    lastReadAt: dto.lastReadAt ?? null,
  }
}

export const libraryApi = {
  // UC037 danh sách bài đã mua lẻ còn hiệu lực, bài mới mua lên đầu
  getPurchasedArticlesPage: async (page = 0, size = 20): Promise<ArticlePage> => {
    const data = await httpClient.get<ArticleDto[] | SpringPage<ArticleDto>>('/reader/purchased-articles', {
      params: { page, size },
    })
    return toArticlePage(data, page)
  },

  // UC038 id các bài đã lưu để tô icon lưu trên thẻ bài và đếm số bài ở menu tài khoản
  getSavedArticleIds: async (): Promise<string[]> => {
    const data = await httpClient.get<Array<string | number>>('/reader/saved-articles/ids')
    return (data ?? []).map(String)
  },

  // UC038 danh sách bài đã lưu có phân trang, bài vừa lưu lên đầu
  getSavedArticlesPage: async (page = 0, size = 20): Promise<ArticlePage> => {
    const data = await httpClient.get<ArticleDto[] | SpringPage<ArticleDto>>('/reader/saved-articles', {
      params: { page, size },
    })
    return toArticlePage(data, page)
  },

  // UC038 lưu (PUT) hoặc bỏ lưu (DELETE), gọi lặp lại không làm đảo trạng thái
  setBookmark: async (articleId: string, saved: boolean): Promise<boolean> => {
    const path = `/reader/saved-articles/${idSegment(articleId)}`
    const res = saved
      ? await httpClient.put<{ saved: boolean }>(path)
      : await httpClient.delete<{ saved: boolean }>(path)
    return res.saved
  },

  // UC040 danh sách chuyên mục đang theo dõi
  getFollowedCategories: async (): Promise<FollowedCategory[]> => {
    const data = await httpClient.get<Array<Partial<FollowedCategory> & { id?: string | number }>>('/reader/followed-categories')
    return (data ?? []).map((c) => ({
      id: String(c.id ?? ''),
      name: c.name ?? '',
      slug: c.slug ?? '',
      description: c.description ?? '',
      articleCount: c.articleCount ?? 0,
      followedAt: c.followedAt ?? null,
    }))
  },

  // UC040 theo dõi (PUT) hoặc bỏ theo dõi (DELETE) một chuyên mục
  setCategoryFollow: async (categoryId: string, following: boolean): Promise<boolean> => {
    const path = `/reader/followed-categories/${idSegment(categoryId)}`
    const res = following
      ? await httpClient.put<{ following: boolean }>(path)
      : await httpClient.delete<{ following: boolean }>(path)
    return res.following
  },

  // UC040 feed bài mới của các chuyên mục đang theo dõi
  getFollowedFeedPage: async (page = 0, size = 20): Promise<ArticlePage> => {
    const data = await httpClient.get<ArticleDto[] | SpringPage<ArticleDto>>('/reader/feed', {
      params: { page, size },
    })
    return toArticlePage(data, page)
  },

  // UC039 một dòng lịch sử đọc, lastReadAt để hiện "đã đọc lúc"
  getReadingHistoryPage: async (page = 0, size = 20): Promise<{
    items: ReadingHistoryItem[]
    page: number
    hasMore: boolean
    total: number
  }> => {
    const data = await httpClient.get<ReadingHistoryItem[] | SpringPage<ReadingHistoryItemDto>>('/reader/reading-history', {
      params: { page, size },
    })
    const raw = unwrapList(data)
    const items = raw.map(mapHistoryItem)
    if (Array.isArray(data)) {
      return { items, page: 0, hasMore: false, total: items.length }
    }
    return {
      items,
      page: data?.number ?? page,
      hasMore: data?.last === false,
      total: data?.totalElements ?? items.length,
    }
  },

  getReadingHistoryCount: async (): Promise<number> => {
    const data = await httpClient.get<number>('/reader/reading-history/count')
    return Number(data ?? 0)
  },

  removeReadingHistory: async (articleId: string): Promise<void> => {
    await httpClient.delete(`/reader/reading-history/${idSegment(articleId)}`)
  },
}
