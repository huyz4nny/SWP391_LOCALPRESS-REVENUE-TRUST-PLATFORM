import { afterEach, expect, it } from 'vitest'
import { resolveAdImageUrl } from '../components/shared/adDeliveryApi'
import { APP_CONFIG } from '../app/config'

const original = APP_CONFIG.apiBaseUrl
const path = '/api/v1/ad-slots/creative-files/12345678-1234-1234-1234-123456789abc.png'
afterEach(() => { APP_CONFIG.apiBaseUrl = original })
it('loads server-owned images from the API host rather than the frontend port', () => {
  APP_CONFIG.apiBaseUrl = 'http://localhost:8080/api/v1'
  expect(resolveAdImageUrl(path)).toBe('http://localhost:8080' + path)
})
it('preserves reverse-proxy API prefixes and trailing slashes', () => {
  APP_CONFIG.apiBaseUrl = 'https://example.test/localpress/api/v1/'
  expect(resolveAdImageUrl(path)).toBe('https://example.test/localpress' + path)
})
it('does not rewrite an external image URL', () => {
  expect(resolveAdImageUrl('https://cdn.example.test/banner.png')).toBe('https://cdn.example.test/banner.png')
})
