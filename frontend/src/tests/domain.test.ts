import { describe, it, expect, beforeEach } from 'vitest'
import { mockStore } from '../mocks/store'
import { handleMockRequest } from '../mocks/handlers'

describe('LocalPress Core Business Domain Tests', () => {
  beforeEach(() => {
    mockStore.resetToDefaults()
  })

  describe('1. Payment & Entitlements (B2C Paywall Flow)', () => {
    it('Free reader requesting a Premium article receives only previewContent, not full content', async () => {
      mockStore.setCurrentUser('user-reader-free')
      const article = await handleMockRequest('GET', '/articles/khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen')

      expect(article.isPremium).toBe(true)
      expect(article.content).toBeUndefined() // Server-level truncation!
      expect(article.previewContent).toBeDefined()
      expect(article.previewContent.length).toBeGreaterThan(20)
    })

    it('handles /api/v1/articles and returns all published articles across categories', async () => {
      const articles = await handleMockRequest('GET', 'http://localhost:8080/api/v1/articles')
      expect(articles.length).toBeGreaterThanOrEqual(20)
      const categories = await handleMockRequest('GET', 'http://localhost:8080/api/v1/categories')
      expect(categories.length).toBe(6)

      // Verify 100% Hai Phong content
      expect(articles.every((a: any) => !a.title.includes('Hà Tĩnh') && !a.title.includes('Sơn Dương'))).toBe(true)
      expect(articles.some((a: any) => a.title.includes('Lạch Huyện'))).toBe(true)
      expect(articles.some((a: any) => a.title.includes('Thủy Nguyên'))).toBe(true)
      expect(articles.some((a: any) => a.title.includes('Đồ Sơn'))).toBe(true)
      expect(articles.some((a: any) => a.title.includes('Cát Bà'))).toBe(true)
      expect(articles.some((a: any) => a.title.includes('Kiến Thụy'))).toBe(true)
      expect(articles.some((a: any) => a.title.includes('Tiên Lãng'))).toBe(true)
    })

    it('Premium reader (with annual subscription) receives full content for Premium article', async () => {
      mockStore.setCurrentUser('user-reader-premium')
      const article = await handleMockRequest('GET', '/articles/khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen')

      expect(article.isPremium).toBe(true)
      expect(article.content).toBeDefined()
      expect(article.content).toContain('Cụm cảng quốc tế Lạch Huyện')
    })

    it('Purchasing single article grants entitlement and unlocks content upon payment', async () => {
      mockStore.setCurrentUser('user-reader-free')

      // Initially no access
      let article = await handleMockRequest('GET', '/articles/khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen')
      expect(article.content).toBeUndefined()

      // Checkout and Pay
      const order = mockStore.createOrder(
        'user-reader-free',
        'ARTICLE_PURCHASE',
        'art-001',
        'Khai thác tiềm năng Cảng nước sâu Lạch Huyện',
        15000,
        'VIETQR'
      )
      expect(order.paymentStatus).toBe('PENDING')

      // Process payment
      mockStore.markOrderPaid(order.id, 'Cổng VietQR')
      expect(order.paymentStatus).toBe('PAID')

      // Check entitlement
      const ent = mockStore.getEntitlements('user-reader-free')
      expect(ent.purchasedArticleIds).toContain('art-001')

      // Verify article is now unlocked
      article = await handleMockRequest('GET', '/articles/khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen')
      expect(article.content).toBeDefined()
      expect(article.content.length).toBeGreaterThan(100)
    })
  })

  describe('2. Advertising & Delivery Eligibility (B2B Flow)', () => {
    it('Ad campaign only becomes LIVE when PAID + Creative APPROVED', () => {
      // In seed data: BK-2026-001 is PAID and Creative is APPROVED -> LIVE
      const b1 = mockStore.getState().bookings.find((b) => b.id === 'BK-2026-001')
      expect(b1?.paymentStatus).toBe('PAID')
      expect(b1?.deliveryStatus).toBe('LIVE')

      // BK-2026-004 is UNPAID and SUBMITTED -> NOT LIVE
      const b4 = mockStore.getState().bookings.find((b) => b.id === 'BK-2026-004')
      expect(b4?.paymentStatus).toBe('UNPAID')
      expect(b4?.deliveryStatus).toBe('NOT_STARTED')
    })

    it('Uploading new creative does not disrupt current serving creative until approved', () => {
      // In seed data: BK-2026-002 has v1 APPROVED (serving) and v2 IN_REVIEW
      const camp = mockStore.getState().campaigns.find((c) => c.bookingId === 'BK-2026-002')
      expect(camp).toBeDefined()

      const v1 = camp?.creatives.find((c) => c.versionNumber === 1)
      const v2 = camp?.creatives.find((c) => c.versionNumber === 2)

      expect(v1?.isActiveServing).toBe(true)
      expect(v2?.isActiveServing).toBe(false)
      expect(v2?.status).toBe('IN_REVIEW')

      // When Reviewer approves v2
      mockStore.setCurrentUser('user-reviewer')
      mockStore.reviewCreative(v2!.id, true, 'Duyệt bản v2 chiết khấu mới')

      // Now v2 becomes active serving, v1 deactivated
      expect(v2?.status).toBe('APPROVED')
      expect(v2?.isActiveServing).toBe(true)
      expect(v1?.isActiveServing).toBe(false)
      expect(camp?.activeCreativeVersion).toBe(2)
    })
  })

  describe('3. Financial Controls & Separation of Duty (Refund Flow)', () => {
    it('Creator of refund proposal cannot approve their own refund (Four-Eyes Principle)', () => {
      mockStore.setCurrentUser('user-fin-staff') // Le Thi Thu Ngan

      // Le Thi Thu Ngan creates a refund proposal
      const refund = mockStore.proposeRefund(
        'ORD-101',
        100000,
        'Yêu cầu hoàn tiền thử nghiệm',
        'Thu hồi một phần'
      )

      expect(refund.status).toBe('UNDER_REVIEW')
      expect(refund.proposedBy).toBe('user-fin-staff')

      // Le Thi Thu Ngan attempts to approve her own refund -> Must throw Error!
      expect(() => {
        mockStore.reviewRefund(refund.id, true, 'Tự duyệt đề xuất của mình')
      }).toThrowError(/Người lập đề xuất không được tự phê duyệt/)
    })

    it('Finance Manager can approve refund, revoking entitlements and creating debit ledger entry', () => {
      // REF-002 was proposed by user-fin-staff
      const ref2 = mockStore.getState().refunds.find((r) => r.id === 'REF-002')
      expect(ref2).toBeDefined()
      expect(ref2?.status).toBe('UNDER_REVIEW')

      // Switch to Finance Manager (user-fin-mgr: Pham Truong Phong)
      mockStore.setCurrentUser('user-fin-mgr')

      const approved = mockStore.reviewRefund(ref2!.id, true, 'Phê duyệt hoàn 5.000.000 VND theo phụ lục hợp đồng')
      expect(approved.status).toBe('SUCCEEDED')
      expect(approved.reviewedBy).toBe('user-fin-mgr')

      // Verify Debit entry was added to general ledger
      const latestLedger = mockStore.getState().ledger[0]
      expect(latestLedger.referenceCode).toBe(ref2!.id)
      expect(latestLedger.entryType).toBe('DEBIT')
      expect(latestLedger.amount).toBe(5000000)
    })
  })

  describe('4. Editorial Versioning & Review Lifecycle (Flow 4)', () => {
    it('Cannot publish an article that has not been approved', () => {
      // art-009 is IN_REVIEW
      const art9 = mockStore.getState().articles.find((a) => a.id === 'art-009')
      expect(art9?.status).toBe('IN_REVIEW')

      expect(() => {
        mockStore.changeArticleStatus('art-009', 'PUBLISHED')
      }).toThrowError(/Chỉ được xuất bản các bài viết đã qua bước duyệt/)
    })

    it('Reviewer requests changes -> Editor creates new version with changelog -> Approved -> Published', async () => {
      // 1. Reviewer requests changes on art-009
      mockStore.setCurrentUser('user-reviewer')
      mockStore.changeArticleStatus('art-009', 'CHANGES_REQUESTED', 'Yêu cầu bổ sung số liệu khảo sát linh trưởng')

      let art = mockStore.getState().articles.find((a) => a.id === 'art-009')
      expect(art?.status).toBe('CHANGES_REQUESTED')
      expect(art?.reviewNotes).toContain('khảo sát linh trưởng')

      // 2. Editor updates article with new version and changelog
      mockStore.setCurrentUser('user-editor')
      mockStore.updateArticle('art-009', { content: 'Nội dung cập nhật mới phiên bản 2...' }, 'Đã bổ sung số liệu linh trưởng')

      art = mockStore.getState().articles.find((a) => a.id === 'art-009')
      expect(art?.currentVersion).toBe(2)
      expect(art?.versions?.length).toBe(2)

      // 3. Reviewer approves
      mockStore.setCurrentUser('user-reviewer')
      mockStore.changeArticleStatus('art-009', 'APPROVED')
      art = mockStore.getState().articles.find((a) => a.id === 'art-009')
      expect(art?.status).toBe('APPROVED')

      // 4. Publish
      mockStore.changeArticleStatus('art-009', 'PUBLISHED')
      art = mockStore.getState().articles.find((a) => a.id === 'art-009')
      expect(art?.status).toBe('PUBLISHED')
    })
  })

  describe('5. Data Ownership & Privacy (Flow 7)', () => {
    it('keeps each advertiser profile private when users switch', async () => {
      mockStore.setCurrentUser('user-adv-1')
      const original = await handleMockRequest('GET', '/advertiser/profile')
      await handleMockRequest('PUT', '/advertiser/profile', { ...original, companyName: 'Công ty mới' })
      const ownHistory = await handleMockRequest('GET', '/advertiser/profile/history')
      expect(ownHistory).toHaveLength(1)
      expect(ownHistory[0].oldValue.companyName).toBe(original.companyName)
      expect(ownHistory[0].newValue.companyName).toBe('Công ty mới')
      await handleMockRequest('PUT', '/advertiser/profile', await handleMockRequest('GET', '/advertiser/profile'))
      expect(await handleMockRequest('GET', '/advertiser/profile/history')).toHaveLength(1)

      mockStore.setCurrentUser('user-adv-2')
      expect(await handleMockRequest('GET', '/advertiser/profile/history')).toEqual([])
      const other = await handleMockRequest('GET', '/advertiser/profile')
      expect(other.companyName).not.toBe('Công ty mới')
      await expect(handleMockRequest('PUT', '/advertiser/profile', { ...other, taxCode: original.taxCode }))
        .rejects.toThrow('Mã số thuế đã được sử dụng')

      mockStore.setCurrentUser('user-adv-1')
      expect((await handleMockRequest('GET', '/advertiser/profile')).companyName).toBe('Công ty mới')
      mockStore.setCurrentUser('user-reader-free')
      await expect(handleMockRequest('GET', '/advertiser/profile')).rejects.toThrow('Không có quyền')
      await expect(handleMockRequest('GET', '/advertiser/profile/history')).rejects.toThrow('Không có quyền')
      mockStore.resetToDefaults()
      mockStore.setCurrentUser('user-adv-1')
      expect((await handleMockRequest('GET', '/advertiser/profile')).companyName).toBe(original.companyName)
    })

    it('Advertiser A cannot see bookings or private financial records of Advertiser B', async () => {
      mockStore.setCurrentUser('user-adv-1') // Đặng Quang Huy (ADV-001)
      const adv1Bookings = await handleMockRequest('GET', '/advertiser/bookings')

      expect(adv1Bookings.length).toBeGreaterThan(0)
      adv1Bookings.forEach((b: any) => {
        expect(b.advertiserId).toBe('user-adv-1')
      })

      mockStore.setCurrentUser('user-adv-2') // Lê Hồng Phong (ADV-002)
      const adv2Bookings = await handleMockRequest('GET', '/advertiser/bookings')

      expect(adv2Bookings.length).toBeGreaterThan(0)
      adv2Bookings.forEach((b: any) => {
        expect(b.advertiserId).toBe('user-adv-2')
      })
    })
  })

  describe('6. Granular RBAC & Subsystem Access Control (Frontend Phân quyền)', () => {
    it('Editor cannot access Finance or Admin subsystems, only Editorial', async () => {
      const { PERMISSION_CHECKERS } = await import('../app/config')

      expect(PERMISSION_CHECKERS.canAccessEditorial('EDITOR')).toBe(true)
      expect(PERMISSION_CHECKERS.canAccessFinance('EDITOR')).toBe(false)
      expect(PERMISSION_CHECKERS.canAccessAdmin('EDITOR')).toBe(false)
      expect(PERMISSION_CHECKERS.canApproveRefunds('EDITOR')).toBe(false)
      expect(PERMISSION_CHECKERS.getDefaultBackofficeRoute('EDITOR')).toBe('/backoffice/editorial/articles')
    })

    it('Accountant / Finance Staff cannot access Editorial or Admin, only Finance', async () => {
      const { PERMISSION_CHECKERS } = await import('../app/config')

      expect(PERMISSION_CHECKERS.canAccessEditorial('ACCOUNTANT')).toBe(false)
      expect(PERMISSION_CHECKERS.canAccessFinance('ACCOUNTANT')).toBe(true)
      expect(PERMISSION_CHECKERS.canAccessAdmin('ACCOUNTANT')).toBe(false)
      expect(PERMISSION_CHECKERS.canApproveRefunds('ACCOUNTANT')).toBe(true)
      expect(PERMISSION_CHECKERS.getDefaultBackofficeRoute('ACCOUNTANT')).toBe('/backoffice/finance')

      // Regular Finance Staff cannot approve refunds (4-eyes principle)
      expect(PERMISSION_CHECKERS.canApproveRefunds('FINANCE_STAFF')).toBe(false)
      expect(PERMISSION_CHECKERS.canApproveRefunds('FINANCE_MANAGER')).toBe(true)
    })

    it('System Admin has access across all backoffice subsystems', async () => {
      const { PERMISSION_CHECKERS } = await import('../app/config')

      expect(PERMISSION_CHECKERS.canAccessEditorial('SYSTEM_ADMIN')).toBe(true)
      expect(PERMISSION_CHECKERS.canAccessFinance('SYSTEM_ADMIN')).toBe(true)
      expect(PERMISSION_CHECKERS.canAccessAdmin('SYSTEM_ADMIN')).toBe(true)
      expect(PERMISSION_CHECKERS.canApproveRefunds('SYSTEM_ADMIN')).toBe(true)
      expect(PERMISSION_CHECKERS.getDefaultBackofficeRoute('SYSTEM_ADMIN')).toBe('/backoffice/admin')
    })
  })
})

