import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { APP_CONFIG } from '../app/config'
import { httpClient } from '../lib/http/client'
import { advertisingApi } from '../features/advertising/api'
import { handleMockRequest } from '../mocks/handlers'

const originalMock = APP_CONFIG.useMockApi
const fetchMock = vi.fn()
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  APP_CONFIG.useMockApi = false
  httpClient.setUseMock(false)
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  APP_CONFIG.useMockApi = originalMock
  httpClient.setUseMock(originalMock)
  vi.unstubAllGlobals()
})
it('sends the selected performance period and campaign to the backend', async () => {
  fetchMock.mockResolvedValueOnce(json([]))
  await advertisingApi.getPerformance({ from: '2026-11-01', to: '2026-11-03', campaignId: '7' })
  const url = new URL(fetchMock.mock.calls[0][0])
  expect(url.pathname).toBe('/api/v1/advertiser/performance')
  expect(Object.fromEntries(url.searchParams)).toEqual({ from: '2026-11-01', to: '2026-11-03', campaignId: '7' })
})
it('treats a missing contracts feature as unavailable and preserves access errors', async () => {
  fetchMock.mockResolvedValueOnce(json({ message: 'Not found' }, 404))
  expect(await advertisingApi.getMyContracts()).toEqual({ available: false, items: [] })
  fetchMock.mockResolvedValueOnce(json({ message: 'Forbidden' }, 403))
  await expect(advertisingApi.getMyContracts()).rejects.toMatchObject({ status: 403 })
})
it('sends cancellation acknowledgement and no browser-supplied refund amount', async () => {
  fetchMock.mockResolvedValueOnce(json({ id: '1' }))
  await advertisingApi.cancelCampaign('7', 'Đổi kế hoạch')
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ reason: 'Đổi kế hoạch', acknowledged: true })
})
it('routes nested mock endpoints before generic campaign detail', async () => {
  expect(await handleMockRequest('GET', '/advertiser/campaigns/7/cancellation-quote')).toMatchObject({ allowed: false })
  await expect(handleMockRequest('GET', '/advertiser/campaigns/7/acceptance')).rejects.toThrow('nghiệm thu')
})
