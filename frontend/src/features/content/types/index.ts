export interface CategoryOption {
    id: string
    name: string
    slug: string
}

export interface CreateArticleDraftRequest {
    categoryId: number
    title: string
    sapo?: string | null
    content: string
    source?: string | null
}

export interface ArticleDraftResponse {
    id: string
    slug: string
    status: 'DRAFT'
    latestVersion: number
}

export interface ArticleDraftDetailResponse
    extends ArticleDraftResponse {
    categoryId: string
    title: string
    sapo: string | null
    content: string
    source: string | null
}

export interface UpdateArticleMetadataRequest {
    categoryId: number
    slug: string
}