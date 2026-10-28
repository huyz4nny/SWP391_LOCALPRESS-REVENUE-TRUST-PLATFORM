import React from 'react'
import { createBrowserRouter, Navigate, Link, useParams } from 'react-router-dom'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { UserRole, PERMISSION_CHECKERS } from '@/app/config'
import { mockStore } from '@/mocks/store'

// Layouts
import { PublicLayout } from '@/layouts/PublicLayout'
import { ReaderAccountLayout } from '@/layouts/ReaderAccountLayout'
import { AdvertiserLayout } from '@/layouts/AdvertiserLayout'
import { BackofficeLayout } from '@/layouts/BackofficeLayout'

// Identity
import { LoginPage, RegisterPage, ForgotPasswordPage } from '@/features/identity'

// Reader
import {
  HomePage,
  CategoryPage,
  ArticleDetailPage,
  SearchPage,
  PremiumPlansPage,
  PaymentResultPage,
  ReaderAccountPage,
  ReaderLibraryPage,
  ReaderBookmarksPage,
  ReaderHistoryPage,
  ReaderSubscriptionPage,
  ReaderOrdersPage,
  ReaderDevicesPage,
  ReaderSupportPage,
} from '@/features/reader'

// Advertising
import {
  AdvertiserDashboard,
  AdSlotsExplorerPage,
  CompanyProfilePage,
  NewBookingPage,
  BookingListPage,
  BookingDetailPage,
  CampaignDetailPage,
  AdvertiserBillingPage,
} from '@/features/advertising'

// Editorial
import {
  ArticleListPage,
  ArticleEditorPage,
  BookingManagementPage,
  CreativeReviewPage,
  CommentModerationPage,
  AdvertisingInventoryCalendarPage,
} from '@/features/editorial'

// Finance
import {
  FinanceDashboard,
  OrderListPage,
  OrderDetailPage,
  RefundManagementPage,
  ReconciliationPage,
  GeneralLedgerPage,
  PaymentPage,
  TopUpPage,
  WalletPage,
  PaymentComplaintPage,
  ComplaintQueuePage,
  SepayLogPage,
} from '@/features/finance'

/** Link cũ /checkout/:orderId -> trang thanh toán chung của SV4 */
function LegacyCheckoutRedirect() {
  const { orderId } = useParams<{ orderId: string }>()
  const order = mockStore.getState().orders.find((o) => o.id === orderId)
  return <Navigate to={`/payment/${order?.orderCode ?? orderId}`} replace />
}

// Admin
import {
  AdminDashboard,
  UserManagementPage,
  PaywallConfigPage,
  AdDeliveryMonitorPage,
  AuditLogsPage,
} from '@/features/administration'

import {
  ArticleEditorPage as ContentArticleEditorPage,
} from '@/features/content/pages/ArticleEditorPage'

function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-4">
      <h1 className="font-serif text-5xl font-black text-primary-950">404</h1>
      <h2 className="text-lg font-bold text-stone-800">Trang không tồn tại</h2>
      <p className="text-xs text-stone-500">
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được chuyển sang vị trí mới.
      </p>
      <Link
        to="/"
        className="inline-block bg-primary-900 text-white text-xs font-bold px-4 py-2 rounded-lg"
      >
        Về trang chủ LocalPress
      </Link>
    </div>
  )
}

// Role permission groups for backoffice routing
const ARTICLE_LIST_ROLES: UserRole[] = ['AUTHOR', 'EDITOR', 'REVIEWER', 'SYSTEM_ADMIN']
const ARTICLE_WRITING_ROLES: UserRole[] = ['AUTHOR', 'EDITOR', 'SYSTEM_ADMIN']
const EDITORIAL_ROLES: UserRole[] = ['EDITOR', 'REVIEWER', 'SYSTEM_ADMIN']
const FINANCE_ROLES: UserRole[] = ['ACCOUNTANT', 'FINANCE_STAFF', 'FINANCE_MANAGER', 'STAFF', 'SYSTEM_ADMIN']
const ADMIN_ROLES: UserRole[] = ['SYSTEM_ADMIN']

function BackofficeIndexRedirect() {
  const currentUser = mockStore.getCurrentUser()
  const target = PERMISSION_CHECKERS.getDefaultBackofficeRoute(currentUser.role)
  return <Navigate to={target} replace />
}

export const router = createBrowserRouter([
  {
    path: '/content/articles/new',
    element: <ContentArticleEditorPage />,
  },
  {
    path: '/content/articles/:id',
    element: <ContentArticleEditorPage />,
  },

  // 1. Public Reader Routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'categories/:slug', element: <CategoryPage /> },
      { path: 'category/:slug', element: <CategoryPage /> },
      { path: 'articles/:slug', element: <ArticleDetailPage /> },
      { path: 'article/:slug', element: <ArticleDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'premium', element: <PremiumPlansPage /> },
      // Trang thanh toán chung & Ví LocalPress (SV4). CheckoutPage cũ của SV3 không còn route, chuyển hướng sang /payment.
      { path: 'checkout/:orderId', element: <LegacyCheckoutRedirect /> },
      { path: 'payment/:orderCode', element: <PaymentPage /> },
      { path: 'wallet', element: <WalletPage /> },
      { path: 'wallet/topup', element: <TopUpPage /> },
      { path: 'wallet/complaints', element: <PaymentComplaintPage /> },
      { path: 'payments/:paymentId', element: <PaymentResultPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // 2. Reader Account Routes
  {
    path: '/account',
    element: <ReaderAccountLayout />,
    children: [
      { index: true, element: <ReaderAccountPage /> },
      { path: 'library', element: <ReaderLibraryPage /> },
      { path: 'bookmarks', element: <ReaderBookmarksPage /> },
      { path: 'history', element: <ReaderHistoryPage /> },
      { path: 'subscription', element: <ReaderSubscriptionPage /> },
      { path: 'orders', element: <ReaderOrdersPage /> },
      { path: 'devices', element: <ReaderDevicesPage /> },
      { path: 'support', element: <ReaderSupportPage /> },
    ],
  },

  // 3. Advertiser Portal Routes
  {
    path: '/advertiser',
    element: <AdvertiserLayout />,
    children: [
      { index: true, element: <AdvertiserDashboard /> },
      { path: 'slots', element: <AdSlotsExplorerPage /> },
      { path: 'profile', element: <CompanyProfilePage /> },
      { path: 'bookings/new', element: <NewBookingPage /> },
      { path: 'bookings', element: <BookingListPage /> },
      { path: 'bookings/:id', element: <BookingDetailPage /> },
      { path: 'campaigns/:id', element: <CampaignDetailPage /> },
      { path: 'billing', element: <AdvertiserBillingPage /> },
    ],
  },

  // 4. Backoffice Internal Routes (Phân quyền bảo vệ theo phân hệ)
  {
    path: '/backoffice',
    element: <BackofficeLayout />,
    children: [
      // Điều hướng tự động về phân hệ đúng thẩm quyền của vai trò hiện tại
      { index: true, element: <BackofficeIndexRedirect /> },

      // Tòa Soạn & Biên Tập (SV2: Editor / Reviewer / Admin)
      {
        path: 'editorial',
        element: (
          <ProtectedRoute allowedRoles={ARTICLE_LIST_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <ArticleListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/articles',
        element: (
          <ProtectedRoute allowedRoles={ARTICLE_LIST_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <ArticleListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/articles/new',
        element: (
          <ProtectedRoute allowedRoles={ARTICLE_WRITING_ROLES} subsystemName="Soạn bài (SV5)">
            <ArticleEditorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/articles/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={ARTICLE_WRITING_ROLES} subsystemName="Soạn bài (SV5)">
            <ArticleEditorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/bookings',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <BookingManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/calendar',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <AdvertisingInventoryCalendarPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/creatives',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <CreativeReviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/comments',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <CommentModerationPage />
          </ProtectedRoute>
        ),
      },

      // Tài Chính & Kế Toán (SV4: Accountant / Finance Staff / Finance Manager / Admin)
      {
        path: 'finance',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <FinanceDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/orders',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <OrderListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/complaints',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <ComplaintQueuePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/orders/:id',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <OrderDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/refunds',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <RefundManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/reconciliation',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <ReconciliationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/sepay',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <SepayLogPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'finance/ledger',
        element: (
          <ProtectedRoute allowedRoles={FINANCE_ROLES} subsystemName="Tài Chính & Kế Toán (SV4)">
            <GeneralLedgerPage />
          </ProtectedRoute>
        ),
      },

      // Quản Trị Hệ Thống (SV5: System Admin duy nhất)
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={ADMIN_ROLES} subsystemName="Quản Trị Hệ Thống (SV5)">
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute allowedRoles={ADMIN_ROLES} subsystemName="Quản Trị Hệ Thống (SV5)">
            <UserManagementPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/paywall',
        element: (
          <ProtectedRoute allowedRoles={ADMIN_ROLES} subsystemName="Quản Trị Hệ Thống (SV5)">
            <PaywallConfigPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/delivery',
        element: (
          <ProtectedRoute allowedRoles={ADMIN_ROLES} subsystemName="Quản Trị Hệ Thống (SV5)">
            <AdDeliveryMonitorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/audit-logs',
        element: (
          <ProtectedRoute allowedRoles={ADMIN_ROLES} subsystemName="Quản Trị Hệ Thống (SV5)">
            <AuditLogsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])
