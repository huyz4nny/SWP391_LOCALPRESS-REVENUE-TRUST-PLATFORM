// Tác dụng: sau Google login — gọi /auth/google, lưu Bearer, gán user vào mockStore.
import { authApi } from './api'
import { signIn } from './authSession'
import { currentBrowserDevice } from './browserDevice'

export function loginWithGoogle(idToken: string) {
  return signIn(() => authApi.googleLogin(idToken, currentBrowserDevice()))
}
