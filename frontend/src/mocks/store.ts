import { User } from '@/types'
import { Article, Category, SubscriptionPlan, Comment, ReaderEntitlement } from '@/features/reader/types'
import { AdSlot, AdBooking, AdCampaign, AdCreative } from '@/features/advertising/types'
import { Order, RefundRequest, ReconciliationPeriod, GeneralLedgerEntry, PaymentAttempt } from '@/features/finance/types'
import { SystemAuditLog, PaywallSettings, AdDeliveryLiveStatus } from '@/features/administration/types'
import {
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_SUBSCRIPTION_PLANS,
  SEED_ARTICLES,
  SEED_AD_SLOTS,
  SEED_AD_BOOKINGS,
  SEED_AD_CAMPAIGNS,
  SEED_ORDERS,
  SEED_REFUNDS,
  SEED_RECONCILIATION_PERIOD,
  SEED_LEDGER_ENTRIES,
  SEED_AUDIT_LOGS,
  SEED_PAYWALL_SETTINGS,
  SEED_AD_DELIVERY_STATUS,
} from './data/seed'

export interface MockStoreState {
  currentUserId: string
  users: User[]
  categories: Category[]
  subscriptionPlans: SubscriptionPlan[]
  articles: Article[]
  comments: Comment[]
  adSlots: AdSlot[]
  bookings: AdBooking[]
  campaigns: AdCampaign[]
  orders: Order[]
  refunds: RefundRequest[]
  reconciliation: ReconciliationPeriod
  ledger: GeneralLedgerEntry[]
  auditLogs: SystemAuditLog[]
  paywallSettings: PaywallSettings
  adDeliveryStatus: AdDeliveryLiveStatus[]
  entitlements: Record<string, ReaderEntitlement>
}

const STORAGE_KEY = 'localpress_mock_store_haiphong_v4'

const LEGACY_STORAGE_KEYS = [
  'localpress_mock_store',
  'localpress_mock_store_v1',
  'localpress_mock_store_v2',
  'localpress_mock_store_v3',
]

if (typeof window !== 'undefined' && window.localStorage) {
  LEGACY_STORAGE_KEYS.forEach((k) => {
    try {
      window.localStorage.removeItem(k)
    } catch (e) {}
  })
}

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'cmt-001',
    articleId: 'art-001',
    articleTitle: 'Khai thác tiềm năng Cảng nước sâu Lạch Huyện',
    userId: 'user-reader-free',
    userName: 'Nguyễn Văn An',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    content: 'Bài viết phân tích rất xác đáng. Cảng quốc tế Lạch Huyện và đường sắt kết nối cảng sẽ là đòn bẩy đưa Hải Phòng vươn tầm trung tâm hàng hải Đông Nam Á.',
    status: 'APPROVED',
    createdAt: '2026-09-21T09:30:00Z',
    likeCount: 14,
    reported: false,
  },
  {
    id: 'cmt-002',
    articleId: 'art-002',
    articleTitle: 'Phóng sự điều tra độc quyền: Vạch trần đường dây buôn lậu đường biển',
    userId: 'user-reader-premium',
    userName: 'Trần Thị Mai',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    content: 'Cảm ơn tòa soạn đã dũng cảm thâm nhập vạch trần đường dây buôn lậu tinh vi này. Hoan nghênh lực lượng Hải quan và Công an thành phố Hải Phòng!',
    status: 'APPROVED',
    createdAt: '2026-09-22T10:15:00Z',
    likeCount: 28,
    reported: false,
  },
  {
    id: 'cmt-003',
    articleId: 'art-001',
    articleTitle: 'Khai thác tiềm năng Cảng nước sâu Lạch Huyện',
    userId: 'user-guest',
    userName: 'Độc giả ẩn danh',
    content: 'Bấm vào link này để vay tiền nhanh lãi suất 0% http://vaytiennhanh-lua-dao.xyz',
    status: 'PENDING',
    createdAt: '2026-09-27T08:00:00Z',
    likeCount: 0,
    reported: true,
    reportReason: 'Spam đường link độc hại / Lừa đảo tín dụng',
  }
]

const INITIAL_ENTITLEMENTS: Record<string, ReaderEntitlement> = {
  'user-reader-free': {
    userId: 'user-reader-free',
    hasSubscription: false,
    purchasedArticleIds: [],
    bookmarkedArticleIds: ['art-003', 'art-006'],
    readingHistory: [
      { articleId: 'art-003', articleTitle: 'Hải Phòng thu hút hơn 2,8 tỷ USD vốn FDI', slug: 'hai-phong-thu-hut-hon-2-8-ty-usd-von-fdi', readAt: '2026-09-26T14:00:00Z' },
      { articleId: 'art-006', articleTitle: 'Dự án cầu Nguyễn Trãi vượt sông Cấm', slug: 'du-an-cau-nguyen-trai-vuot-song-cam-khoi-cong', readAt: '2026-09-25T10:30:00Z' },
    ],
    followedCategoryIds: ['cat-kinh-te', 'cat-thoi-su'],
    activeDevices: [
      {
        id: 'dev-1',
        deviceName: 'MacBook Pro M2 (Chrome 128)',
        browser: 'Chrome / macOS',
        ipAddress: '14.225.210.45',
        lastActive: '2026-09-27T10:15:00Z',
        isCurrent: true,
      }
    ],
  },
  'user-reader-premium': {
    userId: 'user-reader-premium',
    hasSubscription: true,
    subscriptionPlanId: 'plan-annual',
    subscriptionPlanName: 'Gói Hội Viên Năm (VIP)',
    subscriptionExpiresAt: '2027-09-15T23:59:59Z',
    purchasedArticleIds: ['art-001', 'art-002'],
    bookmarkedArticleIds: ['art-001', 'art-002', 'art-004'],
    readingHistory: [
      { articleId: 'art-001', articleTitle: 'Khai thác tiềm năng Cảng nước sâu Lạch Huyện', slug: 'khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen', readAt: '2026-09-27T08:00:00Z' },
      { articleId: 'art-002', articleTitle: 'Phóng sự điều tra: Buôn lậu đường biển Đình Vũ', slug: 'phong-su-dieu-tra-buon-lau-duong-bien-dinh-vu', readAt: '2026-09-26T19:00:00Z' },
    ],
    followedCategoryIds: ['cat-kinh-te', 'cat-phap-luat', 'cat-nong-nghiep'],
    activeDevices: [
      {
        id: 'dev-2',
        deviceName: 'Dell XPS 15 (Windows 11 / Edge)',
        browser: 'Edge / Windows',
        ipAddress: '113.160.224.12',
        lastActive: '2026-09-27T11:00:00Z',
        isCurrent: true,
      },
      {
        id: 'dev-3',
        deviceName: 'iPhone 15 Pro (Safari Mobile)',
        browser: 'Safari / iOS',
        ipAddress: '113.160.224.12',
        lastActive: '2026-09-26T22:30:00Z',
        isCurrent: false,
      }
    ],
  }
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
  } catch (e) {}
  return null
}

function safeSetItem(key: string, value: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value)
    }
  } catch (e) {}
}

function safeRemoveItem(key: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key)
    }
  } catch (e) {}
}

function getInitialState(): MockStoreState {
  try {
    const raw = safeGetItem(STORAGE_KEY)
    if (raw) {
      const parsed: MockStoreState = JSON.parse(raw)

      // Safety check: if old legacy content is detected in parsed state, purge it completely!
      const hasLegacyContent = parsed.articles?.some(
        (a) =>
          a.title?.includes('Hà Tĩnh') ||
          a.title?.includes('Sơn Dương') ||
          a.slug?.includes('son-duong') ||
          a.title?.includes('Vũng Áng') ||
          (a.id === 'art-001' && !a.title?.includes('Lạch Huyện'))
      )
      if (hasLegacyContent) {
        safeRemoveItem(STORAGE_KEY)
        throw new Error('Detected legacy Ha Tinh cache, resetting to Hai Phong seed')
      }

      // Always synchronize seed articles with the latest SEED_ARTICLES definitions
      const seedMap = new Map(SEED_ARTICLES.map((a) => [a.id, a]))
      if (Array.isArray(parsed.articles)) {
        parsed.articles = parsed.articles.map((a) => seedMap.get(a.id) || a)
        const existingIds = new Set(parsed.articles.map((a) => a.id))
        const missing = SEED_ARTICLES.filter((a) => !existingIds.has(a.id))
        if (missing.length > 0) {
          parsed.articles = [...parsed.articles, ...missing]
        }
      } else {
        parsed.articles = SEED_ARTICLES
      }

      parsed.categories = SEED_CATEGORIES
      parsed.users = SEED_USERS
      parsed.subscriptionPlans = SEED_SUBSCRIPTION_PLANS
      parsed.adSlots = SEED_AD_SLOTS
      parsed.bookings = SEED_AD_BOOKINGS
      parsed.campaigns = SEED_AD_CAMPAIGNS
      parsed.adDeliveryStatus = SEED_AD_DELIVERY_STATUS
      return parsed
    }
  } catch (err) {
    console.warn('Initializing mock store with fresh Hai Phong seed data:', err)
  }

  return {
    currentUserId: 'user-guest', // Default is Guest
    users: SEED_USERS,
    categories: SEED_CATEGORIES,
    subscriptionPlans: SEED_SUBSCRIPTION_PLANS,
    articles: SEED_ARTICLES,
    comments: INITIAL_COMMENTS,
    adSlots: SEED_AD_SLOTS,
    bookings: SEED_AD_BOOKINGS,
    campaigns: SEED_AD_CAMPAIGNS,
    orders: SEED_ORDERS,
    refunds: SEED_REFUNDS,
    reconciliation: SEED_RECONCILIATION_PERIOD,
    ledger: SEED_LEDGER_ENTRIES,
    auditLogs: SEED_AUDIT_LOGS,
    paywallSettings: SEED_PAYWALL_SETTINGS,
    adDeliveryStatus: SEED_AD_DELIVERY_STATUS,
    entitlements: INITIAL_ENTITLEMENTS,
  }
}

class MockStore {
  private state: MockStoreState
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.state = getInitialState()
  }

  private persist() {
    safeSetItem(STORAGE_KEY, JSON.stringify(this.state))
    this.notify()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach((listener) => listener())
  }

  public getState(): MockStoreState {
    return this.state
  }

  public resetToDefaults() {
    safeRemoveItem(STORAGE_KEY)
    this.state = {
      currentUserId: 'user-guest',
      users: SEED_USERS,
      categories: SEED_CATEGORIES,
      subscriptionPlans: SEED_SUBSCRIPTION_PLANS,
      articles: SEED_ARTICLES,
      comments: INITIAL_COMMENTS,
      adSlots: SEED_AD_SLOTS,
      bookings: SEED_AD_BOOKINGS,
      campaigns: SEED_AD_CAMPAIGNS,
      orders: SEED_ORDERS,
      refunds: SEED_REFUNDS,
      reconciliation: SEED_RECONCILIATION_PERIOD,
      ledger: SEED_LEDGER_ENTRIES,
      auditLogs: SEED_AUDIT_LOGS,
      paywallSettings: SEED_PAYWALL_SETTINGS,
      adDeliveryStatus: SEED_AD_DELIVERY_STATUS,
      entitlements: INITIAL_ENTITLEMENTS,
    }
    this.persist()
  }

  // --- Auth / Role Switching ---
  public getCurrentUser(): User {
    const user = this.state.users.find((u) => u.id === this.state.currentUserId)
    return user || this.state.users[0]
  }

  public setCurrentUser(userId: string) {
    if (this.state.users.some((u) => u.id === userId)) {
      this.state.currentUserId = userId
      this.persist()
    }
  }

  // --- Audit Logging Helper ---
  public logAudit(action: string, module: SystemAuditLog['module'], description: string) {
    const currentUser = this.getCurrentUser()
    const newLog: SystemAuditLog = {
      id: `LOG-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      description,
      ipAddress: '113.160.224.88',
      timestamp: new Date().toISOString(),
    }
    this.state.auditLogs = [newLog, ...this.state.auditLogs]
  }

  // --- Reader & Entitlements ---
  public getEntitlements(userId: string): ReaderEntitlement {
    if (!this.state.entitlements[userId]) {
      this.state.entitlements[userId] = {
        userId,
        hasSubscription: false,
        purchasedArticleIds: [],
        bookmarkedArticleIds: [],
        readingHistory: [],
        followedCategoryIds: [],
        activeDevices: [
          {
            id: `dev-${Date.now()}`,
            deviceName: 'Trình duyệt Web hiện tại',
            browser: 'Browser',
            ipAddress: '113.160.224.88',
            lastActive: new Date().toISOString(),
            isCurrent: true,
          }
        ],
      }
    }
    return this.state.entitlements[userId]
  }

  public hasAccessToArticle(userId: string, articleId: string): boolean {
    const article = this.state.articles.find((a) => a.id === articleId)
    if (!article || !article.isPremium) return true // Free articles are public

    const ent = this.getEntitlements(userId)
    if (ent.hasSubscription) return true
    if (ent.purchasedArticleIds.includes(articleId)) return true
    return false
  }

  public toggleBookmark(userId: string, articleId: string): boolean {
    const ent = this.getEntitlements(userId)
    const exists = ent.bookmarkedArticleIds.includes(articleId)
    if (exists) {
      ent.bookmarkedArticleIds = ent.bookmarkedArticleIds.filter((id) => id !== articleId)
    } else {
      ent.bookmarkedArticleIds.push(articleId)
    }
    this.persist()
    return !exists
  }

  public recordReadingHistory(userId: string, article: Article) {
    const ent = this.getEntitlements(userId)
    ent.readingHistory = [
      { articleId: article.id, articleTitle: article.title, slug: article.slug, readAt: new Date().toISOString() },
      ...ent.readingHistory.filter((h) => h.articleId !== article.id)
    ].slice(0, 20)
    this.persist()
  }

  // --- Order & Payments ---
  public createOrder(
    userId: string,
    orderType: Order['orderType'],
    targetId: string,
    targetTitle: string,
    amount: number,
    paymentMethod: Order['paymentMethod']
  ): Order {
    const user = this.state.users.find((u) => u.id === userId) || this.getCurrentUser()
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      orderCode: `LP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      orderType,
      targetId,
      targetTitle,
      amount,
      discount: 0,
      finalAmount: amount,
      paymentStatus: 'PENDING',
      paymentMethod,
      paymentAttempts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.state.orders = [newOrder, ...this.state.orders]
    this.persist()
    return newOrder
  }

  public submitPaymentAttempt(
    orderId: string,
    method: Order['paymentMethod'],
    bankRefCode?: string,
    receiptImage?: string
  ): Order {
    const order = this.state.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Không tìm thấy đơn hàng')

    const isManualBank = method === 'BANK_TRANSFER'
    const newAttempt: PaymentAttempt = {
      id: `ATT-${Date.now()}`,
      orderId,
      method: method || 'VIETQR',
      transactionCode: `TX-${Date.now()}`,
      amount: order.finalAmount,
      status: isManualBank ? 'PROCESSING' : 'SUCCESS',
      bankReferenceCode: bankRefCode || `REF-${Math.floor(1000000 + Math.random() * 9000000)}`,
      receiptImageUrl: receiptImage,
      createdAt: new Date().toISOString(),
      verifiedAt: isManualBank ? undefined : new Date().toISOString(),
    }

    order.paymentAttempts.push(newAttempt)
    order.paymentMethod = method
    order.updatedAt = new Date().toISOString()

    if (isManualBank) {
      order.paymentStatus = 'PROCESSING'
    } else {
      // Instant gateway success (VietQR / MoMo simulation)
      this.markOrderPaid(orderId)
    }

    this.persist()
    return order
  }

  public markOrderPaid(orderId: string, verifiedBy?: string): Order {
    const order = this.state.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Không tìm thấy đơn hàng')

    order.paymentStatus = 'PAID'
    order.updatedAt = new Date().toISOString()
    order.invoiceNumber = `HD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
    order.invoiceIssuedAt = new Date().toISOString()

    const latestAttempt = order.paymentAttempts[order.paymentAttempts.length - 1]
    if (latestAttempt) {
      latestAttempt.status = 'SUCCESS'
      latestAttempt.verifiedAt = new Date().toISOString()
      if (verifiedBy) latestAttempt.verifiedBy = verifiedBy
    }

    // Grant Entitlements
    if (order.orderType === 'SUBSCRIPTION') {
      const ent = this.getEntitlements(order.userId)
      const plan = this.state.subscriptionPlans.find((p) => p.id === order.targetId)
      ent.hasSubscription = true
      ent.subscriptionPlanId = order.targetId
      ent.subscriptionPlanName = plan?.name || 'Gói Độc Giả'
      const expires = new Date()
      expires.setDate(expires.getDate() + (plan?.durationDays || 30))
      ent.subscriptionExpiresAt = expires.toISOString()
    } else if (order.orderType === 'ARTICLE_PURCHASE') {
      const ent = this.getEntitlements(order.userId)
      if (!ent.purchasedArticleIds.includes(order.targetId)) {
        ent.purchasedArticleIds.push(order.targetId)
      }
    } else if (order.orderType === 'AD_CAMPAIGN') {
      const booking = this.state.bookings.find((b) => b.id === order.targetId)
      if (booking) {
        booking.paymentStatus = 'PAID'
        booking.updatedAt = new Date().toISOString()
        // Check if eligible to be LIVE (Payment PAID + Creative APPROVED + within date)
        const campaign = this.state.campaigns.find((c) => c.bookingId === booking.id)
        const hasApprovedCreative = campaign?.creatives.some((cr) => cr.status === 'APPROVED')
        if (hasApprovedCreative) {
          booking.deliveryStatus = 'LIVE'
          if (campaign) campaign.status = 'ACTIVE'
        } else {
          booking.deliveryStatus = 'ELIGIBLE'
        }
      }
    }

    // Add to General Ledger
    const newLedger: GeneralLedgerEntry = {
      id: `LED-${Date.now()}`,
      entryCode: `BT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      referenceType: 'ORDER',
      referenceCode: order.orderCode,
      description: `Thu tiền đơn hàng ${order.orderCode} (${order.targetTitle})`,
      entryType: 'CREDIT',
      amount: order.finalAmount,
      createdBy: verifiedBy || 'Cổng thanh toán tự động',
    }
    this.state.ledger = [newLedger, ...this.state.ledger]

    this.logAudit('THANH TOÁN THÀNH CÔNG', 'FINANCE', `Đơn hàng ${order.orderCode} giá trị ${order.finalAmount} VND đã được xác nhận thanh toán.`)
    this.persist()
    return order
  }

  // --- Refunds ---
  public proposeRefund(
    orderId: string,
    refundAmount: number,
    reason: string,
    affectedBenefit: string,
    evidenceUrl?: string
  ): RefundRequest {
    const order = this.state.orders.find((o) => o.id === orderId)
    if (!order) throw new Error('Không tìm thấy đơn hàng')
    if (refundAmount > order.finalAmount) {
      throw new Error('Số tiền hoàn không thể vượt quá tổng tiền đã thu')
    }

    const currentUser = this.getCurrentUser()
    const newRefund: RefundRequest = {
      id: `REF-${Date.now()}`,
      orderId: order.id,
      orderCode: order.orderCode,
      transactionId: order.paymentAttempts[0]?.transactionCode || `TX-${order.id}`,
      userId: order.userId,
      userName: order.userName,
      userEmail: order.userEmail,
      originalAmount: order.finalAmount,
      refundAmount,
      isPartial: refundAmount < order.finalAmount,
      reason,
      evidenceUrl,
      status: 'UNDER_REVIEW',
      affectedBenefit,
      requestedAt: new Date().toISOString(),
      proposedBy: currentUser.id,
      proposedByName: currentUser.name,
      proposedNotes: `Đề xuất hoàn bởi ${currentUser.name}`,
    }

    this.state.refunds = [newRefund, ...this.state.refunds]
    this.logAudit('ĐỀ XUẤT HOÀN TIỀN', 'FINANCE', `Tạo đề xuất hoàn tiền ${refundAmount} VND cho đơn hàng ${order.orderCode}`)
    this.persist()
    return newRefund
  }

  public reviewRefund(
    refundId: string,
    approved: boolean,
    reviewNotes: string
  ): RefundRequest {
    const refund = this.state.refunds.find((r) => r.id === refundId)
    if (!refund) throw new Error('Không tìm thấy yêu cầu hoàn tiền')

    const currentUser = this.getCurrentUser()
    // Strict separation of duty: Creator cannot approve their own proposal!
    if (refund.proposedBy === currentUser.id) {
      throw new Error('Nguyên tắc kiểm soát tài chính: Người lập đề xuất không được tự phê duyệt yêu cầu của chính mình!')
    }

    refund.reviewedBy = currentUser.id
    refund.reviewedByName = currentUser.name
    refund.reviewNotes = reviewNotes
    refund.resolvedAt = new Date().toISOString()

    if (approved) {
      refund.status = 'SUCCEEDED'
      // Revoke benefits
      const order = this.state.orders.find((o) => o.id === refund.orderId)
      if (order) {
        order.paymentStatus = refund.isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED'
        if (order.orderType === 'SUBSCRIPTION') {
          const ent = this.getEntitlements(order.userId)
          ent.hasSubscription = false
          ent.subscriptionPlanName = undefined
          ent.subscriptionExpiresAt = null
        } else if (order.orderType === 'ARTICLE_PURCHASE') {
          const ent = this.getEntitlements(order.userId)
          ent.purchasedArticleIds = ent.purchasedArticleIds.filter((id) => id !== order.targetId)
        } else if (order.orderType === 'AD_CAMPAIGN') {
          const booking = this.state.bookings.find((b) => b.id === order.targetId)
          if (booking) {
            booking.paymentStatus = refund.isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED'
            if (!refund.isPartial) {
              booking.deliveryStatus = 'PAUSED'
            }
          }
        }
      }

      // Add Debit Entry to Ledger
      const newLedger: GeneralLedgerEntry = {
        id: `LED-${Date.now()}`,
        entryCode: `BT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        referenceType: 'REFUND',
        referenceCode: refund.id,
        description: `Hoàn tiền yêu cầu ${refund.id} (${refund.orderCode}) - ${refund.reason}`,
        entryType: 'DEBIT',
        amount: refund.refundAmount,
        createdBy: currentUser.name,
      }
      this.state.ledger = [newLedger, ...this.state.ledger]
      this.logAudit('PHÊ DUYỆT HOÀN TIỀN', 'FINANCE', `Phê duyệt hoàn tiền ${refund.refundAmount} VND cho yêu cầu ${refund.id}`)
    } else {
      refund.status = 'REJECTED'
      this.logAudit('TỪ CHỐI HOÀN TIỀN', 'FINANCE', `Từ chối yêu cầu hoàn tiền ${refund.id}. Lý do: ${reviewNotes}`)
    }

    this.persist()
    return refund
  }

  // --- Editorial & Articles ---
  public createArticle(articleData: Partial<Article>): Article {
    const currentUser = this.getCurrentUser()
    const newArticle: Article = {
      id: `art-${Date.now()}`,
      title: articleData.title || 'Bài viết chưa có tiêu đề',
      slug: (articleData.title || 'bai-viet')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, ''),
      sapo: articleData.sapo || '',
      content: articleData.content || '',
      previewContent: articleData.previewContent || (articleData.sapo || '').slice(0, 150),
      authorId: currentUser.id,
      authorName: currentUser.name,
      categoryId: articleData.categoryId || 'cat-thoi-su',
      categoryName: articleData.categoryName || 'Thời sự & Chính trị',
      categorySlug: articleData.categorySlug || 'thoi-su',
      coverImage: articleData.coverImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1000&auto=format&fit=crop&q=80',
      tags: articleData.tags || ['Tin tức'],
      isPremium: !!articleData.isPremium,
      price: articleData.isPremium ? (articleData.price || 15000) : 0,
      status: 'DRAFT',
      views: 0,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readTimeMinutes: Math.max(2, Math.ceil((articleData.content?.length || 500) / 400)),
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          title: articleData.title || 'Bản thảo đầu tiên',
          sapo: articleData.sapo || '',
          content: articleData.content || '',
          changelog: 'Khởi tạo bài viết',
          createdAt: new Date().toISOString(),
          createdBy: currentUser.name,
        }
      ]
    }

    this.state.articles = [newArticle, ...this.state.articles]
    this.logAudit('TẠO BÀI VIẾT MỚI', 'EDITORIAL', `Tạo bài viết ${newArticle.title}`)
    this.persist()
    return newArticle
  }

  public updateArticle(id: string, updates: Partial<Article>, changelog?: string): Article {
    const article = this.state.articles.find((a) => a.id === id)
    if (!article) throw new Error('Không tìm thấy bài viết')

    const currentUser = this.getCurrentUser()
    const nextVersion = (article.currentVersion || 1) + 1

    if (changelog && updates.content) {
      if (!article.versions) article.versions = []
      article.versions.push({
        versionNumber: nextVersion,
        title: updates.title || article.title,
        sapo: updates.sapo || article.sapo,
        content: updates.content || article.content || '',
        changelog,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name,
      })
      article.currentVersion = nextVersion
    }

    Object.assign(article, updates)
    article.updatedAt = new Date().toISOString()
    this.logAudit('CẬP NHẬT BÀI VIẾT', 'EDITORIAL', `Cập nhật bài viết ${article.id} lên phiên bản ${article.currentVersion}`)
    this.persist()
    return article
  }

  public changeArticleStatus(id: string, newStatus: Article['status'], reviewNotes?: string): Article {
    const article = this.state.articles.find((a) => a.id === id)
    if (!article) throw new Error('Không tìm thấy bài viết')

    // Rule: Cannot publish an article that has not been approved!
    if (newStatus === 'PUBLISHED' && article.status !== 'APPROVED') {
      throw new Error('Quy chuẩn tòa soạn: Chỉ được xuất bản các bài viết đã qua bước duyệt (APPROVED)!')
    }

    article.status = newStatus
    article.updatedAt = new Date().toISOString()
    if (reviewNotes) article.reviewNotes = reviewNotes
    if (newStatus === 'PUBLISHED') {
      article.publishedAt = new Date().toISOString()
    }

    this.logAudit('THAY ĐỔI TRẠNG THÁI BÀI VIẾT', 'EDITORIAL', `Đổi trạng thái bài viết ${article.id} sang ${newStatus}`)
    this.persist()
    return article
  }

  // --- Advertising & Creatives ---
  public createBooking(data: {
    slotId: string
    startDate: string
    endDate: string
    daysCount: number
    companyName: string
    contactPerson: string
    contactPhone: string
    contactEmail: string
  }): AdBooking {
    const slot = this.state.adSlots.find((s) => s.id === data.slotId)
    if (!slot) throw new Error('Không tìm thấy vị trí quảng cáo')

    const currentUser = this.getCurrentUser()
    const standardPrice = slot.pricePerDay * data.daysCount
    const finalPrice = standardPrice

    const newBooking: AdBooking = {
      id: `BK-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      advertiserId: currentUser.id,
      companyName: data.companyName || currentUser.companyName || 'Doanh nghiệp đối tác',
      contactPerson: data.contactPerson || currentUser.name,
      contactPhone: data.contactPhone || currentUser.phone || '0900000000',
      contactEmail: data.contactEmail || currentUser.email,
      slotId: slot.id,
      slotName: slot.name,
      slotCode: slot.code,
      startDate: data.startDate,
      endDate: data.endDate,
      daysCount: data.daysCount,
      standardPrice,
      finalPrice,
      bookingStatus: 'SUBMITTED', // Awaiting quote
      paymentStatus: 'UNPAID',
      deliveryStatus: 'NOT_STARTED',
      termsAccepted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.state.bookings = [newBooking, ...this.state.bookings]
    this.logAudit('GỬI BOOKING QUẢNG CÁO', 'ADVERTISING', `Booking mới ${newBooking.id} tại vị trí ${slot.name}`)
    this.persist()
    return newBooking
  }

  public sendQuotation(bookingId: string, finalPrice: number, discountPercent: number, quotationNotes: string): AdBooking {
    const booking = this.state.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new Error('Không tìm thấy booking')

    booking.finalPrice = finalPrice
    booking.discountPercent = discountPercent
    booking.quotationNotes = quotationNotes
    booking.bookingStatus = 'QUOTED'
    booking.updatedAt = new Date().toISOString()

    this.logAudit('GỬI BÁO GIÁ QUẢNG CÁO', 'ADVERTISING', `Gửi báo giá cho booking ${booking.id}: ${finalPrice} VND`)
    this.persist()
    return booking
  }

  public acceptQuotation(bookingId: string): AdBooking {
    const booking = this.state.bookings.find((b) => b.id === bookingId)
    if (!booking) throw new Error('Không tìm thấy booking')

    booking.bookingStatus = 'CONFIRMED'
    booking.termsAccepted = true
    booking.updatedAt = new Date().toISOString()

    // Auto create campaign linked to this booking
    const newCamp: AdCampaign = {
      id: `CAMP-${Math.floor(100 + Math.random() * 900)}`,
      bookingId: booking.id,
      advertiserId: booking.advertiserId,
      companyName: booking.companyName,
      slotId: booking.slotId,
      slotName: booking.slotName,
      name: `Chiến dịch quảng cáo ${booking.slotName}`,
      startDate: booking.startDate,
      endDate: booking.endDate,
      totalBudget: booking.finalPrice,
      status: 'PENDING_APPROVAL',
      creatives: [],
      impressions: 0,
      clicks: 0,
      ctr: 0,
      dailyStats: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    booking.campaignId = newCamp.id
    this.state.campaigns = [newCamp, ...this.state.campaigns]

    this.logAudit('CHẤP NHẬN BÁO GIÁ QUẢNG CÁO', 'ADVERTISING', `Khách hàng chấp nhận báo giá booking ${booking.id}`)
    this.persist()
    return booking
  }

  public uploadCreative(campaignId: string, creativeData: {
    title: string
    imageUrl: string
    targetUrl: string
    width: number
    height: number
    fileSizeKb: number
  }): AdCreative {
    const campaign = this.state.campaigns.find((c) => c.id === campaignId)
    if (!campaign) throw new Error('Không tìm thấy chiến dịch')

    const nextVer = campaign.creatives.length + 1
    const newCreative: AdCreative = {
      id: `CR-${campaign.id}-v${nextVer}`,
      campaignId,
      versionNumber: nextVer,
      title: creativeData.title,
      imageUrl: creativeData.imageUrl,
      targetUrl: creativeData.targetUrl,
      width: creativeData.width,
      height: creativeData.height,
      fileSizeKb: creativeData.fileSizeKb,
      status: 'IN_REVIEW', // Needs review
      uploadedAt: new Date().toISOString(),
      isActiveServing: false, // Not active until approved
    }

    campaign.creatives.push(newCreative)
    campaign.updatedAt = new Date().toISOString()
    this.logAudit('TẢI LÊN CREATIVE MỚI', 'ADVERTISING', `Tải banner phiên bản ${nextVer} cho chiến dịch ${campaign.id}`)
    this.persist()
    return newCreative
  }

  public reviewCreative(creativeId: string, approved: boolean, notes: string): AdCreative {
    let foundCreative: AdCreative | null = null
    let parentCampaign: AdCampaign | null = null

    for (const camp of this.state.campaigns) {
      const cr = camp.creatives.find((c) => c.id === creativeId)
      if (cr) {
        foundCreative = cr
        parentCampaign = camp
        break
      }
    }

    if (!foundCreative || !parentCampaign) throw new Error('Không tìm thấy creative')

    const currentUser = this.getCurrentUser()
    foundCreative.status = approved ? 'APPROVED' : 'CHANGES_REQUESTED'
    foundCreative.reviewNotes = notes
    foundCreative.reviewedAt = new Date().toISOString()
    foundCreative.reviewedBy = currentUser.name

    if (approved) {
      // Deactivate other versions, activate this version!
      parentCampaign.creatives.forEach((c) => (c.isActiveServing = false))
      foundCreative.isActiveServing = true
      parentCampaign.activeCreativeVersion = foundCreative.versionNumber

      // If booking is PAID, it can now become LIVE!
      const booking = this.state.bookings.find((b) => b.id === parentCampaign?.bookingId)
      if (booking && booking.paymentStatus === 'PAID') {
        booking.deliveryStatus = 'LIVE'
        parentCampaign.status = 'ACTIVE'
      }
    }

    this.logAudit('KIỂM DUYỆT CREATIVE', 'ADVERTISING', `Kiểm duyệt banner ${creativeId}: ${approved ? 'ĐÃ DUYỆT' : 'YÊU CẦU SỬA'}`)
    this.persist()
    return foundCreative
  }
}

export const mockStore = new MockStore()
