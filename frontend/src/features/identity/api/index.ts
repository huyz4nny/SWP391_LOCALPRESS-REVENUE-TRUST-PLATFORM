// Tác dụng: client auth — /auth/me, login, register, Google nonce. Dùng chung, không thuộc advertising/finance.
import { httpClient } from '@/lib/http/client'
import { User } from '@/types'

export interface AuthMeResponse extends User {
  companyId?: string
  companyName?: string
}

export const authApi = {
  getMe: () => httpClient.get<AuthMeResponse>('/auth/me'),

  updateMe: (body: { fullName: string; phone?: string }) =>
    httpClient.patch<AuthMeResponse>('/auth/me', body),

  getGoogleNonce: () => httpClient.get<{ nonce: string }>('/auth/google/nonce', {
    skipAuth: true, credentials: 'include',
  }),

  login: (request: PasswordLoginRequest) => httpClient.post<LoginResponse>(
    '/auth/login', request, { skipAuth: true },
  ),

  googleLogin: (idToken: string, device?: { deviceName?: string; deviceType?: string }) => httpClient.post<LoginResponse>(
    '/auth/google', { idToken, ...device }, { skipAuth: true, credentials: 'include' },
  ),

  register: (request: RegisterReaderRequest) =>
      httpClient.post<RegisterReaderResponse>(
          '/auth/register',
          request,
          { skipAuth: true },
      ),
}

export interface PasswordLoginRequest {
  email: string
  password: string
  deviceName?: string
  deviceType?: string
}

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export interface RegisterReaderRequest {
  fullName: string
  email: string
  password: string
  phone?: string
}

export interface RegisterReaderResponse {
  id: string
  email: string
  role: 'READER'
  status: 'ACTIVE' | 'LOCKED'
}
