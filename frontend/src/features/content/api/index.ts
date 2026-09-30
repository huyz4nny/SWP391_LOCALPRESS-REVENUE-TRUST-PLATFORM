import type {
    CategoryOption,
    CreateArticleDraftRequest,
    ArticleDraftResponse,
    ArticleDraftDetailResponse,
    UpdateArticleMetadataRequest,
} from '../types'

interface CsrfResponse {
    headerName: string
    token: string
}

async function requestJson<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')

    const response = await fetch(`/api/v1${path}`, {
        ...options,
        headers,
        credentials: 'same-origin',
    })

    if (response.status === 401) {
        throw new Error('Bạn cần đăng nhập tài khoản backend')
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (!contentType.includes('application/json')) {
        throw new Error(
            'Backend không trả JSON. Hãy kiểm tra đăng nhập và đường dẫn API.',
        )
    }

    const data = await response.json()

    if (!response.ok) {
        throw new Error(
            data.message || `Yêu cầu thất bại: HTTP ${response.status}`,
        )
    }

    return data as T
}

export const contentApi = {
    getCategories(): Promise<CategoryOption[]> {
        return requestJson<CategoryOption[]>('/categories')
    },

    getDraft(id: string): Promise<ArticleDraftDetailResponse> {
        return requestJson<ArticleDraftDetailResponse>(
            `/articles/${encodeURIComponent(id)}`,
        )
    },

    async createDraft(
        request: CreateArticleDraftRequest,
    ): Promise<ArticleDraftResponse> {
        const csrf = await requestJson<CsrfResponse>('/security/csrf')

        return requestJson<ArticleDraftResponse>('/articles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [csrf.headerName]: csrf.token,
            },
            body: JSON.stringify(request),
        })
    },

    async updateMetadata(
        id: string,
        request: UpdateArticleMetadataRequest,
    ): Promise<ArticleDraftDetailResponse> {
        const csrf = await requestJson<CsrfResponse>('/security/csrf')

        return requestJson<ArticleDraftDetailResponse>(
            `/articles/${encodeURIComponent(id)}/metadata`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    [csrf.headerName]: csrf.token,
                },
                body: JSON.stringify(request),
            },
        )
    },
}