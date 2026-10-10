import { httpClient } from '@/lib/http/client'
import { User } from '@/types'

export interface AuthMeResponse extends User {
  companyId?: string
  companyName?: string
}

export const authApi = {
  getMe: () => httpClient.get<AuthMeResponse>('/auth/me'),
}
