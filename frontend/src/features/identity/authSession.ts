import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'

export function logout(): void {
    httpClient.logoutAllTabs()
    mockStore.setCurrentUser('user-guest')
}

/** Failed login: this tab goes back to the login it had before; other tabs are not logged out. */
export function cancelLogin(): void {
    if (!httpClient.cancelLogin()) mockStore.setCurrentUser('user-guest')
}

/**
 * Real API mode: a tab without credentials first borrows them from another open tab;
 * if none is logged in, the remembered user is shown as Guest.
 */
export async function syncAuthSession(): Promise<void> {
    if (APP_CONFIG.useMockApi || httpClient.hasAuth()) return
    if (await httpClient.requestAuthFromOtherTabs()) return
    if (mockStore.getCurrentUser().id !== 'user-guest') {
        mockStore.setCurrentUser('user-guest')
    }
}
