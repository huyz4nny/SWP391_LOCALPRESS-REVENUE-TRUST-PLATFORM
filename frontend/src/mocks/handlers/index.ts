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
  if (pathname === '/auth/me' && method === 'GET') {
    return currentUser
  }
  if (pathname === '/auth/me' && method === 'PATCH') {
    if (currentUser.role === 'GUEST') {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 401, error: 'Unauthorized', message: 'Chưa đăng nhập', path: pathname })
    }
    const name = String(body?.fullName ?? '').trim()
    if (!name || name.length > 150) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 400, error: 'Bad Request', message: 'Họ tên tối đa 150 ký tự', path: pathname })
    }
    const phone = String(body?.phone ?? '').trim()
    const stored = mockStore.getState().users.find((user) => user.id === currentUser.id)
    if (stored) {
      stored.name = name
      stored.phone = phone
    }
    return { ...currentUser, name, phone }
  }
  if (pathname === '/auth/register' && method === 'POST') {
    const newUser = {
      id: `user-reader-${Date.now()}`,
      email: body.email,
      name: body.fullName || 'Độc giả mới',
      phone: body.phone,
      role: 'READER' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      isActive: true,
    }
    mockStore.getState().users.push(newUser)
    return {
      id: newUser.id,
      email: newUser.email,
      role: 'READER',
      status: 'ACTIVE',
    }
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

  // UC038 và UC040 mock giống backend thật: khách chưa đăng nhập bị 401
  const isLibraryPath = pathname.startsWith('/reader/purchased-articles')
    || pathname.startsWith('/reader/subscriptions')
    || pathname.startsWith('/reader/article-reports')
    || pathname.startsWith('/reader/saved-articles')
    || pathname.startsWith('/reader/followed-categories')
    || pathname.startsWith('/reader/reading-history')
    || pathname === '/reader/feed'
  if (isLibraryPath && currentUser.role === 'GUEST') {
    throw new AppApiError({ timestamp: new Date().toISOString(), status: 401, error: 'Unauthorized', message: 'Bạn cần đăng nhập để dùng chức năng này', path: pathname })
  }

  const mockSubscription = () => {
    const ent = mockStore.getEntitlements(currentUser.id)
    if (!ent.hasSubscription) return null
    const plan = mockStore.getState().subscriptionPlans.find((item) => item.id === ent.subscriptionPlanId)
    const end = ent.subscriptionExpiresAt ? ent.subscriptionExpiresAt.slice(0, 10) : ''
    const start = new Date(`${end}T00:00:00`)
    if (!Number.isNaN(start.getTime())) start.setDate(start.getDate() - (plan?.durationDays || 30))
    const startDate = Number.isNaN(start.getTime()) ? '' : start.toISOString().slice(0, 10)
    return {
      subscriptionId: 1,
      planName: ent.subscriptionPlanName || plan?.name || 'Gói đọc',
      price: plan?.price ?? 0,
      accessScope: 'ALL',
      categoryId: null,
      categoryName: null,
      startDate,
      endDate: end,
      autoRenew: ent.subscriptionAutoRenew !== false,
      hasAdFree: (plan?.features ?? []).some((feature) => feature.toLowerCase().includes('quảng cáo')),
      hasAudio: false,
      inEffect: true,
    }
  }

  if (pathname === '/reader/subscriptions/me' && method === 'GET') {
    const item = mockSubscription()
    return item ? [item] : []
  }

  const cancelMatch = pathname.match(/^\/reader\/subscriptions\/(\d+)\/cancel-auto-renew$/)
  if (cancelMatch && method === 'POST') {
    const ent = mockStore.getEntitlements(currentUser.id)
    const item = mockSubscription()
    if (!item || cancelMatch[1] !== String(item.subscriptionId)) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy gói của bạn', path: pathname })
    }
    ent.subscriptionAutoRenew = false
    return { ...item, autoRenew: false }
  }

  if (pathname === '/reader/article-reports' && method === 'POST') {
    const reason = String(body?.reason ?? '')
    const allowed = ['INCORRECT_INFO', 'TYPO', 'IMAGE_ERROR', 'OTHER']
    if (!allowed.includes(reason)) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 400, error: 'Bad Request', message: 'Lý do không hợp lệ', path: pathname })
    }
    return { reportId: Date.now(), status: 'PENDING' }
  }

  if (pathname === '/reader/purchased-articles' && method === 'GET') {
    const articles = mockStore.getState().articles
    const ids = mockStore.getEntitlements(currentUser.id).purchasedArticleIds
    return ids
      .map((id) => articles.find((a) => a.id === id && a.status === 'PUBLISHED'))
      .filter((a): a is Article => Boolean(a))
  }

  if (pathname === '/reader/saved-articles/ids' && method === 'GET') {
    const published = new Set(mockStore.getState().articles.filter((a) => a.status === 'PUBLISHED').map((a) => a.id))
    return mockStore.getEntitlements(currentUser.id).bookmarkedArticleIds.filter((id) => published.has(id))
  }

  if (pathname === '/reader/saved-articles' && method === 'GET') {
    const articles = mockStore.getState().articles
    return mockStore.getEntitlements(currentUser.id).bookmarkedArticleIds
      .map((id) => articles.find((a) => a.id === id && a.status === 'PUBLISHED'))
      .filter((a): a is Article => Boolean(a))
  }

  if (pathname.startsWith('/reader/saved-articles/') && (method === 'PUT' || method === 'DELETE')) {
    const articleId = decodeURIComponent(pathname.replace('/reader/saved-articles/', ''))
    if (method === 'PUT' && !mockStore.getState().articles.some((a) => a.id === articleId && a.status === 'PUBLISHED')) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy bài viết hoặc bài chưa được xuất bản', path: pathname })
    }
    return { articleId, saved: mockStore.setBookmark(currentUser.id, articleId, method === 'PUT') }
  }

  if (pathname === '/reader/followed-categories' && method === 'GET') {
    const { categories, articles } = mockStore.getState()
    return mockStore.getEntitlements(currentUser.id).followedCategoryIds
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is Category => Boolean(c))
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        articleCount: articles.filter((a) => a.categoryId === c.id && a.status === 'PUBLISHED').length,
        followedAt: null,
      }))
  }

  if (pathname.startsWith('/reader/followed-categories/') && (method === 'PUT' || method === 'DELETE')) {
    const categoryId = decodeURIComponent(pathname.replace('/reader/followed-categories/', ''))
    if (method === 'PUT' && !mockStore.getState().categories.some((c) => c.id === categoryId)) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy chuyên mục hoặc chuyên mục đã ngừng hoạt động', path: pathname })
    }
    return { categoryId, following: mockStore.setCategoryFollow(currentUser.id, categoryId, method === 'PUT') }
  }

  if (pathname === '/reader/reading-history/count' && method === 'GET') {
    return mockStore.getEntitlements(currentUser.id).readingHistory.length
  }

  if (pathname === '/reader/reading-history' && method === 'GET') {
    const articles = mockStore.getState().articles
    return mockStore.getEntitlements(currentUser.id).readingHistory
      .map((h) => {
        const article = articles.find((a) => a.id === h.articleId && a.status === 'PUBLISHED')
        if (!article) return null
        return {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          isPremium: article.isPremium,
          categoryName: article.categoryName,
          categorySlug: article.categorySlug,
          lastReadAt: h.readAt,
        }
      })
      .filter(Boolean)
  }

  if (pathname.startsWith('/reader/reading-history/') && method === 'DELETE') {
    const articleId = decodeURIComponent(pathname.replace('/reader/reading-history/', ''))
    mockStore.removeReadingHistory(currentUser.id, articleId)
    return { articleId, saved: false }
  }

  if (pathname === '/reader/feed' && method === 'GET') {
    const followed = new Set(mockStore.getEntitlements(currentUser.id).followedCategoryIds)
    return mockStore.getState().articles
      .filter((a) => a.status === 'PUBLISHED' && followed.has(a.categoryId))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  }

  // UC034 mock của POST /reader/article-purchases giống backend thật: trả targetId và giá do server tính
  if (pathname === '/reader/article-purchases' && method === 'POST') {
    const article = mockStore.getState().articles.find((a) => a.id === body.articleId)
    if (!article) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy bài viết', path: pathname })
    }
    if (!article.isPremium || !article.price) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 409, error: 'Conflict', message: 'Bài viết này không bán lẻ', path: pathname })
    }
    if (mockStore.hasAccessToArticle(currentUser.id, article.id)) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 409, error: 'Conflict', message: 'Bạn đã có quyền đọc bài này', path: pathname })
    }
    return { orderType: 'ARTICLE', targetId: article.id, amount: article.price, title: article.title }
  }

  // UC035 mock của POST /reader/subscriptions: khách đang có gói vẫn được mua tiếp để gia hạn
  if (pathname === '/reader/subscriptions' && method === 'POST') {
    const plan = mockStore.getState().subscriptionPlans.find((p) => p.id === body.planId && p.isActive)
    if (!plan) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy gói cước', path: pathname })
    }
    return { orderType: 'SUBSCRIPTION', targetId: plan.id, amount: plan.price, title: plan.name }
  }

  if (pathname === '/reader/comments/mine' && method === 'GET') {
    if (currentUser.role === 'GUEST') {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 401, error: 'Unauthorized', message: 'Bạn cần đăng nhập', path: pathname })
    }
    const articleId = params.get('articleId')
    return mockStore.getState().comments.filter((c) => c.articleId === articleId && c.userId === currentUser.id)
  }

  if (pathname.startsWith('/reader/comments/') && method === 'GET') {
    const articleId = pathname.replace('/reader/comments/', '')
    return mockStore.getState().comments.filter((c) => c.articleId === articleId && c.status === 'APPROVED')
  }

  if (pathname === '/reader/comments' && method === 'POST') {
    if (currentUser.role === 'GUEST') {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 401, error: 'Unauthorized', message: 'Bạn cần đăng nhập', path: pathname })
    }
    const text = String(body?.content ?? '').trim()
    if (!text) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 400, error: 'Bad Request', message: 'Nội dung bình luận không được để trống', path: pathname })
    }
    if (text.length > 1000) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 400, error: 'Bad Request', message: 'Bình luận tối đa 1000 ký tự', path: pathname })
    }
    const article = mockStore.getState().articles.find((a) => a.id === body.articleId && a.status === 'PUBLISHED')
    if (!article) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy bài viết đang phát hành', path: pathname })
    }
    const newComment = {
      id: `cmt-${Date.now()}`,
      articleId: body.articleId,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatarUrl,
      content: text,
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      reported: false,
    }
    mockStore.getState().comments = [...mockStore.getState().comments, newComment]
    return newComment
  }

  if (method === 'PUT' && /^\/reader\/comments\/[^/]+$/.test(pathname)) {
    if (currentUser.role === 'GUEST') {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 401, error: 'Unauthorized', message: 'Bạn cần đăng nhập', path: pathname })
    }
    const commentId = pathname.split('/')[3]
    const comments = mockStore.getState().comments
    const index = comments.findIndex((c) => c.id === commentId)
    if (index < 0) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy bình luận', path: pathname })
    }
    const comment = comments[index]
    if (comment.userId !== currentUser.id) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 403, error: 'Forbidden', message: 'Chỉ sửa được bình luận của chính mình', path: pathname })
    }
    const text = String(body?.content ?? '').trim()
    if (!text) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 400, error: 'Bad Request', message: 'Nội dung bình luận không được để trống', path: pathname })
    }
    const updated = { ...comment, content: text, status: 'PENDING' as const }
    mockStore.getState().comments = comments.map((item, i) => (i === index ? updated : item))
    return updated
  }

  if (method === 'POST' && /^\/reader\/comments\/[^/]+\/report$/.test(pathname)) {
    if (currentUser.role === 'GUEST') {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 401, error: 'Unauthorized', message: 'Bạn cần đăng nhập', path: pathname })
    }
    const commentId = pathname.split('/')[3]
    const comments = mockStore.getState().comments
    const index = comments.findIndex((c) => c.id === commentId)
    if (index < 0) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 404, error: 'Not Found', message: 'Không tìm thấy bình luận', path: pathname })
    }
    const comment = comments[index]
    const reason = String(body?.reason ?? '').trim()
    if (!reason) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 400, error: 'Bad Request', message: 'Cần ghi lý do báo cáo', path: pathname })
    }
    if (comment.userId === currentUser.id) {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 409, error: 'Conflict', message: 'Không báo cáo bình luận của chính mình', path: pathname })
    }
    if (comment.status !== 'APPROVED') {
      throw new AppApiError({ timestamp: new Date().toISOString(), status: 409, error: 'Conflict', message: 'Chỉ báo cáo được bình luận đang hiển thị', path: pathname })
    }
    const updated = { ...comment, status: 'PENDING' as const, reported: true, reportReason: reason }
    mockStore.getState().comments = comments.map((item, i) => (i === index ? updated : item))
    return { commentId: comment.id, status: 'PENDING' }
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
