import { afterEach, beforeEach, expect, it, vi } from 'vitest'

let storedAuth: Map<string, string>
const fetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  storedAuth = new Map()
  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (key: string) => storedAuth.get(key) ?? null,
      setItem: (key: string, value: string) => { storedAuth.set(key, value) },
      removeItem: (key: string) => { storedAuth.delete(key) },
    },
  })
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response('{}', {
    headers: { 'Content-Type': 'application/json' },
  }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => { vi.unstubAllGlobals() })

async function client() {
  const { httpClient } = await import('../lib/http/client')
  httpClient.setUseMock(false)
  return httpClient
}

it('restores main Basic authentication after a same-tab reload', async () => {
  const first = await client()
  first.setBasicAuth('reader@example.test', 'test-password')
  await first.get('/auth/me')
  const authorization = fetchMock.mock.calls[0][1].headers.Authorization
  vi.resetModules()
  const reloaded = await client()
  expect(reloaded.hasAuth()).toBe(true)
  await reloaded.get('/auth/me')
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(authorization)
})

it('keeps the Bearer session across a same-tab reload and drops the previous Basic header', async () => {
  const first = await client()
  first.setBasicAuth('previous@example.test', 'test-password')
  first.setBearerToken('google-login-local-jwt')
  expect(first.hasBasicAuth()).toBe(false)
  expect(storedAuth.get('localpress_basic_auth')).toBeUndefined()
  expect(storedAuth.get('localpress_bearer_token')).toBe('google-login-local-jwt')
  await first.get('/auth/me')
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer google-login-local-jwt')
  vi.resetModules()
  const reloaded = await client()
  expect(reloaded.hasAuth()).toBe(true)
  await reloaded.get('/auth/me')
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer google-login-local-jwt')
})

it('logout asks the server to revoke the session before clearing the token', async () => {
  const current = await client()
  const { APP_CONFIG } = await import('../app/config')
  const { logout } = await import('../features/identity/authSession')
  APP_CONFIG.useMockApi = false
  current.setBearerToken('local-jwt')
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
  logout()
  await vi.waitFor(() => expect(current.hasAuth()).toBe(false))
  expect(String(fetchMock.mock.calls[0][0])).toContain('/auth/logout')
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer local-jwt')
  APP_CONFIG.useMockApi = true
})

it('logout still clears the token when the revoke request fails', async () => {
  const current = await client()
  const { APP_CONFIG } = await import('../app/config')
  const { logout } = await import('../features/identity/authSession')
  APP_CONFIG.useMockApi = false
  current.setBearerToken('local-jwt')
  fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } }))
  logout()
  await vi.waitFor(() => expect(current.hasAuth()).toBe(false))
  APP_CONFIG.useMockApi = true
})

it('logout clears persisted Basic auth and in-memory Bearer auth', async () => {
  const current = await client()
  const { logout } = await import('../features/identity/authSession')
  current.setBasicAuth('reader@example.test', 'test-password')
  await logout()
  expect(storedAuth.size).toBe(0)
  expect(current.hasAuth()).toBe(false)
  current.setBearerToken('local-jwt')
  await logout()
  expect(current.hasAuth()).toBe(false)
  vi.resetModules()
  expect((await client()).hasAuth()).toBe(false)
})

it('auth synchronization keeps a Google user with an active Bearer token', async () => {
  const current = await client()
  const { APP_CONFIG } = await import('../app/config')
  const { mockStore } = await import('../mocks/store')
  const { syncAuthSession } = await import('../features/identity/authSession')
  APP_CONFIG.useMockApi = false
  mockStore.setCurrentUser('user-reader-premium')
  current.setBearerToken('local-jwt')
  await syncAuthSession()
  expect(mockStore.getCurrentUser().id).toBe('user-reader-premium')
  current.clearBasicAuth()
  await syncAuthSession()
  expect(mockStore.getCurrentUser().id).toBe('user-guest')
})

it('auth synchronization refreshes the cached role and name from /auth/me', async () => {
  const current = await client()
  const { APP_CONFIG } = await import('../app/config')
  const { mockStore } = await import('../mocks/store')
  const { syncAuthSession } = await import('../features/identity/authSession')
  APP_CONFIG.useMockApi = false
  mockStore.setRealUser({ id: '35', name: 'Tên cũ', email: 'chief@example.test', role: 'SYSTEM_ADMIN', isActive: true, createdAt: '2026-11-01T00:00:00.000Z' } as never)
  current.setBearerToken('local-jwt')
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(
    { id: '35', name: 'Trần Kế Toán Trưởng', email: 'chief@example.test', role: 'CHIEF_ACCOUNTANT', isActive: true }),
    { headers: { 'Content-Type': 'application/json' } }))
  await syncAuthSession()
  const user = mockStore.getCurrentUser()
  expect(user.role).toBe('CHIEF_ACCOUNTANT')
  expect(user.name).toBe('Trần Kế Toán Trưởng')
  expect(user.createdAt).toBe('2026-11-01T00:00:00.000Z')
})

it('storage failures allow memory-only authentication without throwing', async () => {
  vi.stubGlobal('window', {
    get sessionStorage() { throw new Error('Storage unavailable') },
  })
  const current = await client()
  expect(current.hasAuth()).toBe(false)
  expect(() => current.setBasicAuth('reader@example.test', 'test-password')).not.toThrow()
  expect(current.hasBasicAuth()).toBe(true)
  expect(() => current.setBearerToken('local-jwt')).not.toThrow()
  expect(current.hasAuth()).toBe(true)
  expect(() => current.clearBasicAuth()).not.toThrow()
  expect(current.hasAuth()).toBe(false)
})
