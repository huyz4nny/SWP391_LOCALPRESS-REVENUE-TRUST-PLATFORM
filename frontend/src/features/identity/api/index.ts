import { httpClient } from '@/lib/http/client'
import { User } from '@/types'

export interface AuthMeResponse extends User {
  companyId?: string
  companyName?: string
}

export const authApi = {
  getMe: () => httpClient.get<AuthMeResponse>('/auth/me'),

  register: (request: RegisterReaderRequest) =>
      httpClient.post<RegisterReaderResponse>(
          '/auth/register',
          request,
          { skipAuth: true },
      ),
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
