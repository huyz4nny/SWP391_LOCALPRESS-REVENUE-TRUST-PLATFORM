// Tác dụng: kiểu và hàm đổi dữ liệu dùng chung cho các file api của reader.
import { APP_CONFIG } from '@/app/config'
import { Article } from '../types'

// kiểu dữ liệu bài viết backend trả về và có thể thiếu vài trường nên dùng Partial
export type ArticleDto = Partial<Article> & {
  summary?: string
  coverImageUrl?: string
  viewCount?: number
  isLocked?: boolean
  accessType?: string
  singlePrice?: number
  price?: number
}

// kiểu của object phân trang Page mà spring boot trả về
export type SpringPage<T> = {
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
export function unwrapList<T>(data: T[] | SpringPage<T> | null | undefined): T[] {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.content)) return data.content
  return []
}

// mock dùng id chuỗi như art-001 còn backend thật cần id số trên đường dẫn
export function idSegment(id: string) {
  return encodeURIComponent(APP_CONFIG.useMockApi ? id : String(Number(id)))
}

// mock gửi id chuỗi, backend thật cần id số trong body
export function bodyId(id: string): string | number {
  return APP_CONFIG.useMockApi ? id : Number(id)
}

// hàm đổi dữ liệu bài viết từ backend sang kiểu Article của giao diện cho UC029 UC030 UC031 UC032
// luồng đi là backend trả ArticleDto -> hàm này đổi tên trường cho khớp -> trả về page hiển thị ở màn hình II.3.1 và II.3.2
export function mapArticle(dto: ArticleDto): Article {
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
    accessible: dto.accessible === true,
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
export function toArticlePage(data: ArticleDto[] | SpringPage<ArticleDto> | null | undefined, requestedPage: number): ArticlePage {
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
