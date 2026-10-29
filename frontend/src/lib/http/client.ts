import {APP_CONFIG} from '@/app/config'
import {AppApiError} from './errors'
import {handleMockRequest} from '@/mocks/handlers'

interface RequestOptions {
    headers?: Record<string, string>
    params?: Record<string, string | number | boolean | undefined>
    skipAuth?: boolean
    credentials?: RequestCredentials
}

const AUTH_STORAGE_KEY = 'localpress_basic_auth'

function readStoredAuth(): string {
    try {
        return window.sessionStorage.getItem(AUTH_STORAGE_KEY) ?? ''
    } catch {
        return ''
    }
}

function writeStoredAuth(value: string) {
    try {
        if (value) window.sessionStorage.setItem(AUTH_STORAGE_KEY, value)
        else window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    } catch {
        // storage unavailable: login only lasts until reload
    }
}

class HttpClient {
    private baseUrl: string
    private useMock: boolean
    // Preserve main's Basic session across reloads; Google Bearer remains in memory.
    private basicAuth = readStoredAuth()
    private bearerToken = ''

    constructor() {
        this.baseUrl = APP_CONFIG.apiBaseUrl
        this.useMock = APP_CONFIG.useMockApi
    }

    public setUseMock(use: boolean) {
        this.useMock = use
    }

    public setBasicAuth(email: string, password: string) {
        this.bearerToken = ''
        this.basicAuth = `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(`${email}:${password}`)))}`
        writeStoredAuth(this.basicAuth)
    }

    public clearBasicAuth() {
        this.basicAuth = ''
        this.bearerToken = ''
        writeStoredAuth('')
    }

    public setBearerToken(token: string) {
        this.basicAuth = ''
        writeStoredAuth('')
        this.bearerToken = token
    }

    public hasAuth() {
        return Boolean(this.basicAuth || this.bearerToken)
    }

    public hasBasicAuth() {
        return Boolean(this.basicAuth)
    }

  private headers(options?: RequestOptions) {
    return {
      'Content-Type': 'application/json',
      ...(!options?.skipAuth && this.hasAuth()
          ? { Authorization: this.bearerToken ? `Bearer ${this.bearerToken}` : this.basicAuth }
          : {}),
      ...options?.headers,
    }
  }

    private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
        const url = new URL(path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`)
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value))
                }
            })
        }
        return url.toString()
    }

    public async get<T>(path: string, options?: RequestOptions): Promise<T> {
        const url = this.buildUrl(path, options?.params)

        if (this.useMock) {
            return handleMockRequest('GET', url)
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers(options),
            credentials: options?.credentials,
        })

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))
            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Lỗi kết nối máy chủ backend',
                path,
                fieldErrors: errorJson.fieldErrors,
            })
        }

        return response.json()
    }

    public async getBlob(path: string, options?: RequestOptions,): Promise<Blob> {
        if (this.useMock) {
            throw new Error('Tải ảnh bản nháp cần dùng API thật')
        }

        if (!this.hasAuth()) {
            throw new Error('Bạn cần đăng nhập trước khi tải ảnh')
        }

        const url = this.buildUrl(path, options?.params)

        const headers = new Headers(this.headers(options))
        headers.delete('Content-Type')
        headers.set('Accept', 'image/png')

        const response = await fetch(url, {method: 'GET', headers,})

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))

            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Không tải được ảnh bản nháp',
                path,
            })
        }

        const contentType = response.headers.get('Content-Type') ?? ''
        if (!contentType.toLowerCase().startsWith('image/png')) {
            throw new Error('Backend không trả về ảnh PNG')
        }

        return response.blob()
    }

    public async post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
        const url = this.buildUrl(path, options?.params)

        if (this.useMock) {
            return handleMockRequest('POST', url, body)
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers(options),
            credentials: options?.credentials,
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))
            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Lỗi gửi dữ liệu lên máy chủ',
                path,
                fieldErrors: errorJson.fieldErrors,
            })
        }

        return response.json()
    }

    public async patch<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
        const url = this.buildUrl(path, options?.params)

        if (this.useMock) {
            return handleMockRequest('PATCH', url, body)
        }

        const response = await fetch(url, {
            method: 'PATCH',
            headers: this.headers(options),
            credentials: options?.credentials,
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))
            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Lỗi gửi dữ liệu lên máy chủ',
                path,
                fieldErrors: errorJson.fieldErrors,
            })
        }

        return response.json()
    }

    public async put<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
        const url = this.buildUrl(path, options?.params)

        if (this.useMock) {
            return handleMockRequest('PUT', url, body)
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: this.headers(options),
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))
            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Lỗi cập nhật dữ liệu',
                path,
                fieldErrors: errorJson.fieldErrors,
            })
        }

        return response.json()
    }

    public async postFormData<T>(path: string, body: FormData, options?: RequestOptions): Promise<T> {
        return this.sendFormData<T>('POST', path, body, options)
    }

    public async putFormData<T>(path: string, body: FormData, options?: RequestOptions): Promise<T> {
        return this.sendFormData<T>('PUT', path, body, options)
    }

    private async sendFormData<T>(
        method: 'POST' | 'PUT', path: string, body: FormData, options?: RequestOptions,
    ): Promise<T> {
        if (this.useMock) {
            throw new Error('Upload ảnh cần dùng API thật')
        }

        if (!this.hasAuth()) {
            throw new Error('Bạn cần đăng nhập trước khi upload ảnh')
        }

        const url = this.buildUrl(path, options?.params)

        const headers = new Headers(this.headers(options))
        headers.delete('Content-Type')
        headers.set('Accept', 'application/json')

        const response = await fetch(url, {
            method,
            headers,
            body,
        })

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))

            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Không upload được ảnh',
                path,
                fieldErrors: errorJson.fieldErrors,
            })
        }

        return response.json()
    }

    public async delete<T>(path: string, options?: RequestOptions): Promise<T> {
        const url = this.buildUrl(path, options?.params)

        if (this.useMock) {
            return handleMockRequest('DELETE', url)
        }

        const response = await fetch(url, {
            method: 'DELETE',
            headers: this.headers(options),
        })

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))
            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Lỗi xóa dữ liệu',
                path,
            })
        }

        return response.json()
    }
}

export const httpClient = new HttpClient()
