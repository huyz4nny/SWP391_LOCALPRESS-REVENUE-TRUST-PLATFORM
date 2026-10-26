import { authApi } from './api'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'

export async function loginWithGoogle(idToken: string) {
  try {
    const session = await authApi.googleLogin(idToken)
    httpClient.setBearerToken(session.accessToken)
    const user = await authApi.getMe()
    mockStore.setRealUser({ ...user, createdAt: new Date().toISOString() })
    return user
  } catch (error) {
    httpClient.clearBasicAuth()
    mockStore.setCurrentUser('user-guest')
    throw error
  }
}
