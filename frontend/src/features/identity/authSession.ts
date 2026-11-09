// Tác dụng: logout + đồng bộ phiên — xóa basic auth, đưa mock user về Guest khi không còn token.
import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'

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
    if (APP_CONFIG.useMockApi || httpClient.hasAuth()) return
    if (await httpClient.requestAuthFromOtherTabs()) return
    if (mockStore.getCurrentUser().id !== 'user-guest') {
        mockStore.setCurrentUser('user-guest')
    }
}
