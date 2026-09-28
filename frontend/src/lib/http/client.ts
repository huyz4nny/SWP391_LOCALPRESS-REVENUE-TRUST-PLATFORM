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

  constructor() {
    this.baseUrl = APP_CONFIG.apiBaseUrl
    this.useMock = APP_CONFIG.useMockApi
  }

  public setUseMock(use: boolean) {
    this.useMock = use
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
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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

  public async post<T>(path: string, body?: any, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)

    if (this.useMock) {
      return handleMockRequest('POST', url, body)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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

  public async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)

    if (this.useMock) {
      return handleMockRequest('DELETE', url)
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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
