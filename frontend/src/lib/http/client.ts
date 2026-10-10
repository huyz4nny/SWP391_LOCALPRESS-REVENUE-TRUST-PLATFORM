import { APP_CONFIG } from '@/app/config'
import { AppApiError } from './errors'
import { handleMockRequest } from '@/mocks/handlers'

interface RequestOptions {
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
}

class HttpClient {
  private baseUrl: string
  private useMock: boolean
  // ponytail: credentials last only until page reload; use the shared identity session when it is available.
  private basicAuth = ''

  constructor() {
    this.baseUrl = APP_CONFIG.apiBaseUrl
    this.useMock = APP_CONFIG.useMockApi
  }

  public setUseMock(use: boolean) {
    this.useMock = use
  }

  public setBasicAuth(email: string, password: string) {
    this.basicAuth = `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(`${email}:${password}`)))}`
  }

  public clearBasicAuth() {
    this.basicAuth = ''
  }

  public hasBasicAuth() {
    return Boolean(this.basicAuth)
  }

  private headers(options?: RequestOptions) {
    const authHeader = this.basicAuth || `Basic ${btoa('ketoan@localpress.vn:password123')}`
    return {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
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

  public async getBlob(path: string,options?: RequestOptions,): Promise<Blob>{
    if(this.useMock){
      throw new Error('Tải ảnh bản nháp cần dùng API thật')
    }

    if(!this.hasBasicAuth()){
      throw new Error('Bạn cần đăng nhập trước khi tải ảnh')
    }

    const url = this.buildUrl(path, options?.params)

    const headers = new Headers(this.headers(options))
    headers.delete('Content-Type')
    headers.set('Accept', 'image/png')

    const response = await fetch(url, {method: 'GET', headers,})

    if(!response.ok){
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
    if(!contentType.toLowerCase().startsWith('image/png')){
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

  public async putFormData<T>(
      path: string,
      body: FormData,
      options?: RequestOptions,
  ): Promise<T> {
    if (this.useMock) {
      throw new Error('Upload ảnh cần dùng API thật')
    }

    if (!this.hasBasicAuth()) {
      throw new Error('Bạn cần đăng nhập trước khi upload ảnh')
    }

    const url = this.buildUrl(path, options?.params)

    const headers = new Headers(this.headers(options))
    headers.delete('Content-Type')
    headers.set('Accept', 'application/json')

    const response = await fetch(url, {
      method: 'PUT',
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
