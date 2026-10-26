import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'

export function logout(): void {
    httpClient.clearBasicAuth()
    mockStore.setCurrentUser('user-guest')
}

/** Real API mode: a remembered user without credentials (new tab, closed session) is shown as Guest. */
export function syncAuthSession(): void {
    if (!APP_CONFIG.useMockApi && !httpClient.hasAuth() && mockStore.getCurrentUser().id !== 'user-guest') {
        mockStore.setCurrentUser('user-guest')
    }
}
