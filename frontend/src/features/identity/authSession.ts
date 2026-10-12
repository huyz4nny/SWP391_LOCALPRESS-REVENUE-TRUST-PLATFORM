import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'

export function logout(): void {
    httpClient.clearBasicAuth()
    mockStore.setCurrentUser('user-guest')
}