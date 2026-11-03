import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { APP_CONFIG } from '../app/config'
import { httpClient } from '../lib/http/client'
import { adminApi } from '../features/administration/api'
import { adDeliveryApi } from '../components/shared/adDeliveryApi'

const fetchMock = vi.fn()
const originalMock = APP_CONFIG.useMockApi
beforeEach(() => {
  APP_CONFIG.useMockApi = false
  httpClient.setUseMock(false)
  httpClient.setBearerToken('local-test-jwt')
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  APP_CONFIG.useMockApi = originalMock
  httpClient.setUseMock(originalMock)
  httpClient.clearBasicAuth()
  vi.unstubAllGlobals()
})
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

it('loads the protected admin users endpoint instead of the mock-only auth/users route', async () => {
  fetchMock.mockResolvedValueOnce(json([{ id: '1', role: 'SYSTEM_ADMIN' }]))
  const users = await adminApi.getUsers()
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/admin\/users$/)
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer local-test-jwt')
  expect(users[0].id).toBe('1')
})
it('does not fall back to fake admin users when real access is forbidden', async () => {
  fetchMock.mockResolvedValueOnce(json({ message: 'Forbidden' }, 403))
  await expect(adminApi.getUsers()).rejects.toMatchObject({ status: 403 })
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
it('loads real eligible banners and keeps authentication for ad-free decisions', async () => {
  fetchMock.mockResolvedValueOnce(json({ creative: null, hidden: true }))
  const offer = await adDeliveryApi.serve('SLOT-TOP-LEADERBOARD')
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/delivery\/ad-slots\/SLOT-TOP-LEADERBOARD\/serve$/)
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer local-test-jwt')
  expect(offer.hidden).toBe(true)
})
it('reports only the server-issued token instead of accepting client campaign counters', async () => {
  fetchMock.mockImplementation(async () => json({ recorded: true }))
  await adDeliveryApi.impression('issued-ticket')
  await adDeliveryApi.click('issued-ticket')
  for (const [, options] of fetchMock.mock.calls) {
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ token: 'issued-ticket' })
  }
})
