import { authApi } from './api'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'
import { cancelLogin } from './authSession'

export async function loginWithGoogle(idToken: string) {
  httpClient.beginLogin()
  try {
    const session = await authApi.googleLogin(idToken)
    httpClient.setBearerToken(session.accessToken)
    const user = await authApi.getMe()
    mockStore.setRealUser({ ...user, createdAt: new Date().toISOString() })
    httpClient.shareLoginWithOtherTabs()
    return user
  } catch (error) {
    cancelLogin()
    throw error
  }
}
