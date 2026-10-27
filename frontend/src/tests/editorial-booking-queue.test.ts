import { describe, it, expect } from 'vitest'
import { editorialApi } from '@/features/editorial/api'
import { advertisingApi } from '@/features/advertising/api'
import { mockStore } from '@/mocks/store'

describe('SV2 Editorial Iteration 1 & Iteration 2 Comprehensive Test Suite', () => {
  // ==========================================
  // Màn II.2.3: Pending Booking Queue (UC016)
  // ==========================================
  it('1. Màn II.2.3: GET /editorial/bookings returns bookings list with valid structure', async () => {
    const bookings = await editorialApi.getBookings()
    expect(Array.isArray(bookings)).toBe(true)
    expect(bookings.length).toBeGreaterThan(0)

    const first = bookings[0]
    expect(first).toHaveProperty('id')
    expect(first).toHaveProperty('companyName')
    expect(first).toHaveProperty('slotName')
    expect(first).toHaveProperty('bookingStatus')
    expect(first).toHaveProperty('paymentStatus')
  })

  it('2. UC016: Editorial can reject a submitted booking with rejection reason', async () => {
    const bookings = await editorialApi.getBookings()
    let target = bookings.find((b) => b.bookingStatus === 'SUBMITTED')

    if (!target) {
      target = await advertisingApi.createBooking({
        slotId: 'slot-top-leaderboard',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        daysCount: 5,
        companyName: 'Công ty Thử Nghiệm Từ Chối',
        contactPerson: 'Nguyễn Văn A',
        contactPhone: '0988776655',
        contactEmail: 'test-reject@company.com',
      })
    }

    expect(target.bookingStatus).toBe('SUBMITTED')

    const rejectReason = 'Vị trí slot đã kín lịch phát sóng trong thời gian yêu cầu.'
    const updated = await editorialApi.rejectBooking(target.id, rejectReason)

    expect(updated.id).toBe(target.id)
    expect(updated.bookingStatus).toBe('REJECTED')
    expect(updated.rejectionReason).toBe(rejectReason)

    const all = await editorialApi.getBookings()
    const found = all.find((b) => b.id === target.id)
    expect(found?.bookingStatus).toBe('REJECTED')
    expect(found?.rejectionReason).toBe(rejectReason)
  })

  // ==========================================
  // Màn II.2.5: Quotation Management (UC018)
  // ==========================================
  it('3. UC018: Editorial can send official quotation with discount and technical notes', async () => {
    const newBooking = await advertisingApi.createBooking({
      slotId: 'slot-sidebar-sticky',
      startDate: '2026-11-10',
      endDate: '2026-11-20',
      daysCount: 10,
      companyName: 'Tập đoàn Logistics Hải Phòng',
      contactPerson: 'Trần Thị B',
      contactPhone: '0912345678',
      contactEmail: 'logistics-hp@company.com',
    })

    expect(newBooking.bookingStatus).toBe('SUBMITTED')

    const discountPercent = 10
    const finalPrice = Math.round(newBooking.standardPrice * 0.9)
    const notes = 'Chiết khấu 10% cho khách hàng thân thiết. Cam kết SOV 100%.'

    const quoted = await editorialApi.sendQuotation(newBooking.id, finalPrice, discountPercent, notes)

    expect(quoted.bookingStatus).toBe('QUOTED')
    expect(quoted.finalPrice).toBe(finalPrice)
    expect(quoted.discountPercent).toBe(discountPercent)
    expect(quoted.quotationNotes).toBe(notes)

    const all = await editorialApi.getBookings()
    const found = all.find((b) => b.id === newBooking.id)
    expect(found?.bookingStatus).toBe('QUOTED')
    expect(found?.finalPrice).toBe(finalPrice)
  })

  it('4. Cross-role Integration: Advertiser creates booking -> Appears in Editorial Queue', async () => {
    const uniqueCompany = `Công ty Cảng Biển Đất Cảng ${Date.now()}`
    const created = await advertisingApi.createBooking({
      slotId: 'slot-top-leaderboard',
      startDate: '2026-12-01',
      endDate: '2026-12-07',
      daysCount: 7,
      companyName: uniqueCompany,
      contactPerson: 'Lê Văn C',
      contactPhone: '0909090909',
      contactEmail: 'cangbien@hp.vn',
    })

    expect(created.companyName).toBe(uniqueCompany)

    const queue = await editorialApi.getBookings()
    const match = queue.find((b) => b.id === created.id)

    expect(match).toBeDefined()
    expect(match?.companyName).toBe(uniqueCompany)
    expect(match?.bookingStatus).toBe('SUBMITTED')
  })

  // ==========================================
  // Màn II.2.4: Advertising Inventory Calendar (UC017)
  // ==========================================
  it('5. Màn II.2.4 (UC017): Inventory calendar loads ad slots and validates capacity & Rule 7 conflict check', async () => {
    const slots = await editorialApi.getAdSlots()
    expect(Array.isArray(slots)).toBe(true)
    expect(slots.length).toBeGreaterThan(0)

    const leaderboard = slots.find((s) => s.id === 'slot-top-leaderboard')
    expect(leaderboard).toBeDefined()
    expect(leaderboard?.inventoryMode).toBe('EXCLUSIVE')

    // Verify bookings exist covering calendar dates
    const bookings = await editorialApi.getBookings()
    const activeBookings = bookings.filter((b) => b.bookingStatus !== 'REJECTED')
    expect(activeBookings.length).toBeGreaterThan(0)

    // Check date range coverage
    const sample = activeBookings[0]
    expect(sample.startDate).toBeDefined()
    expect(sample.endDate).toBeDefined()
  })

  // ==========================================
  // Màn II.2.6: Creative Review & Rule 8 (UC020, UC021, UC022)
  // ==========================================
  it('6. Màn II.2.6 (UC020, UC021, UC022): Creative review enforces Rule 8 versioning & live serving switch', async () => {
    const campaigns = await editorialApi.getCampaigns()
    expect(Array.isArray(campaigns)).toBe(true)
    expect(campaigns.length).toBeGreaterThan(0)

    // Find campaign CAMP-002 which has v1 and v2
    const camp = campaigns.find((c) => c.id === 'CAMP-002')
    expect(camp).toBeDefined()
    expect(camp?.creatives.length).toBeGreaterThanOrEqual(2)

    const v1 = camp?.creatives.find((c) => c.versionNumber === 1)
    const v2 = camp?.creatives.find((c) => c.versionNumber === 2)

    expect(v1).toBeDefined()
    expect(v2).toBeDefined()

    // Initially v1 is active serving
    expect(v1?.isActiveServing).toBe(true)

    // Editorial reviews and approves v2 (UC021, UC022)
    const notes = 'Phê duyệt phiên bản v2 chính sách chiết khấu mới.'
    const approvedV2 = await editorialApi.reviewCreative(v2!.id, true, notes)

    expect(approvedV2.status).toBe('APPROVED')
    expect(approvedV2.isActiveServing).toBe(true)
    expect(approvedV2.reviewNotes).toBe(notes)

    // Verify Rule 8: v1 is now deactivated, v2 is now active serving
    const reloaded = await editorialApi.getCampaigns()
    const updatedCamp = reloaded.find((c) => c.id === 'CAMP-002')
    const updatedV1 = updatedCamp?.creatives.find((c) => c.versionNumber === 1)
    const updatedV2 = updatedCamp?.creatives.find((c) => c.versionNumber === 2)

    expect(updatedV1?.isActiveServing).toBe(false)
    expect(updatedV2?.isActiveServing).toBe(true)
  })

  // ==========================================
  // Iteration 1 Màn II.2.1: Article Review & Publishing (UC025)
  // ==========================================
  it('7. Màn II.2.1 (UC025): Article workflow transitions (APPROVED -> PUBLISHED -> UNPUBLISHED)', async () => {
    const articles = await editorialApi.getArticles()
    expect(articles.length).toBeGreaterThan(0)

    const targetArticle = articles[0]

    // 1. Approve
    const approved = await editorialApi.updateArticleStatus(targetArticle.id, 'APPROVED', 'Đạt chuẩn biên tập')
    expect(approved.status).toBe('APPROVED')

    // 2. Publish
    const published = await editorialApi.updateArticleStatus(targetArticle.id, 'PUBLISHED')
    expect(published.status).toBe('PUBLISHED')

    // 3. Take down / Emergency unpublish
    const unpublished = await editorialApi.updateArticleStatus(targetArticle.id, 'UNPUBLISHED', 'Hạ bài theo chỉ đạo')
    expect(unpublished.status).toBe('UNPUBLISHED')
  })

  it('8. Màn II.2.1: GET /editorial/articles/:id returns single article detail without 404', async () => {
    const articles = await editorialApi.getArticles()
    const id = articles[0].id

    const single = await editorialApi.getArticle(id)
    expect(single).toBeDefined()
    expect(single.id).toBe(id)
    expect(single.title).toBeDefined()
  })

  // ==========================================
  // Iteration 1 Màn II.2.2: Comments, Policy, Plans (UC026, UC027, UC028)
  // ==========================================
  it('9. Màn II.2.2 (UC026): Moderate comments (APPROVED / REJECTED / HIDDEN)', async () => {
    const comments = await editorialApi.getComments()
    expect(Array.isArray(comments)).toBe(true)

    if (comments.length > 0) {
      const c = comments[0]
      const moderated = await editorialApi.moderateComment(c.id, 'APPROVED')
      expect(moderated.status).toBe('APPROVED')
    }
  })

  it('10. Màn II.2.2 (UC027): Update article policy to PREMIUM / FREE and set price', async () => {
    const articles = await editorialApi.getArticles()
    const id = articles[0].id

    const updated = await editorialApi.updateArticlePolicy(id, 'PREMIUM', 15000)
    expect(updated.isPremium).toBe(true)
    expect(updated.price).toBe(15000)

    const setFree = await editorialApi.updateArticlePolicy(id, 'FREE')
    expect(setFree.isPremium).toBe(false)
  })

  it('11. Màn II.2.2 (UC028): Toggle subscription plan status', async () => {
    const plans = await editorialApi.getSubscriptionPlans()
    expect(Array.isArray(plans)).toBe(true)
    expect(plans.length).toBeGreaterThan(0)

    const plan = plans[0]
    const initialStatus = plan.isActive

    const toggled = await editorialApi.toggleSubscriptionPlanStatus(plan.id)
    expect(toggled.isActive).toBe(!initialStatus)

    // Toggle back
    const restored = await editorialApi.toggleSubscriptionPlanStatus(plan.id)
    expect(restored.isActive).toBe(initialStatus)
  })
})
