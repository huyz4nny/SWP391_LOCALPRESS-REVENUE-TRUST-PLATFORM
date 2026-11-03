import { afterEach, beforeEach, expect, it, vi } from 'vitest'

// Each "tab" is a fresh httpClient module instance; BroadcastChannel is shared, like one browser.
type Client = Awaited<ReturnType<typeof openTab>>
const channels: BroadcastChannel[] = []
const fetchMock = vi.fn()

class TrackedChannel extends BroadcastChannel {
  constructor(name: string) {
    super(name)
    channels.push(this)
  }
}

async function openTab() {
  vi.resetModules()
  const { httpClient } = await import('../lib/http/client')
  httpClient.setUseMock(false)
  return httpClient
}

/** Authorization header the tab would send to the backend. */
async function authOf(tab: Client) {
  fetchMock.mockClear()
  await tab.get('/auth/me')
  return fetchMock.mock.calls[0][1].headers.Authorization as string | undefined
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30))

beforeEach(() => {
  const session = new Map<string, string>()
  vi.stubGlobal('window', {
    BroadcastChannel: TrackedChannel,
    sessionStorage: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => { session.set(key, value) },
      removeItem: (key: string) => { session.delete(key) },
    },
  })
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  channels.splice(0).forEach((channel) => channel.close())
  vi.unstubAllGlobals()
})

it('a new tab borrows the login of an open tab', async () => {
  const first = await openTab()
  first.setBasicAuth('ketoan@example.test', 'test-password')
  const second = await openTab()
  second.clearBasicAuth() // the stub shares one sessionStorage; a real new tab starts empty
  expect(second.hasAuth()).toBe(false)
  expect(await second.requestAuthFromOtherTabs()).toBe(true)
  expect(await authOf(second)).toBe(await authOf(first))
})

it('a new tab stays logged out when no tab is logged in', async () => {
  await openTab()
  const second = await openTab()
  expect(await second.requestAuthFromOtherTabs(50)).toBe(false)
})

it('logout in one tab logs out the others', async () => {
  const first = await openTab()
  first.setBasicAuth('ketoan@example.test', 'test-password')
  const second = await openTab()
  second.logoutAllTabs()
  await settle()
  expect(first.hasAuth()).toBe(false)
  expect(await authOf(first)).toBeUndefined()
})

it('only a confirmed login switches the other tabs to the new account', async () => {
  const first = await openTab()
  first.setBasicAuth('ketoan@example.test', 'test-password')
  const before = await authOf(first)
  const second = await openTab()
  second.setBasicAuth('reader@example.test', 'not-yet-checked')
  await settle()
  expect(await authOf(first)).toBe(before)
  second.shareLoginWithOtherTabs()
  await settle()
  expect(await authOf(first)).toBe(await authOf(second))
})

it('a failed login in one tab does not log out the other tabs', async () => {
  const first = await openTab()
  first.setBasicAuth('ketoan@example.test', 'test-password')
  const before = await authOf(first)
  const second = await openTab()
  second.beginLogin()
  second.setBasicAuth('ketoan@example.test', 'wrong-password')
  expect(second.cancelLogin()).toBe(true)
  await settle()
  expect(await authOf(first)).toBe(before)
  expect(await authOf(second)).toBe(before)
})

it('a tab mid-login does not hand out the credentials being checked', async () => {
  const first = await openTab()
  first.beginLogin()
  first.setBasicAuth('reader@example.test', 'not-yet-checked')
  const second = await openTab()
  second.clearBasicAuth() // the stub shares one sessionStorage; a real new tab starts empty
  expect(await second.requestAuthFromOtherTabs(50)).toBe(false)
})
