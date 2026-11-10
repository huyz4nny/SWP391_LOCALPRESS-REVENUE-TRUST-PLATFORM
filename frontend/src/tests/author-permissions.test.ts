import { describe, expect, it } from 'vitest'
import { PERMISSION_CHECKERS, APP_ROUTES } from '@/app/config'

describe('AUTHOR permissions and RBAC route helpers', () => {
  it('can open backoffice and is directed to the existing composer', () => {
    expect(PERMISSION_CHECKERS.canAccessBackoffice('AUTHOR')).toBe(true)
    expect(PERMISSION_CHECKERS.canComposeArticles('AUTHOR')).toBe(true)
    expect(PERMISSION_CHECKERS.getDefaultBackofficeRoute('AUTHOR'))
      .toBe('/backoffice/editorial/articles')
  })

  it('cannot access editorial moderation, publication, finance, or administration', () => {
    expect(PERMISSION_CHECKERS.canAccessEditorial('AUTHOR')).toBe(false)
    expect(PERMISSION_CHECKERS.canPublishArticles('AUTHOR')).toBe(false)
    expect(PERMISSION_CHECKERS.canAccessFinance('AUTHOR')).toBe(false)
    expect(PERMISSION_CHECKERS.canAccessAdmin('AUTHOR')).toBe(false)
  })

  it('keeps writing restricted to AUTHOR, EDITOR, and SYSTEM_ADMIN', () => {
    expect(PERMISSION_CHECKERS.canComposeArticles('EDITOR')).toBe(true)
    expect(PERMISSION_CHECKERS.canComposeArticles('SYSTEM_ADMIN')).toBe(true)
    expect(PERMISSION_CHECKERS.canComposeArticles('READER')).toBe(false)
    expect(PERMISSION_CHECKERS.canComposeArticles('REVIEWER')).toBe(false)
  })

  it('returns accurate backoffice label per role without missing CHIEF_ACCOUNTANT', () => {
    expect(PERMISSION_CHECKERS.getBackofficeLabel('SYSTEM_ADMIN')).toBe('Vào Quản Trị')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('CHIEF_ACCOUNTANT')).toBe('Vào Tài Chính')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('ACCOUNTANT')).toBe('Vào Tài Chính')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('STAFF')).toBe('Vào Tài Chính')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('FINANCE_STAFF')).toBe('Vào Tài Chính')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('EDITOR')).toBe('Vào Tòa Soạn')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('REVIEWER')).toBe('Vào Tòa Soạn')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('AUTHOR')).toBe('Vào Tòa Soạn')
    expect(PERMISSION_CHECKERS.getBackofficeLabel('READER')).toBe('Vào Backoffice')
  })

  it('provides centralized advertiser route constant and helper', () => {
    expect(APP_ROUTES.advertiser).toBe('/advertiser')
    expect(PERMISSION_CHECKERS.getAdvertiserRoute()).toBe('/advertiser')
  })
})
