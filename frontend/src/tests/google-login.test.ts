import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { authApi } from '../features/identity/api'
import { loginWithGoogle } from '../features/identity/googleAuthSession'
import { logout } from '../features/identity/authSession'
import { httpClient } from '../lib/http/client'
import { mockStore } from '../mocks/store'

const fetchMock = vi.fn()
const user = { id: '42', name: 'Google Reader', email: 'reader@gmail.com', role: 'READER', isActive: true }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

beforeEach(() => {
  httpClient.setUseMock(false)
  httpClient.clearBasicAuth()
  mockStore.resetToDefaults()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { httpClient.clearBasicAuth(); vi.unstubAllGlobals() })

it('fetches a browser-bound nonce without sending existing credentials', async () => {
  httpClient.setBasicAuth('reader@gmail.com', 'password')
  fetchMock.mockResolvedValueOnce(json({ nonce: 'one-time-nonce' }))
  await authApi.getGoogleNonce()
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/auth\/google\/nonce$/)
  expect(options.headers.Authorization).toBeUndefined()
  expect(options.credentials).toBe('include')
})

it('exchanges Google credential then uses LocalPress Bearer for me', async () => {
  fetchMock.mockResolvedValueOnce(json({ accessToken: 'local-jwt', tokenType: 'Bearer', expiresIn: 3600 }))
    .mockResolvedValueOnce(json(user))
  expect((await loginWithGoogle('google-id-token')).id).toBe('42')
  const [url, exchange] = fetchMock.mock.calls[0]
  expect(url).toMatch(/\/auth\/google$/)
  expect(JSON.parse(exchange.body)).toEqual({ idToken: 'google-id-token' })
  expect(exchange.credentials).toBe('include')
  expect(exchange.headers.Authorization).toBeUndefined()
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer local-jwt')
  expect(mockStore.getCurrentUser().id).toBe('42')
})

it('clears credentials and user when Google rejects the exchange', async () => {
  httpClient.setBasicAuth('reader@gmail.com', 'password')
  fetchMock.mockResolvedValueOnce(json({ message: 'Email đã tồn tại' }, 409))
  await expect(loginWithGoogle('bad-token')).rejects.toThrow('Email đã tồn tại')
  expect(httpClient.hasAuth()).toBe(false)
  expect(mockStore.getCurrentUser().role).toBe('GUEST')
})

it('rolls back login when me fails after token exchange', async () => {
  fetchMock.mockResolvedValueOnce(json({ accessToken: 'local-jwt', tokenType: 'Bearer', expiresIn: 3600 }))
    .mockResolvedValueOnce(json({ message: 'Locked' }, 403))
  await expect(loginWithGoogle('google-token')).rejects.toThrow()
  expect(httpClient.hasAuth()).toBe(false)
  expect(mockStore.getCurrentUser().role).toBe('GUEST')
})

it('logout removes Bearer and switching back to Basic removes Bearer', async () => {
  httpClient.setBearerToken('local-jwt')
  logout()
  expect(httpClient.hasAuth()).toBe(false)
  httpClient.setBearerToken('local-jwt')
  httpClient.setBasicAuth('reader@gmail.com', 'password')
  fetchMock.mockResolvedValueOnce(json(user))
  await authApi.getMe()
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toMatch(/^Basic /)
})

it('uses Bearer for private images and uploads without forcing Basic Auth', async () => {
  httpClient.setBearerToken('local-jwt')
  fetchMock.mockResolvedValueOnce(new Response('png', { headers: { 'Content-Type': 'image/png' } }))
    .mockResolvedValueOnce(json({}))
  await httpClient.getBlob('/content/images/test.png')
  await httpClient.putFormData('/articles/42/cover-image', new FormData())
  for (const [, options] of fetchMock.mock.calls) {
    expect(options.headers.get('Authorization')).toBe('Bearer local-jwt')
    expect(options.headers.has('Content-Type')).toBe(false)
  }
})
