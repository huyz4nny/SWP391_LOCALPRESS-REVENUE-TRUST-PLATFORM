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

// kết quả backend trả sau khi tạo bản ghi chờ thanh toán cho bài lẻ hoặc gói cước
// targetId là purchase_id hoặc subscription_id và amount là giá do server tính nên frontend không tự đặt giá
export type PendingOrderTarget = {
  orderType: 'ARTICLE' | 'SUBSCRIPTION'
  targetId: string | number
  amount: number
  title: string
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

// hàm đổi kết quả danh sách bài sang ArticlePage dùng chung cho trang chủ, bài đã lưu và feed theo dõi
// mock trả mảng thẳng nên coi như chỉ có một trang, backend thật trả Page của spring thì lấy số trang và cờ last
function toArticlePage(data: ArticleDto[] | SpringPage<ArticleDto> | null | undefined, requestedPage: number): ArticlePage {
  const items = unwrapList(data).map(mapArticle)
  if (Array.isArray(data)) {
    return { items, page: 0, hasMore: false, total: items.length }
  }
  return {
    items,
    page: data?.number ?? requestedPage,
    hasMore: data?.last === false,
    total: data?.totalElements ?? items.length,
  }
}

// chuyên mục độc giả đang theo dõi ở UC040, articleCount là số bài đang xuất bản
export type FollowedCategory = {
  id: string
  name: string
  slug: string
  description: string
  articleCount: number
  followedAt: string | null
}

// mock dùng id chuỗi như art-001 còn backend thật cần id số trên đường dẫn
function idSegment(id: string) {
  return encodeURIComponent(APP_CONFIG.useMockApi ? id : String(Number(id)))
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
    return toArticlePage(data, params.page ?? 0)
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

  // UC034 tạo bản ghi mua lẻ chờ thanh toán (PENDING) trước khi tạo đơn bên SV4
  // chế độ mock giữ nguyên id chuỗi còn backend thật cần id số nên đổi bằng Number
  // luồng đi là gọi POST /reader/article-purchases -> nhận targetId (purchase_id) và giá từ server -> PaywallPrompt đem sang POST /finance/checkout
  createArticlePurchase: (articleId: string) => {
    return httpClient.post<PendingOrderTarget>('/reader/article-purchases', {
      articleId: APP_CONFIG.useMockApi ? articleId : Number(articleId),
    })
  },

  // UC035 tạo bản ghi gói cước chờ thanh toán (PENDING) trước khi tạo đơn bên SV4
  // luồng đi là gọi POST /reader/subscriptions -> nhận targetId (subscription_id) và giá của gói -> PremiumPlansPage đem sang POST /finance/checkout
  createSubscription: (planId: string) => {
    return httpClient.post<PendingOrderTarget>('/reader/subscriptions', {
      planId: APP_CONFIG.useMockApi ? planId : Number(planId),
    })
  },
}
