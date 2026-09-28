import { mockStore } from '../store'
import { AppApiError } from '@/lib/http/errors'
import { Article, Category, SubscriptionPlan } from '@/features/reader/types'

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
    return mockStore.acceptQuotation(id)
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

  if (pathname === '/editorial/articles' && method === 'POST') {
    return mockStore.createArticle(body)
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

  if (pathname === '/editorial/comments' && method === 'GET') {
    return mockStore.getState().comments
  }

  if (pathname.endsWith('/moderate-comment') && method === 'POST') {
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
    return mockStore.getState().reconciliation
  }

  if (pathname === '/finance/reconciliation/resolve' && method === 'POST') {
    const rec = mockStore.getState().reconciliation
    const disc = rec.discrepancies.find((d) => d.id === body.discrepancyId)
    if (disc) {
      disc.status = 'RESOLVED'
      disc.resolutionNote = body.note
      disc.resolvedBy = currentUser.name
      disc.resolvedAt = new Date().toISOString()
      rec.discrepancyTotal = 0
    }
    return rec
  }

  if (pathname === '/finance/reconciliation/close' && method === 'POST') {
    const rec = mockStore.getState().reconciliation
    rec.status = 'CLOSED'
    rec.closedAt = new Date().toISOString()
    rec.closedByName = currentUser.name
    return rec
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
