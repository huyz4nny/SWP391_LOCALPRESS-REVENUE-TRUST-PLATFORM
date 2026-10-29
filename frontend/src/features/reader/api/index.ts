import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { Article, Category, SubscriptionPlan, Comment } from '../types'

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

export type ReaderSubscription = {
  subscriptionId: string
  planName: string
  price: number
  accessScope: string
  categoryName: string | null
  startDate: string
  endDate: string
  autoRenew: boolean
  hasAdFree: boolean
  hasAudio: boolean
  inEffect: boolean
}

type ReaderSubscriptionDto = {
  subscriptionId?: string | number
  planName?: string
  price?: number
  accessScope?: string
  categoryName?: string | null
  startDate?: string
  endDate?: string
  autoRenew?: boolean
  hasAdFree?: boolean
  hasAudio?: boolean
  inEffect?: boolean
}

export type ReaderDevice = {
  deviceId: string
  deviceName: string
  deviceType: string
  ipAddress: string | null
  lastActiveAt: string
  createdAt: string
  current: boolean
}

function mapDevice(dto: Partial<ReaderDevice> | null | undefined): ReaderDevice {
  return {
    deviceId: String(dto?.deviceId ?? ''),
    deviceName: dto?.deviceName ?? '',
    deviceType: dto?.deviceType ?? 'DESKTOP',
    ipAddress: dto?.ipAddress ?? null,
    lastActiveAt: dto?.lastActiveAt ?? '',
    createdAt: dto?.createdAt ?? '',
    current: Boolean(dto?.current),
  }
}

function mapSubscription(dto: Partial<ReaderSubscriptionDto> | null | undefined): ReaderSubscription {
  return {
    subscriptionId: String(dto?.subscriptionId ?? ''),
    planName: dto?.planName ?? '',
    price: Number(dto?.price ?? 0),
    accessScope: dto?.accessScope ?? 'ALL',
    categoryName: dto?.categoryName ?? null,
    startDate: dto?.startDate ?? '',
    endDate: dto?.endDate ?? '',
    autoRenew: Boolean(dto?.autoRenew),
    hasAdFree: Boolean(dto?.hasAdFree),
    hasAudio: Boolean(dto?.hasAudio),
    inEffect: Boolean(dto?.inEffect),
  }
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

function scopeLine(dto: { accessScope?: string; categoryName?: string | null }): string {
  if (dto.accessScope === 'CATEGORY' && dto.categoryName) {
    return `Đọc bài Premium thuộc chuyên mục ${dto.categoryName}`
  }
  return 'Đọc bài Premium toàn trang'
}

function mapPublicPlan(dto: Partial<SubscriptionPlan> & {
  id?: string | number
  accessScope?: string
  categoryName?: string | null
  hasAdFree?: boolean
  hasAudio?: boolean
  status?: string
}): SubscriptionPlan {
  // mock đã có sẵn mô tả, backend thật trả phạm vi gói để không ghi nhầm gói chuyên mục thành toàn trang
  if (dto.features && dto.features.length > 0 && !dto.accessScope) {
    return {
      id: String(dto.id ?? ''),
      name: dto.name ?? '',
      code: dto.code ?? `PLAN_${dto.id}`,
      price: Number(dto.price ?? 0),
      durationDays: Number(dto.durationDays ?? 0),
      description: dto.description ?? '',
      features: dto.features,
      isPopular: dto.isPopular,
      isActive: dto.isActive ?? true,
    }
  }
  const line = scopeLine(dto)
  const features = [line]
  if (dto.hasAdFree) features.push('Không hiện quảng cáo')
  if (dto.hasAudio) features.push('Nghe audio')
  features.push(`Thời hạn ${Number(dto.durationDays ?? 0)} ngày`)
  return {
    id: String(dto.id ?? ''),
    name: dto.name ?? '',
    code: dto.code ?? `PLAN_${dto.id}`,
    price: Number(dto.price ?? 0),
    durationDays: Number(dto.durationDays ?? 0),
    description: line,
    features,
    isActive: dto.status === 'ACTIVE' || dto.isActive === true,
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

  getSubscriptionPlans: async () => {
    const data = await httpClient.get<Array<Partial<SubscriptionPlan>>>('/subscription-plans')
    return (data ?? []).map(mapPublicPlan)
  },

  // UC044 gói ACTIVE chưa hết hạn của user đang đăng nhập
  getMySubscriptions: async (): Promise<ReaderSubscription[]> => {
    const data = await httpClient.get<Array<Partial<ReaderSubscriptionDto>>>('/reader/subscriptions/me')
    return (data ?? []).map(mapSubscription)
  },

  // UC044 tắt gia hạn kỳ sau, quyền đọc giữ đến endDate
  cancelAutoRenew: async (subscriptionId: string): Promise<ReaderSubscription> => {
    const data = await httpClient.post<Partial<ReaderSubscriptionDto>>(
      `/reader/subscriptions/${idSegment(subscriptionId)}/cancel-auto-renew`,
    )
    return mapSubscription(data)
  },

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

  // UC031 lấy bình luận đã duyệt của bài (rule 12) cho CommentSection
  // đường dẫn mock và backend thật khác nhau nên chọn theo cờ useMockApi
  getComments: async (articleId: string) => {
    const path = APP_CONFIG.useMockApi
      ? `/reader/comments/${encodeURIComponent(articleId)}`
      : `/comments/article/${encodeURIComponent(articleId)}`
    const data = await httpClient.get<Array<Partial<Comment>>>(path)
    return unwrapList(data).map(mapComment)
  },

  postComment: async (articleId: string, content: string) => {
    const data = await httpClient.post<Partial<Comment>>('/reader/comments', {
      articleId: APP_CONFIG.useMockApi ? articleId : Number(articleId),
      content,
    })
    return mapComment(data)
  },

  // sửa bình luận của chính mình, backend đưa status về PENDING
  updateComment: async (commentId: string, content: string) => {
    const data = await httpClient.put<Partial<Comment>>(`/reader/comments/${idSegment(commentId)}`, { content })
    return mapComment(data)
  },

  // bình luận của user đang đăng nhập, kể cả đang chờ duyệt
  getMyComments: async (articleId: string) => {
    const data = await httpClient.get<Array<Partial<Comment>>>('/reader/comments/mine', {
      params: { articleId: APP_CONFIG.useMockApi ? articleId : Number(articleId) },
    })
    return unwrapList(data).map(mapComment)
  },

  // chỉ comment đang APPROVED mới báo cáo được
  reportComment: (commentId: string, reason: string) => {
    return httpClient.post<{ commentId: string | number; status: string }>(
      `/reader/comments/${idSegment(commentId)}/report`,
      { reason },
    )
  },

  // UC043 phiên còn hiệu lực của user đang đăng nhập
  listDevices: async (): Promise<ReaderDevice[]> => {
    const data = await httpClient.get<Array<Partial<ReaderDevice>>>('/reader/devices')
    return (data ?? []).map(mapDevice)
  },

  revokeDevice: (deviceId: string) => {
    return httpClient.delete<void>(`/reader/devices/${idSegment(deviceId)}`)
  },

  // UC042 báo lỗi nội dung bài đang xuất bản, server tự gắn user và status PENDING
  reportArticle: (articleId: string, reason: string, description: string) => {
    return httpClient.post<{ reportId: number; status: string }>('/reader/article-reports', {
      articleId: APP_CONFIG.useMockApi ? articleId : Number(articleId),
      reason,
      description,
    })
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
