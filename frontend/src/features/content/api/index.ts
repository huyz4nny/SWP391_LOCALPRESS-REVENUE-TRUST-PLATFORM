import { httpClient } from '@/lib/http/client'

import type {
    CategoryOption,
    CreateArticleDraftRequest,
    ArticleDraftResponse,
    ArticleDraftDetailResponse,
    UpdateArticleMetadataRequest,
    CoverImageInfoRequest,
    ArticleCoverImageResponse,
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

    getCoverImage(imageUrl: string): Promise<Blob> {
        const prefix = '/api/v1/content/images/'

        if (!imageUrl.startsWith(prefix)) {
            throw new Error('Đường dẫn ảnh không hợp lệ')
        }

        const filename = imageUrl.slice(prefix.length)

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/i.test(filename)) {
            throw new Error('Tên file ảnh không hợp lệ')
        }

        return httpClient.getBlob(
            `/content/images/${encodeURIComponent(filename)}`,
        )
    },

    uploadCoverImage(
        id: string,
        file: File,
        info: CoverImageInfoRequest,
    ): Promise<ArticleCoverImageResponse> {
        const body = new FormData()

        body.append('file', file)

        body.append(
            'info',
            new Blob(
                [JSON.stringify(info)],
                { type: 'application/json' },
            ),
        )

        return httpClient.putFormData<ArticleCoverImageResponse>(
            `/articles/${encodeURIComponent(id)}/cover-image`,
            body,
        )
    },

    updateCoverImageInfo(
        id: string,
        info: CoverImageInfoRequest,
    ): Promise<ArticleDraftDetailResponse> {
        return httpClient.put<ArticleDraftDetailResponse>(
            `/articles/${encodeURIComponent(id)}/cover-image/info`,
            info,
        )
    },
}