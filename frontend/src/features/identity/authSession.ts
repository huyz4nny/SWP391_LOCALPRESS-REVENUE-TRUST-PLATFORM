// Tác dụng: logout + đồng bộ phiên — xóa basic auth, đưa mock user về Guest khi không còn token.
import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'
import { authApi, type AuthMeResponse } from './api'

export function logout(): Promise<void> {
    const finish = () => {
        httpClient.logoutAllTabs()
        mockStore.setCurrentUser('user-guest')
    }
    // Token phải còn khi gọi, server mới đọc được sid và thu hồi user_devices.
    // API lỗi hoặc không có mạng thì vẫn xóa token trên trình duyệt.
    if (APP_CONFIG.useMockApi || !httpClient.hasAuth()) {
        finish()
        return Promise.resolve()
    }
    return httpClient.post<void>('/auth/logout', {}).catch(() => undefined).finally(finish).then(() => undefined)
}

/** Failed login: this tab goes back to the login it had before; other tabs are not logged out. */
export function cancelLogin(): void {
    if (!httpClient.cancelLogin()) mockStore.setCurrentUser('user-guest')
}

/** Xóa phiên của 1 token cụ thể trên server. Lỗi thì bỏ qua: phiên vẫn tự hết hạn. */
function revokeSession(token: string): void {
    httpClient
        .post<void>('/auth/logout', {}, { skipAuth: true, headers: { Authorization: `Bearer ${token}` } })
        .catch(() => undefined)
}

/**
 * Luồng chung cho đăng nhập mật khẩu và Google (API thật).
 * Mỗi lần đăng nhập server tạo 1 phiên trong user_devices (tối đa 2), nên:
 * - đăng nhập lại khi tab đã có phiên: xóa phiên cũ sau khi phiên mới được nhận;
 * - đã có token mới nhưng bước sau lỗi: xóa luôn phiên mới, không để phiên mồ côi giữ chỗ.
 */
export async function signIn(requestSession: () => Promise<{ accessToken: string }>): Promise<AuthMeResponse> {
    const previousBearer = httpClient.currentBearerToken()
    httpClient.beginLogin()
    let issued = ''
    try {
        issued = (await requestSession()).accessToken
        httpClient.setBearerToken(issued)
        const user = await authApi.getMe()
        mockStore.setRealUser({ ...user, createdAt: new Date().toISOString() })
        httpClient.shareLoginWithOtherTabs()
        if (previousBearer && previousBearer !== issued) revokeSession(previousBearer)
        return user
    } catch (error) {
        if (issued) revokeSession(issued)
        cancelLogin()
        throw error
    }
}

/**
 * Real API mode: a tab without credentials first borrows them from another open tab;
 * if none is logged in, the remembered user is shown as Guest.
 */
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('localpress-bearer-rejected', () => {
        mockStore.setCurrentUser('user-guest')
    })
}

export async function syncAuthSession(): Promise<void> {
    if (APP_CONFIG.useMockApi) return
    if (httpClient.hasAuth() || await httpClient.requestAuthFromOtherTabs()) {
        await refreshCurrentUser()
        return
    }
    if (mockStore.getCurrentUser().id !== 'user-guest') {
        mockStore.setCurrentUser('user-guest')
    }
}

/**
 * Hồ sơ người dùng (role, tên) được lưu trong localStorage lúc đăng nhập. Mỗi lần mở app hỏi lại /auth/me,
 * để đổi role hoặc tên trên server (vd. Kế toán trưởng chuyển từ SYSTEM_ADMIN sang CHIEF_ACCOUNTANT)
 * có hiệu lực ngay, không phải đăng nhập lại. Lỗi thì giữ bản đã lưu; 401 đã được client chuyển về Khách.
 */
async function refreshCurrentUser(): Promise<void> {
    try {
        const user = await authApi.getMe()
        if (!user?.id || !user.role) return
        const cached = mockStore.getCurrentUser()
        const createdAt = cached.id === user.id && cached.createdAt ? cached.createdAt : new Date().toISOString()
        mockStore.setRealUser({ ...user, createdAt })
    } catch {
        // mất mạng hoặc backend chưa chạy: dùng tạm hồ sơ đã lưu
    }
}
