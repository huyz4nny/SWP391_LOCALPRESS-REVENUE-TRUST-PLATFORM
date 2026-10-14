import { describe, expect, it } from 'vitest'
import { PERMISSION_CHECKERS } from '@/app/config'

describe('AUTHOR permissions', () => {
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
})
