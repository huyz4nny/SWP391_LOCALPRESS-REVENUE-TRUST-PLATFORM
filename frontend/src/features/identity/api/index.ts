import { httpClient } from '@/lib/http/client'
import { User } from '@/types'

export interface AuthMeResponse extends User {
  companyId?: string
  companyName?: string
}

export const authApi = {
  getMe: () => httpClient.get<AuthMeResponse>('/auth/me'),

  getGoogleNonce: () => httpClient.get<{ nonce: string }>('/auth/google/nonce', {
    skipAuth: true, credentials: 'include',
  }),

  googleLogin: (idToken: string) => httpClient.post<LoginResponse>(
    '/auth/google', { idToken }, { skipAuth: true, credentials: 'include' },
  ),

  register: (request: RegisterReaderRequest) =>
      httpClient.post<RegisterReaderResponse>(
          '/auth/register',
          request,
          { skipAuth: true },
      ),
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
