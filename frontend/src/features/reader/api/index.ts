import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { Article, Category, SubscriptionPlan, Comment, ReaderEntitlement } from '../types'

// file này là cầu nối giữa giao diện reader và backend của SV3
// chạy mock hay gọi backend thật tùy cờ APP_CONFIG.useMockApi
// luồng đi là page gọi readerApi -> httpClient gọi /api/v1 -> unwrapList và map đổi dữ liệu -> trả về cho page hiển thị

// kiểu dữ liệu bài viết backend trả về và có thể thiếu vài trường nên dùng Partial
type ArticleDto = Partial<Article> & {
  summary?: string
  coverImageUrl?: string
  viewCount?: number
  isLocked?: boolean
  accessType?: string
  singlePrice?: number
  price?: number
}

// kiểu của object phân trang Page mà spring boot trả về
type SpringPage<T> = {
  content?: T[]
  last?: boolean
  number?: number
  totalElements?: number
}

// kiểu kết quả phân trang mà các page của frontend dùng
export type ArticlePage = {
  items: Article[]
  page: number
  hasMore: boolean
  total: number
}

// hàm lấy ra mảng dữ liệu cho cả hai chế độ mock và backend thật
// nếu data đã là mảng (mock) thì trả luôn
// nếu data là Page của spring thì lấy mảng nằm trong content
// còn lại thì trả mảng rỗng để giao diện không bị lỗi
function unwrapList<T>(data: T[] | SpringPage<T> | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.content)) return data.content
  return []
}

// hàm đổi dữ liệu bài viết từ backend sang kiểu Article của giao diện cho UC029 UC030 UC031 UC032
// luồng đi là backend trả ArticleDto -> hàm này đổi tên trường cho khớp -> trả về page hiển thị ở màn hình II.3.1 và II.3.2
function mapArticle(dto: ArticleDto): Article {
  // trường nào backend và mock đặt tên khác nhau thì thử lần lượt từng tên rồi mới lấy giá trị mặc định
  const sapo = dto.sapo || dto.summary || ''
  const coverImage = dto.coverImage || dto.coverImageUrl || ''
  const views = dto.views ?? dto.viewCount ?? 0
  const isPremium = dto.isPremium ?? dto.accessType === 'PREMIUM'
  // bài bị khóa khi backend báo isLocked hoặc là bài premium mà content bị backend xóa trắng
  const isLocked = dto.isLocked ?? (isPremium && !dto.content)
  return {
    id: String(dto.id ?? ''),
    title: dto.title ?? '',
    slug: dto.slug ?? '',
    sapo,
    // bài bị khóa thì không có content để giao diện hiện khung paywall còn bài mở thì lấy toàn văn
    content: isLocked ? undefined : dto.content,
    // đoạn preview ưu tiên lấy từ backend nếu không có thì dùng sapo hoặc toàn văn
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

// các hàm gọi api của reader mà các page import để dùng
export const readerApi = {
  // UC029 và UC030 lấy danh sách bài cho trang chủ và tìm kiếm
  // gọi GET /articles rồi bóc mảng và map từng bài trả về cho HomePage SearchPage
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

  // UC029 và UC030 lấy danh sách bài theo trang để làm nút xem thêm
  // trang mặc định là 0 và size mặc định là 20
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
    // chế độ mock trả mảng thẳng nên coi như chỉ có một trang và không còn trang sau
    if (Array.isArray(data)) {
      return { items, page: 0, hasMore: false, total: items.length }
    }
    // chế độ backend thật thì lấy số trang hiện tại và còn trang sau hay không (last bằng false là còn) từ Page của spring
    return {
      items,
      page: data?.number ?? params.page ?? 0,
      hasMore: data?.last === false,
      total: data?.totalElements ?? items.length,
    }
  },

  // UC031 và UC032 lấy chi tiết bài theo slug
  // encodeURIComponent để slug có ký tự đặc biệt vẫn gọi đúng đường dẫn rồi đẩy kết quả qua mapArticle cho ArticleDetailPage
  getArticleBySlug: async (slug: string) => {
    const data = await httpClient.get<ArticleDto>(`/articles/${encodeURIComponent(slug)}`)
    return mapArticle(data)
  },

  // UC029 lấy danh sách chuyên mục cho thanh menu
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

  // UC031 lấy bình luận đã duyệt của bài (rule 12) cho CommentSection
  // đường dẫn mock và backend thật khác nhau nên chọn theo cờ useMockApi
  getComments: async (articleId: string) => {
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
