// Tác dụng: UC029-UC032 — trang chủ, tìm kiếm, chuyên mục và chi tiết bài (Free / preview Premium).
import { httpClient } from '@/lib/http/client'
import { Category } from '../types'
import { ArticleDto, ArticlePage, SpringPage, mapArticle, toArticlePage, unwrapList } from './shared'

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

export const articlesApi = {
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
}
