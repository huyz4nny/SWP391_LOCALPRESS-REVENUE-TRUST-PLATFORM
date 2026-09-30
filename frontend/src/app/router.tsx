import React from 'react'
import { createBrowserRouter, Navigate, Link } from 'react-router-dom'
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
  CheckoutPage,
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
} from '@/features/editorial'

// Finance
import {
  FinanceDashboard,
  OrderListPage,
  OrderDetailPage,
  RefundManagementPage,
  ReconciliationPage,
  GeneralLedgerPage,
} from '@/features/finance'

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
const EDITORIAL_ROLES: UserRole[] = ['EDITOR', 'REVIEWER', 'AUTHOR', 'SYSTEM_ADMIN']
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
      { path: 'checkout/:orderId', element: <CheckoutPage /> },
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

      // Tòa Soạn & Biên Tập (SV2: Editor / Reviewer / Author / Admin)
      {
        path: 'editorial',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <ArticleListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/articles',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <ArticleListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/articles/new',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
            <ArticleEditorPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'editorial/articles/:id/edit',
        element: (
          <ProtectedRoute allowedRoles={EDITORIAL_ROLES} subsystemName="Tòa Soạn & Biên Tập (SV2)">
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
