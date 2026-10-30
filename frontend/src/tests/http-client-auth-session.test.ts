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

it('switching to Google cannot restore the previous Basic account on reload', async () => {
  const first = await client()
  first.setBasicAuth('previous@example.test', 'test-password')
  first.setBearerToken('google-login-local-jwt')
  expect(first.hasBasicAuth()).toBe(false)
  expect(storedAuth.get('localpress_basic_auth')).toBeUndefined()
  await first.get('/auth/me')
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer google-login-local-jwt')
  vi.resetModules()
  const reloaded = await client()
  expect(reloaded.hasAuth()).toBe(false)
  await reloaded.get('/auth/me')
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined()
})

it('logout clears persisted Basic auth and in-memory Bearer auth', async () => {
  const current = await client()
  const { logout } = await import('../features/identity/authSession')
  current.setBasicAuth('reader@example.test', 'test-password')
  logout()
  expect(storedAuth.size).toBe(0)
  expect(current.hasAuth()).toBe(false)
  current.setBearerToken('local-jwt')
  logout()
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
