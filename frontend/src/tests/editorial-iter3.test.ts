import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { editorialApi } from '@/features/editorial/api'
import { mockStore } from '@/mocks/store'
import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'

const originalMock = APP_CONFIG.useMockApi
beforeAll(() => {
  APP_CONFIG.useMockApi = true
  httpClient.setUseMock(true)
  mockStore.resetToDefaults()
  mockStore.setCurrentUser('user-editor')
})
afterAll(() => {
  APP_CONFIG.useMockApi = originalMock
  httpClient.setUseMock(originalMock)
  mockStore.resetToDefaults()
})

describe('SV2 Editorial Iteration 3 Comprehensive Test Suite (Screens II.2.7 - II.2.10)', () => {
  beforeEach(() => {
    mockStore.setCurrentUser('user-editor')
  })

  // =========================================================================
  // Screen II.2.7: Campaign Eligibility Check (UC022, UC023, Rule 9)
  // =========================================================================
  describe('Screen II.2.7: Campaign Eligibility Check (Ad Serving Gatekeeper)', () => {
    it('1. GET /editorial/eligibility returns checklist with 5 gatekeeper conditions', async () => {
      const list = await editorialApi.getEligibilityChecklist()
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(0)

      const first = list[0]
      expect(first).toHaveProperty('campaignId')
      expect(first).toHaveProperty('campaignName')
      expect(first).toHaveProperty('companyName')
      expect(first).toHaveProperty('slotCode')

      // 5 Core Gatekeeper Conditions
      expect(first).toHaveProperty('paymentPassed')
      expect(first).toHaveProperty('quotationPassed')
      expect(first).toHaveProperty('contractPassed')
      expect(first).toHaveProperty('creativePassed')
      expect(first).toHaveProperty('slotPassed')

      // Overall Readiness
      expect(first).toHaveProperty('overallEligible')
      expect(first).toHaveProperty('canActivate')
      expect(typeof first.overallEligible).toBe('boolean')
    })

    it('2. Evaluates overallEligible = true only when all 5 conditions are satisfied', async () => {
      const list = await editorialApi.getEligibilityChecklist()
      for (const item of list) {
        const expectedEligible =
          item.paymentPassed &&
          item.quotationPassed &&
          item.contractPassed &&
          item.creativePassed &&
          item.slotPassed

        expect(item.overallEligible).toBe(expectedEligible)
      }
    })

    it('3. POST /editorial/eligibility/:id/activate activates campaign to LIVE', async () => {
      const list = await editorialApi.getEligibilityChecklist()
      const target = list.find((i) => i.overallEligible)
      expect(target).toBeDefined()

      if (target) {
        const res = await editorialApi.activateCampaign(target.campaignId)
        expect(res.status).toBe('ACTIVE')
      }
    })
  })

  // =========================================================================
  // Screen II.2.8: Campaign Control (UC023, UC024, Rule 9)
  // =========================================================================
  describe('Screen II.2.8: Campaign Control (Kill-Switch & Make-Good)', () => {
    it('4. GET /editorial/campaign-control returns operational metrics and planned days', async () => {
      const list = await editorialApi.getCampaignControlList()
      expect(Array.isArray(list)).toBe(true)
      expect(list.length).toBeGreaterThan(0)

      const first = list[0]
      expect(first).toHaveProperty('campaignId')
      expect(first).toHaveProperty('totalPlannedDays')
      expect(first).toHaveProperty('elapsedDays')
      expect(first).toHaveProperty('status')
    })

    it('5. Emergency Kill-Switch: POST /editorial/campaign-control/:id/suspend halts campaign with reason', async () => {
      const list = await editorialApi.getCampaignControlList()
      const target = list[0]
      expect(target).toBeDefined()

      const suspendReason = 'Phát hiện link đích trỏ về trang web có dấu hiệu lừa đảo'
      const updated = await editorialApi.suspendCampaign(target.campaignId, suspendReason)

      expect(updated.status).toBe('SUSPENDED')
      expect(updated.suspensionReason).toBe(suspendReason)
    })

    it('6. Resume Campaign: POST /editorial/campaign-control/:id/resume restores campaign to ACTIVE', async () => {
      const list = await editorialApi.getCampaignControlList()
      const target = list[0]
      expect(target).toBeDefined()

      const resumed = await editorialApi.resumeCampaign(target.campaignId)
      expect(resumed.status).toBe('ACTIVE')
    })

    it('7. Make-Good Scheduling: POST /editorial/campaign-control/:id/make-good adds compensation days', async () => {
      const list = await editorialApi.getCampaignControlList()
      const target = list[0]
      expect(target).toBeDefined()

      const extraDays = 5
      const reason = 'Đền bù 5 ngày hiển thị do sự cố máy chủ phân phối ngày 28/09'
      const res = await editorialApi.makeGoodCampaign(target.campaignId, extraDays, reason)

      expect(res.makeGoodDaysAdded).toBe(extraDays)
    })
  })

  // =========================================================================
  // Screen II.2.9: Advertising Contracts & VIP Tiering (UC019, UC025)
  // =========================================================================
  describe('Screen II.2.9: Advertising Contract Management & VIP Tiering', () => {
    it('8. GET /editorial/contracts returns contract dossiers and addendums', async () => {
      const contracts = await editorialApi.getContracts()
      expect(Array.isArray(contracts)).toBe(true)
      expect(contracts.length).toBeGreaterThan(0)

      const first = contracts[0]
      expect(first).toHaveProperty('contractReference')
      expect(first).toHaveProperty('contractValue')
      expect(first).toHaveProperty('companyName')
      expect(Array.isArray(first.addendums)).toBe(true)
    })

    it('9. PUT /editorial/contracts/:id updates contract reference and digital PDF file URL', async () => {
      const contracts = await editorialApi.getContracts()
      const target = contracts[0]

      const newRef = 'HD-2026-DV-999'
      const newPdf = 'https://example.com/contracts/HD-2026-DV-999.pdf'
      const updated = await editorialApi.updateContract(target.campaignId, newRef, newPdf)

      expect(updated.contractReference).toBe(newRef)
      expect(updated.contractFileUrl).toBe(newPdf)
    })

    it('10. POST /editorial/contracts/:id/addendum creates a legal contract addendum', async () => {
      const contracts = await editorialApi.getContracts()
      const target = contracts[0]

      const addendumReq = {
        addendumNumber: 'PL-02/HD-2026-DV-001',
        effectiveDate: '2026-10-15',
        adjustmentType: 'Gia hạn thời gian phát sóng',
        notes: 'Gia hạn thêm 7 ngày do nhu cầu cao điểm cuối năm',
      }

      const res = await editorialApi.createContractAddendum(target.campaignId, addendumReq)
      expect(Array.isArray(res.addendums)).toBe(true)
      expect(res.addendums.length).toBeGreaterThan(0)
      expect(res.addendums[0].addendumNumber).toBe(addendumReq.addendumNumber)
    })

    it('10b. POST /editorial/contracts creates a new legal contract dossier with signing date', async () => {
      const created = await editorialApi.createContract({
        campaignId: 2,
        contractNumber: 'HD-2026-NEW-002',
        signingDate: '2026-09-01',
        contractValue: 30000000,
        contractFileUrl: 'https://example.com/contracts/HD-2026-NEW-002.pdf',
        notes: 'Hợp đồng tài trợ phát sóng quý 4',
      })

      expect(created.contractNumber).toBe('HD-2026-NEW-002')
      expect(created.signingDate).toBe('2026-09-01')
      expect(created.contractValue).toBe(30000000)
    })

    it('11. GET /editorial/advertisers/vip returns B2B partners list with VIP tiers', async () => {
      const vips = await editorialApi.getVipAdvertisers()
      expect(Array.isArray(vips)).toBe(true)
      expect(vips.length).toBeGreaterThan(0)

      const first = vips[0]
      expect(first).toHaveProperty('advertiserId')
      expect(first).toHaveProperty('companyName')
      expect(first).toHaveProperty('vipTier')
      expect(first).toHaveProperty('vipDiscountPercent')
      expect(first).toHaveProperty('totalSpent')
    })

    it('12. PUT /editorial/advertisers/:id/vip-tier updates partner tier and discount percentage', async () => {
      const vips = await editorialApi.getVipAdvertisers()
      const target = vips[0]

      const updateReq = {
        vipTier: 'DIAMOND',
        vipDiscountPercent: 15,
        notes: 'Khách hàng đối tác chiến lược cấp cao Hải Phòng',
      }

      const updated = await editorialApi.updateVipTier(target.advertiserId, updateReq)
      expect(updated.vipTier).toBe('DIAMOND')
      expect(updated.vipDiscountPercent).toBe(15)
    })
  })

  // =========================================================================
  // Screen II.2.10: Business Operations Dashboard (UC015, UC028)
  // =========================================================================
  describe('Screen II.2.10: Business Operations Dashboard (Hybrid Revenue & Occupancy)', () => {
    it('13. GET /editorial/dashboard/overview returns hybrid revenue metrics (B2B + B2C)', async () => {
      const overview = await editorialApi.getDashboardOverview()

      // Hybrid Revenue
      expect(overview).toHaveProperty('b2bTotalSigned')
      expect(overview).toHaveProperty('b2bActualPaid')
      expect(overview).toHaveProperty('b2bReceivables')
      expect(overview).toHaveProperty('b2cSubscriptions')
      expect(overview).toHaveProperty('b2cSingleArticles')
      expect(overview).toHaveProperty('totalPlatformRevenue')

      // Invariant: totalPlatformRevenue = b2bActualPaid + b2cSubscriptions + b2cSingleArticles
      expect(overview.totalPlatformRevenue).toBe(
        overview.b2bActualPaid + overview.b2cSubscriptions + overview.b2cSingleArticles
      )
    })

    it('14. Inventory Occupancy: Returns occupancy percentages and status for all ad slots', async () => {
      const overview = await editorialApi.getDashboardOverview()
      expect(Array.isArray(overview.slotOccupancies)).toBe(true)
      expect(overview.slotOccupancies.length).toBeGreaterThan(0)

      const slot = overview.slotOccupancies[0]
      expect(slot).toHaveProperty('slotCode')
      expect(slot).toHaveProperty('capacity')
      expect(slot).toHaveProperty('activeCampaignsCount')
      expect(slot).toHaveProperty('occupancyPercentage')
      expect(typeof slot.occupancyPercentage).toBe('number')
      expect(slot.occupancyPercentage).toBeGreaterThanOrEqual(0)
    })

    it('15. Urgent Action Queue: Aggregates pending items across editorial workflows', async () => {
      const overview = await editorialApi.getDashboardOverview()

      expect(typeof overview.pendingArticlesCount).toBe('number')
      expect(typeof overview.pendingBookingsCount).toBe('number')
      expect(typeof overview.pendingCreativesCount).toBe('number')
      expect(typeof overview.pendingCommentsCount).toBe('number')

      expect(Array.isArray(overview.urgentItems)).toBe(true)
      if (overview.urgentItems.length > 0) {
        const item = overview.urgentItems[0]
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('type')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('priority')
        expect(item).toHaveProperty('link')
      }
    })
  })
})
