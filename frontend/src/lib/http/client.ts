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

// Tabs of the same origin share the login through this channel: a new tab asks the open ones,
// login and logout are announced. Nothing goes to localStorage, so closing every tab ends the session.
const AUTH_CHANNEL = 'localpress-auth'

type AuthMessage =
    | { type: 'request' }
    | { type: 'share'; basicAuth: string; bearerToken: string }
    | { type: 'login'; basicAuth: string; bearerToken: string }
    | { type: 'logout' }

function openAuthChannel(): BroadcastChannel | null {
    try {
        return window.BroadcastChannel ? new window.BroadcastChannel(AUTH_CHANNEL) : null
    } catch {
        return null
    }
}

class HttpClient {
    private baseUrl: string
    private useMock: boolean
    // Preserve main's Basic session across reloads; Google Bearer remains in memory.
    private basicAuth = readStoredAuth()
    private bearerToken = ''
    private channel = openAuthChannel()
    // Set while a login is being checked: the login this tab had before (empty strings if none)
    private confirmedAuth: { basicAuth: string; bearerToken: string } | null = null

    constructor() {
        this.baseUrl = APP_CONFIG.apiBaseUrl
        this.useMock = APP_CONFIG.useMockApi
        this.channel?.addEventListener('message', (event: MessageEvent<AuthMessage>) => this.onAuthMessage(event.data))
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

    /** Call before trying new credentials: until the backend accepts them, other tabs keep seeing the previous login. */
    public beginLogin() {
        this.confirmedAuth = { basicAuth: this.basicAuth, bearerToken: this.bearerToken }
    }

    /** Failed login: only this tab goes back to its previous login (or none); other tabs are not touched. */
    public cancelLogin(): boolean {
        const previous = this.confirmedAuth
        this.confirmedAuth = null
        if (previous) this.adoptAuth(previous.basicAuth, previous.bearerToken)
        else this.clearBasicAuth()
        return this.hasAuth()
    }

    /** Call after the backend accepted the login, so other open tabs switch to the same account. */
    public shareLoginWithOtherTabs() {
        this.confirmedAuth = null
        if (this.hasAuth()) this.broadcast({ type: 'login', basicAuth: this.basicAuth, bearerToken: this.bearerToken })
    }

    /** Logs out this tab and every other open tab. */
    public logoutAllTabs() {
        this.confirmedAuth = null
        this.clearBasicAuth()
        this.broadcast({ type: 'logout' })
    }

    /** A tab opened without auth borrows it from an open tab; resolves false if none answers in time. */
    public requestAuthFromOtherTabs(timeoutMs = 300): Promise<boolean> {
        const channel = this.channel
        if (this.hasAuth() || !channel) return Promise.resolve(this.hasAuth())
        return new Promise((resolve) => {
            const finish = (found: boolean) => {
                clearTimeout(timer)
                channel.removeEventListener('message', onMessage)
                resolve(found)
            }
            const onMessage = (event: MessageEvent<AuthMessage>) => {
                if (event.data?.type !== 'share') return
                this.adoptAuth(event.data.basicAuth, event.data.bearerToken)
                finish(this.hasAuth())
            }
            const timer = setTimeout(() => finish(false), timeoutMs)
            channel.addEventListener('message', onMessage)
            this.broadcast({ type: 'request' })
        })
    }

    private onAuthMessage(message: AuthMessage) {
        if (message?.type === 'request') {
            // Never hand out credentials that are still being checked
            const shared = this.confirmedAuth ?? { basicAuth: this.basicAuth, bearerToken: this.bearerToken }
            if (shared.basicAuth || shared.bearerToken) this.broadcast({ type: 'share', ...shared })
        } else if (message?.type === 'login') {
            if (this.confirmedAuth) {
                // this tab is mid-login: the other tab's account becomes the one to fall back to
                this.confirmedAuth = { basicAuth: message.basicAuth, bearerToken: message.bearerToken }
                return
            }
            if (message.basicAuth === this.basicAuth && message.bearerToken === this.bearerToken) return
            this.adoptAuth(message.basicAuth, message.bearerToken)
        } else if (message?.type === 'logout') {
            this.confirmedAuth = null
            this.clearBasicAuth()
        }
    }

    private adoptAuth(basicAuth: string, bearerToken: string) {
        this.basicAuth = basicAuth
        this.bearerToken = bearerToken
        writeStoredAuth(basicAuth)
    }

    private broadcast(message: AuthMessage) {
        try {
            this.channel?.postMessage(message)
        } catch {
            // channel closed: other tabs keep their own session
        }
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

    /** Tải file (CSV, PDF...) từ API thật; trả về blob + tên file trong Content-Disposition. Chế độ mock không hỗ trợ. */
    public async getFile(path: string, options?: RequestOptions): Promise<{ blob: Blob; filename: string }> {
        if (this.useMock) {
            throw new Error('Tải file cần dùng API thật')
        }
        const url = this.buildUrl(path, options?.params)
        const headers = new Headers(this.headers(options))
        headers.delete('Content-Type')
        const response = await fetch(url, { method: 'GET', headers })
        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}))
            throw new AppApiError({
                timestamp: new Date().toISOString(),
                status: response.status,
                error: response.statusText,
                message: errorJson.message || 'Không tải được file',
                path,
            })
        }
        const disposition = response.headers.get('Content-Disposition') ?? ''
        const match = /filename="?([^";]+)"?/i.exec(disposition)
        return { blob: await response.blob(), filename: match?.[1] ?? 'download' }
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

        if (response.status === 204) {
            return undefined as T
        }
        const text = await response.text()
        if (!text) {
            return undefined as T
        }
        return JSON.parse(text) as T
    }
}

export const httpClient = new HttpClient()
