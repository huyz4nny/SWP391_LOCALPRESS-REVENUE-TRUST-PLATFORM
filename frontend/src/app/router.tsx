import React from 'react'
import { createBrowserRouter, Navigate, Link } from 'react-router-dom'

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

  // 4. Backoffice Internal Routes
  {
    path: '/backoffice',
    element: <BackofficeLayout />,
    children: [
      // Editorial (SV2)
      { path: 'editorial', element: <ArticleListPage /> },
      { path: 'editorial/articles', element: <ArticleListPage /> },
      { path: 'editorial/articles/new', element: <ArticleEditorPage /> },
      { path: 'editorial/articles/:id/edit', element: <ArticleEditorPage /> },
      { path: 'editorial/bookings', element: <BookingManagementPage /> },
      { path: 'editorial/creatives', element: <CreativeReviewPage /> },
      { path: 'editorial/comments', element: <CommentModerationPage /> },

      // Finance (SV4)
      { path: 'finance', element: <FinanceDashboard /> },
      { path: 'finance/orders', element: <OrderListPage /> },
      { path: 'finance/orders/:id', element: <OrderDetailPage /> },
      { path: 'finance/refunds', element: <RefundManagementPage /> },
      { path: 'finance/reconciliation', element: <ReconciliationPage /> },
      { path: 'finance/ledger', element: <GeneralLedgerPage /> },

      // Administration (SV5)
      { path: 'admin', element: <AdminDashboard /> },
      { path: 'admin/users', element: <UserManagementPage /> },
      { path: 'admin/paywall', element: <PaywallConfigPage /> },
      { path: 'admin/delivery', element: <AdDeliveryMonitorPage /> },
      { path: 'admin/audit-logs', element: <AuditLogsPage /> },
    ],
  },
])
