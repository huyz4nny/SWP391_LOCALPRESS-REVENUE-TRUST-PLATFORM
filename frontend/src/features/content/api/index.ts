import { httpClient } from '@/lib/http/client'

import type {
    CategoryOption,
    CreateArticleDraftRequest,
    ArticleDraftResponse,
    ArticleDraftDetailResponse,
    UpdateArticleMetadataRequest,
} from '../types'

export const contentApi = {
    getCategories(): Promise<CategoryOption[]> {
        return httpClient.get<CategoryOption[]>('/categories')
    },

    getDraft(id: string): Promise<ArticleDraftDetailResponse> {
        return httpClient.get<ArticleDraftDetailResponse>(
            `/articles/${encodeURIComponent(id)}`,
        )
    },

    createDraft(
        request: CreateArticleDraftRequest,
    ): Promise<ArticleDraftResponse> {
        return httpClient.post<ArticleDraftResponse>(
            '/articles',
            request,
        )
    },

    updateMetadata(
        id: string,
        request: UpdateArticleMetadataRequest,
    ): Promise<ArticleDraftDetailResponse> {
        return httpClient.put<ArticleDraftDetailResponse>(
            `/articles/${encodeURIComponent(id)}/metadata`,
            request,
        )
    },
}