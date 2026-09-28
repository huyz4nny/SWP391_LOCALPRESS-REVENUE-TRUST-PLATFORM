export type ArticleStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'UNPUBLISHED'

export interface ArticleVersion {
  versionNumber: number
  title: string
  sapo: string
  content: string
  changelog: string
  createdAt: string
  createdBy: string
}

export interface Article {
  id: string
  title: string
  slug: string
  sapo: string
  content?: string // Only sent to authorized readers
  previewContent: string // Sent to free users if Premium
  authorId: string
  authorName: string
  categoryId: string
  categoryName: string
  categorySlug: string
  coverImage: string
  tags: string[]
  isPremium: boolean
  price: number // Single article price if premium (e.g. 15.000 VND)
  status: ArticleStatus
  reviewNotes?: string
  views: number
  publishedAt: string | null
  scheduledFor?: string | null
  createdAt: string
  updatedAt: string
  readTimeMinutes: number
  currentVersion: number
  versions?: ArticleVersion[]
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  articleCount: number
  iconName?: string
  isFeatured?: boolean
}

export interface Comment {
  id: string
  articleId: string
  articleTitle?: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  likeCount: number
  reported: boolean
  reportReason?: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  code: string
  price: number
  durationDays: number
  description: string
  features: string[]
  isPopular?: boolean
  isActive: boolean
}

export interface DeviceSession {
  id: string
  deviceName: string
  browser: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

export interface ReaderEntitlement {
  userId: string
  hasSubscription: boolean
  subscriptionPlanId?: string
  subscriptionPlanName?: string
  subscriptionExpiresAt?: string | null
  purchasedArticleIds: string[]
  bookmarkedArticleIds: string[]
  readingHistory: { articleId: string; articleTitle: string; slug: string; readAt: string }[]
  followedCategoryIds: string[]
  activeDevices: DeviceSession[]
}
