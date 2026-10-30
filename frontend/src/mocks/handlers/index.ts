import { mockStore } from '../store'
import { AppApiError } from '@/lib/http/errors'
import { Article, Category, SubscriptionPlan } from '@/features/reader/types'
import type { ReconciliationPeriod } from '@/features/finance/types'

// Helper for delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function handleMockRequest(method: string, url: string, body?: any): Promise<any> {
  await delay(250) // Realistic network latency

  const parsedUrl = new URL(url, 'http://localhost')
  let pathname = parsedUrl.pathname
  if (pathname.startsWith('/api/v1')) {
    pathname = pathname.substring('/api/v1'.length) || '/'
  }
  const params = parsedUrl.searchParams
  const currentUser = mockStore.getCurrentUser()

  // ---------------- AUTH / IDENTITY ----------------
  if (pathname === '/auth/me') {
    return currentUser
  }
  if (pathname === '/auth/switch-user' && method === 'POST') {
    mockStore.setCurrentUser(body.userId)
    return mockStore.getCurrentUser()
  }
  if (pathname === '/auth/users') {
    return mockStore.getState().users
  }

  // ---------------- READER & PUBLIC ----------------
  if (pathname === '/categories' && method === 'GET') {
    return mockStore.getState().categories
  }

  if (pathname === '/subscription-plans' && method === 'GET') {
    return mockStore.getState().subscriptionPlans.filter((p) => p.isActive)
  }

  if (pathname === '/articles' && method === 'GET') {
    const categorySlug = params.get('category')
    const search = params.get('search')?.toLowerCase()
    const isPremium = params.get('isPremium')

    let articles = mockStore.getState().articles.filter((a) => a.status === 'PUBLISHED')

    if (categorySlug) {
      articles = articles.filter((a) => a.categorySlug === categorySlug)
    }
    if (search) {
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search) ||
          a.sapo.toLowerCase().includes(search) ||
          a.tags.some((t) => t.toLowerCase().includes(search))
      )
    }
    if (isPremium !== null && isPremium !== undefined) {
      const boolVal = isPremium === 'true'
      articles = articles.filter((a) => a.isPremium === boolVal)
    }

    return articles
  }

  if (pathname.startsWith('/articles/') && method === 'GET') {
    const slug = pathname.replace('/articles/', '')
    const article = mockStore.getState().articles.find((a) => a.slug === slug || a.id === slug)
    if (!article) {
      throw new AppApiError({
        timestamp: new Date().toISOString(),
        status: 404,
        error: 'Not Found',
        message: 'Không tìm thấy bài viết yêu cầu',
        path: pathname,
      })
    }

    // Check entitlement
    const hasAccess = mockStore.hasAccessToArticle(currentUser.id, article.id)
    if (article.isPremium && !hasAccess) {
      // Strict: Do NOT send full content in response! Only send previewContent
      const safeArticle: Article = {
        ...article,
        content: undefined, // Stripped at API level
      }
      return safeArticle
    }

    // User is authorized or article is free -> return full content
    mockStore.recordReadingHistory(currentUser.id, article)
    return article
  }

  if (pathname === '/reader/entitlements' && method === 'GET') {
    return mockStore.getEntitlements(currentUser.id)
  }

  if (pathname.startsWith('/reader/bookmarks/') && method === 'POST') {
    const articleId = pathname.replace('/reader/bookmarks/', '')
    const isBookmarked = mockStore.toggleBookmark(currentUser.id, articleId)
    return { bookmarked: isBookmarked }
  }

  if (pathname.startsWith('/reader/comments/') && method === 'GET') {
    const articleId = pathname.replace('/reader/comments/', '')
    return mockStore.getState().comments.filter((c) => c.articleId === articleId && c.status === 'APPROVED')
  }

  if (pathname === '/reader/comments' && method === 'POST') {
    const newComment = {
      id: `cmt-${Date.now()}`,
      articleId: body.articleId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      content: body.content,
      status: 'APPROVED' as const, // auto-approve non-spam comments for demo
      createdAt: new Date().toISOString(),
      likeCount: 0,
      reported: false,
    }
    mockStore.getState().comments.push(newComment)
    return newComment
  }

  // ---------------- ADVERTISING / ADVERTISER ----------------
  if (pathname === '/advertiser/profile' && method === 'GET') {
    return mockStore.getAdvertiserProfile()
  }
  if (pathname === '/advertiser/profile/history' && method === 'GET') {
    return mockStore.getAdvertiserProfileHistory()
  }
  if (pathname === '/advertiser/profile' && method === 'PUT') {
    return mockStore.saveAdvertiserProfile(body)
  }

  if (pathname === '/ad-slots' && method === 'GET') {
    return mockStore.getState().adSlots
  }

  if (pathname === '/advertiser/bookings' && method === 'GET') {
    // If Advertiser role: filter by company or user
    if (currentUser.role === 'ADVERTISER') {
      return mockStore.getState().bookings.filter((b) => b.advertiserId === currentUser.id)
    }
    // Editorial or Finance or Admin can see all
    return mockStore.getState().bookings
  }

  if (pathname.startsWith('/advertiser/bookings/') && method === 'GET') {
    const id = pathname.replace('/advertiser/bookings/', '')
    const booking = mockStore.getState().bookings.find((b) => b.id === id)
    if (!booking) throw new Error('Không tìm thấy booking')
    return booking
  }

  if (pathname === '/advertiser/bookings' && method === 'POST') {
    return mockStore.createBooking(body)
  }

  if (pathname.endsWith('/accept-quote') && method === 'POST') {
    const id = pathname.split('/')[3]
    return mockStore.acceptQuotation(id, body?.quoteVersion)
  }

  if (pathname.startsWith('/advertiser/slots/') && pathname.endsWith('/availability') && method === 'GET') {
    const slotId = pathname.split('/')[3]
    const slot = mockStore.getState().adSlots.find((s) => s.id === slotId)
    const fullDates = mockStore.getSlotFullDates(slotId, params.get('startDate') ?? '', params.get('endDate') ?? '')
    return { available: fullDates.length === 0, capacity: slot?.maxCapacity ?? 1, inventoryMode: slot?.inventoryMode ?? 'EXCLUSIVE', fullDates }
  }

  // Mock của POST /advertiser/campaigns/:id/payment: số tiền lấy từ booking đã chốt, dùng lại đơn còn chờ.
  if (pathname.startsWith('/advertiser/campaigns/') && pathname.endsWith('/payment') && method === 'POST') {
    const id = pathname.split('/')[3]
    const camp = mockStore.getState().campaigns.find((c) => c.id === id)
    const booking = mockStore.getState().bookings.find((b) => b.id === (camp?.bookingId ?? id))
    if (!booking || booking.bookingStatus !== 'CONFIRMED') throw new Error('Vui lòng xác nhận báo giá trước khi thanh toán')
    if (booking.paymentStatus === 'PAID') throw new Error('Booking đã được thanh toán')
    const pending = mockStore.getState().orders.find((o) => o.targetId === booking.id && o.paymentStatus === 'PENDING')
    return pending ?? mockStore.createOrder(currentUser.id, 'AD_CAMPAIGN', booking.id,
      `Quảng cáo: ${booking.campaignName || booking.slotName}`, booking.finalPrice, 'VIETQR')
  }

  if (pathname.startsWith('/advertiser/campaigns/') && method === 'GET') {
    const id = pathname.replace('/advertiser/campaigns/', '')
    const camp = mockStore.getState().campaigns.find((c) => c.id === id || c.bookingId === id)
    if (!camp) throw new Error('Không tìm thấy chiến dịch')
    return camp
  }

  if (pathname.endsWith('/creatives') && method === 'POST') {
    const campId = pathname.split('/')[3]
    return mockStore.uploadCreative(campId, body)
  }

  // ---------------- EDITORIAL BACKOFFICE ----------------
  if (pathname === '/editorial/articles' && method === 'GET') {
    return mockStore.getState().articles
  }

  if (pathname.startsWith('/editorial/articles/') && method === 'GET') {
    const id = pathname.replace('/editorial/articles/', '')
    const article = mockStore.getState().articles.find((a) => a.id === id)
    if (!article) {
      throw new AppApiError({
        timestamp: new Date().toISOString(),
        status: 404,
        error: 'Not Found',
        message: 'Không tìm thấy bài viết',
        path: pathname,
      })
    }
    return article
  }

  if (pathname === '/editorial/bookings' && method === 'GET') {
    return mockStore.getState().bookings
  }

  if (pathname === '/editorial/campaigns' && method === 'GET') {
    return mockStore.getState().campaigns
  }

  if (pathname.startsWith('/editorial/bookings/') && pathname.endsWith('/reject') && method === 'POST') {
    const id = pathname.split('/')[3]
    return mockStore.rejectBooking(id, body.reason)
  }

  if (pathname === '/editorial/articles' && method === 'POST') {
    return mockStore.createArticle(body)
  }

  if (pathname.endsWith('/policy') && method === 'PUT') {
    const id = pathname.split('/')[3]
    const article = mockStore.getState().articles.find((a) => a.id === id)
    if (!article) throw new Error('Không tìm thấy bài viết')
    article.isPremium = body.accessType === 'PREMIUM'
    if (body.singlePrice !== undefined) {
      article.price = body.singlePrice
    }
    return article
  }

  if (pathname.startsWith('/editorial/articles/') && method === 'PUT') {
    const id = pathname.replace('/editorial/articles/', '')
    return mockStore.updateArticle(id, body.article, body.changelog)
  }

  if (pathname.endsWith('/status') && method === 'POST') {
    const id = pathname.split('/')[3]
    return mockStore.changeArticleStatus(id, body.status, body.reviewNotes)
  }

  if (pathname.endsWith('/quote') && method === 'POST') {
    const id = pathname.split('/')[3]
    return mockStore.sendQuotation(id, body.finalPrice, body.discountPercent, body.quotationNotes)
  }

  if (pathname.endsWith('/review-creative') && method === 'POST') {
    const creativeId = pathname.split('/')[3]
    return mockStore.reviewCreative(creativeId, body.approved, body.notes)
  }

  if ((pathname === '/editorial/subscription-plans' || pathname === '/subscription-plans') && method === 'GET') {
    return mockStore.getState().subscriptionPlans
  }

  if (pathname.startsWith('/editorial/subscription-plans/') && pathname.endsWith('/toggle-status') && method === 'POST') {
    const id = pathname.split('/')[3]
    const plan = mockStore.getState().subscriptionPlans.find((p) => p.id === id)
    if (!plan) throw new Error('Không tìm thấy gói cước')
    plan.isActive = !plan.isActive
    return plan
  }

  if (pathname === '/editorial/comments' && method === 'GET') {
    return mockStore.getState().comments
  }

  if ((pathname.endsWith('/moderate') || pathname.endsWith('/moderate-comment')) && method === 'POST') {
    const commentId = pathname.split('/')[3]
    const cmt = mockStore.getState().comments.find((c) => c.id === commentId)
    if (cmt) {
      cmt.status = body.status
    }
    return cmt
  }

  if (pathname === '/editorial/ai/suggest' && method === 'POST') {
    await delay(500)
    return {
      suggestedTitles: [
        `Góc nhìn đa chiều: ${body.topic || 'Phát triển kinh tế địa phương'} trong kỷ nguyên mới`,
        `Đột phá chuyển đổi số: Kinh nghiệm thực tiễn từ mô hình ${body.topic || 'công nghệ'}`,
        `Tháo gỡ điểm nghẽn hạ tầng: Bước ngoặt chiến lược cho thành phố Cảng`,
      ],
      suggestedSapo: `Bài phân tích toàn diện của chuyên gia về bối cảnh, thực trạng và các giải pháp then chốt nhằm phát huy tối đa tiềm lực ${body.topic || 'địa phương'} trong giai đoạn 2026-2030.`,
      suggestedTags: ['Hải Phòng', 'Đất Cảng', 'Kinh tế', 'Logistics'],
    }
  }

  // ---------------- FINANCE BACKOFFICE ----------------
  if (pathname === '/finance/dashboard' && method === 'GET') {
    const state = mockStore.getState()
    const paidOrders = state.orders.filter((o) => o.paymentStatus === 'PAID')
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.finalAmount, 0)
    const pendingOrders = state.orders.filter((o) => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING')
    const underReviewRefunds = state.refunds.filter((r) => r.status === 'UNDER_REVIEW')

    return {
      totalRevenue,
      paidOrdersCount: paidOrders.length,
      pendingOrdersCount: pendingOrders.length,
      refundReviewCount: underReviewRefunds.length,
      reconciliationDiscrepancy: state.reconciliation.discrepancyTotal,
      recentOrders: state.orders.slice(0, 5),
    }
  }

  if (pathname === '/finance/orders' && method === 'GET') {
    if (currentUser.role === 'READER') {
      return mockStore.getState().orders.filter((o) => o.userId === currentUser.id)
    }
    if (currentUser.role === 'ADVERTISER') {
      return mockStore.getState().orders.filter((o) => o.userId === currentUser.id)
    }
    return mockStore.getState().orders
  }

  // Đơn của tôi: trả đúng dạng backend thật (ApiResponse<Page<OrderStatusResponse>>), mới nhất trước.
  if (pathname === '/finance/orders/me' && method === 'GET') {
    const typeAlias: Record<string, string> = { ARTICLE_PURCHASE: 'ARTICLE', AD_CAMPAIGN: 'AD' }
    const toBackendType = (t: string) => typeAlias[t] ?? t
    const toBackendStatus = (s: string) =>
      s === 'PAID' || s === 'PARTIALLY_REFUNDED' ? 'SUCCESS'
        : s === 'PROCESSING' || s === 'EXPIRED' ? 'PENDING'
          : s
    const type = params.get('type')?.trim().toUpperCase()
    const page = Math.max(0, Number(params.get('page') ?? 0) || 0)
    const rawSize = Number(params.get('size') ?? 20) || 20
    const size = rawSize <= 0 ? 20 : Math.min(rawSize, 100)
    const mine = mockStore.getState().orders
      .filter((o) => o.userId === currentUser.id)
      .filter((o) => !type || toBackendType(o.orderType) === toBackendType(type))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const content = mine.slice(page * size, (page + 1) * size).map((o) => ({
      transactionId: Number(o.id.replace(/\D/g, '')) || o.id,
      orderCode: o.orderCode,
      orderType: toBackendType(o.orderType),
      status: toBackendStatus(o.paymentStatus),
      isPaid: toBackendStatus(o.paymentStatus) === 'SUCCESS',
      expired: o.paymentStatus === 'EXPIRED',
      amount: o.finalAmount ?? o.amount,
      currency: 'VND',
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      paidAt: o.paymentStatus === 'PAID' ? o.updatedAt : undefined,
      description: o.targetTitle,
      targetId: o.targetId,
    }))
    return {
      success: true,
      message: 'Lấy danh sách đơn hàng thành công',
      data: { content, totalElements: mine.length, totalPages: Math.ceil(mine.length / size), number: page, size },
    }
  }

  if (pathname.startsWith('/finance/orders/') && method === 'GET') {
    const id = pathname.replace('/finance/orders/', '')
    const order = mockStore.getState().orders.find((o) => o.id === id || o.orderCode === id)
    if (!order) throw new Error('Không tìm thấy đơn hàng')
    return order
  }

  if (pathname === '/finance/checkout' && method === 'POST') {
    return mockStore.createOrder(
      currentUser.id,
      body.orderType,
      body.targetId,
      body.targetTitle,
      body.amount,
      body.paymentMethod
    )
  }

  if (pathname.endsWith('/pay') && method === 'POST') {
    const id = pathname.split('/')[3]
    return mockStore.submitPaymentAttempt(id, body.method, body.bankRefCode, body.receiptImage)
  }

  if (pathname.endsWith('/verify-bank-transfer') && method === 'POST') {
    const id = pathname.split('/')[3]
    return mockStore.markOrderPaid(id, currentUser.name)
  }

  if (pathname === '/finance/refunds' && method === 'GET') {
    return mockStore.getState().refunds
  }

  if (pathname === '/finance/refunds/propose' && method === 'POST') {
    return mockStore.proposeRefund(
      body.orderId,
      body.refundAmount,
      body.reason,
      body.affectedBenefit,
      body.evidenceUrl
    )
  }

  if (pathname.endsWith('/review-refund') && method === 'POST') {
    const refundId = pathname.split('/')[3]
    return mockStore.reviewRefund(refundId, body.approved, body.reviewNotes)
  }

  if (pathname === '/finance/reconciliation' && method === 'GET') {
    return withReconciliationCounts(mockStore.getState().reconciliation)
  }

  if (pathname === '/finance/reconciliation/resolve' && method === 'POST') {
    const rec = mockStore.getState().reconciliation
    const disc = rec.discrepancies.find((d) => d.id === body.discrepancyId)
    if (!disc) throw mockError(404, 'Không tìm thấy khoản lệch')
    if (rec.status === 'CLOSED') throw mockError(409, 'Kỳ đối soát đã chốt, không xử lý thêm được')
    if (disc.status !== 'UNRESOLVED') throw mockError(409, 'Khoản lệch đã được xử lý')
    if (!body.note?.trim()) throw mockError(400, 'Phải nhập ghi chú xử lý khoản lệch')
    if (body.action === 'ASSIGN_ORDER' && !body.orderCode) throw mockError(400, 'Gán vào đơn cần mã đơn hàng')
    disc.status = 'RESOLVED'
    disc.action = body.action || 'EXPLAINED'
    disc.actionRef = body.action === 'ASSIGN_ORDER' ? body.orderCode : body.action === 'CREDIT_WALLET' ? `REC-${disc.transactionCode}` : undefined
    disc.resolutionNote = body.note
    disc.resolvedBy = currentUser.name
    disc.resolvedAt = new Date().toISOString()
    disc.discrepancyAmount = 0
    return withReconciliationCounts(rec)
  }

  if (pathname === '/finance/reconciliation/close' && method === 'POST') {
    if (currentUser.role !== 'FINANCE_MANAGER' && currentUser.role !== 'SYSTEM_ADMIN') {
      throw mockError(403, 'Chỉ Kế toán trưởng được chốt kỳ đối soát')
    }
    const rec = withReconciliationCounts(mockStore.getState().reconciliation)
    if (rec.status === 'CLOSED') throw mockError(409, 'Kỳ đối soát đã chốt')
    if ((rec.unresolvedCount ?? 0) > 0 && !body?.acknowledgeUnresolved) {
      throw mockError(409, `Còn ${rec.unresolvedCount} khoản lệch chưa xử lý`)
    }
    rec.status = 'CLOSED'
    rec.closedAt = new Date().toISOString()
    rec.closedByName = currentUser.name
    rec.closeNote = body?.note
    return rec
  }

  // UC053: công nợ quảng cáo dựng từ chiến dịch + đơn AD trong kho mock
  if (pathname === '/finance/receivables' && method === 'GET') {
    return mockReceivables()
  }

  if (pathname.startsWith('/finance/receivables/') && pathname.endsWith('/reminders') && method === 'POST') {
    const campaignId = Number(pathname.split('/')[3])
    const r = mockReceivables().find((x) => x.campaignId === campaignId)
    if (!r) throw mockError(404, `Không tìm thấy công nợ của chiến dịch #${campaignId}`)
    if (r.remainingDebt <= 0) throw mockError(400, 'Chiến dịch đã thanh toán đủ, không cần nhắc nợ')
    const sent = mockReminders[campaignId] || []
    if (sent.length && Date.now() - Date.parse(sent[sent.length - 1]) < 24 * 3600 * 1000) {
      throw mockError(409, 'Mỗi 24 giờ chỉ nhắc 1 lần')
    }
    mockReminders[campaignId] = [...sent, new Date().toISOString()]
    return mockReceivables().find((x) => x.campaignId === campaignId)
  }

  // UC060: cảnh báo cùng logic với các màn hình tương ứng
  if (pathname === '/finance/alerts' && method === 'GET') {
    const state = mockStore.getState()
    const alerts: any[] = []
    const add = (count: number, type: string, severity: string, title: string, message: string, actionUrl: string) => {
      if (count > 0) alerts.push({ type, severity, title, message: message.replace('%d', String(count)), count, actionUrl })
    }
    add(state.refunds.filter((r) => r.status === 'UNDER_REVIEW').length, 'REFUND_PENDING', 'HIGH',
      'Yêu cầu hoàn tiền chờ duyệt', 'Có %d yêu cầu hoàn tiền đang chờ Kế toán trưởng phê duyệt theo nguyên tắc 4 mắt.',
      '/backoffice/finance/refunds')
    add(mockReceivables().filter((r) => r.debtGroup === 'OVERDUE').length, 'DEBT_OVERDUE', 'HIGH',
      'Công nợ quảng cáo B2B quá hạn', 'Có %d chiến dịch quảng cáo đã quá hạn nhưng chưa thanh toán đủ.',
      '/backoffice/finance/receivables')
    add(withReconciliationCounts(state.reconciliation).unresolvedCount ?? 0, 'RECONCILIATION_UNRESOLVED', 'MEDIUM',
      'Khoản lệch đối soát chưa xử lý', 'Có %d khoản tiền giữa sao kê SePay và hệ thống chưa khớp trong kỳ này.',
      '/backoffice/finance/reconciliation')
    return alerts
  }

  if (pathname === '/finance/ledger' && method === 'GET') {
    return mockStore.getState().ledger
  }

  // ---------------- ADMINISTRATION ----------------
  if (pathname === '/admin/audit-logs' && method === 'GET') {
    return mockStore.getState().auditLogs
  }

  if (pathname === '/admin/paywall-settings' && method === 'GET') {
    return mockStore.getState().paywallSettings
  }

  if (pathname === '/admin/paywall-settings' && method === 'PUT') {
    Object.assign(mockStore.getState().paywallSettings, body)
    mockStore.getState().paywallSettings.lastUpdatedAt = new Date().toISOString()
    mockStore.getState().paywallSettings.updatedBy = currentUser.name
    return mockStore.getState().paywallSettings
  }

  if (pathname === '/admin/ad-delivery-status' && method === 'GET') {
    return mockStore.getState().adDeliveryStatus
  }

  if (pathname.endsWith('/update-role') && method === 'PUT') {
    const userId = pathname.split('/')[3]
    const user = mockStore.getState().users.find((u) => u.id === userId)
    if (user) {
      user.role = body.role
    }
    return user
  }

  throw new AppApiError({
    timestamp: new Date().toISOString(),
    status: 404,
    error: 'Endpoint Not Found',
    message: `Không tìm thấy endpoint mô phỏng: ${method} ${pathname}`,
    path: pathname,
  })
}

const mockError = (status: number, message: string) =>
  new AppApiError({ timestamp: new Date().toISOString(), status, error: String(status), message, path: '' })

/** Số khoản lệch / tổng tiền lệch còn mở, tính lại từ danh sách (giống backend). */
function withReconciliationCounts(rec: ReconciliationPeriod): ReconciliationPeriod {
  const open = rec.discrepancies.filter((d) => d.status === 'UNRESOLVED')
  rec.unresolvedCount = open.length
  rec.discrepancyTotal = open.reduce((sum, d) => sum + Math.abs(d.discrepancyAmount), 0)
  rec.month = rec.month || rec.startDate.slice(0, 7)
  if (rec.status !== 'CLOSED') rec.status = open.length ? 'OPEN' : 'RECONCILED'
  return rec
}

/** Lịch sử nhắc nợ mock theo chiến dịch (chỉ trong phiên trình duyệt). */
const mockReminders: Record<number, string[]> = {}

function mockReceivables() {
  const state = mockStore.getState()
  const today = new Date().toISOString().slice(0, 10)
  return state.campaigns
    .filter((c) => c.totalBudget > 0 && c.status !== 'DRAFT' && c.status !== 'CANCELLED')
    .map((c) => {
      const campaignId = Number(String(c.id).replace(/\D/g, '')) || 0
      const paid = state.orders
        .filter((o) => o.orderType === 'AD_CAMPAIGN' && o.targetId === c.id && o.paymentStatus === 'PAID')
        .reduce((sum, o) => sum + o.finalAmount, 0)
      const remaining = Math.max(0, c.totalBudget - paid)
      const overdueDays = remaining > 0 && today > c.endDate
        ? Math.floor((Date.parse(today) - Date.parse(c.endDate)) / 86400000) : 0
      const sent = mockReminders[campaignId] || []
      return {
        campaignId,
        campaignName: c.name,
        advertiserId: Number(String(c.advertiserId).replace(/\D/g, '')) || 0,
        companyName: c.companyName,
        contractValue: c.totalBudget,
        paidAmount: paid,
        remainingDebt: remaining,
        startDate: c.startDate,
        dueDate: c.endDate,
        overdueDays,
        campaignStatus: c.status,
        debtGroup: remaining === 0 ? 'PAID_IN_FULL' : overdueDays > 0 ? 'OVERDUE' : 'IN_TERM',
        reminderCount: sent.length,
        lastReminderAt: sent[sent.length - 1],
      }
    })
}
