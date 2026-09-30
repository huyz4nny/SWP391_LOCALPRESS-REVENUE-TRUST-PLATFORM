/**
 * Application configuration
 */
export const APP_CONFIG = {
  appName: 'LocalPress',
  appSubTitle: 'Báo điện tử địa phương & Nền tảng Doanh thu tự chủ',
  version: '1.0.0-rc',
  locale: 'vi-VN',
  timezone: 'Asia/Ho_Chi_Minh',
  currency: 'VND',
  // Toggle between stateful mock API and real Spring Boot REST API
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  mockLatencyMs: 300, // realistic async network delay
}

export type UserRole =
  | 'GUEST'
  | 'READER'
  | 'ADVERTISER'
  | 'AUTHOR'          // Phóng viên / Tác giả viết bài (SV5 & SV2)
  | 'EDITOR'          // Biên tập viên duyệt bài, duyệt banner (SV2)
  | 'REVIEWER'        // Thư ký tòa soạn / Kiểm duyệt viên
  | 'STAFF'           // Nhân viên vận hành / CSKH (SV4 & SV2)
  | 'ACCOUNTANT'       // Kế toán viên & Đối soát ngân hàng (SV4)
  | 'FINANCE_STAFF'   // Nhân viên kế toán / Thu ngân (SV4)
  | 'FINANCE_MANAGER' // Kế toán trưởng duyệt hoàn tiền 4 mắt (SV4 Leader)
  | 'SYSTEM_ADMIN'    // Quản trị viên hệ thống (SV5)

export const ROLE_LABELS: Record<UserRole, string> = {
  GUEST: 'Khách vãng lai',
  READER: 'Độc giả (Reader - SV3)',
  ADVERTISER: 'Nhà quảng cáo (Advertiser B2B - SV1)',
  AUTHOR: 'Phóng viên / Tác giả (Author - SV5/SV2)',
  EDITOR: 'Biên tập viên tòa soạn (Editor - SV2)',
  REVIEWER: 'Thư ký tòa soạn (Reviewer - SV2)',
  STAFF: 'Nhân viên vận hành (Staff - SV4/SV2)',
  ACCOUNTANT: 'Kế toán viên & Đối soát (Accountant - SV4)',
  FINANCE_STAFF: 'Nhân viên kế toán (Finance Staff - SV4)',
  FINANCE_MANAGER: 'Kế toán trưởng / Duyệt 4 mắt (Finance Manager - SV4)',
  SYSTEM_ADMIN: 'Quản trị viên hệ thống (System Admin - SV5)',
}

/**
 * Phân quyền module chức năng (RBAC Granular Permission Checkers)
 */
export const PERMISSION_CHECKERS = {
  canAccessEditorial: (role: UserRole): boolean =>
    ['EDITOR', 'REVIEWER', 'AUTHOR', 'SYSTEM_ADMIN'].includes(role),

  canAccessFinance: (role: UserRole): boolean =>
    ['ACCOUNTANT', 'FINANCE_STAFF', 'FINANCE_MANAGER', 'STAFF', 'SYSTEM_ADMIN'].includes(role),

  canAccessAdmin: (role: UserRole): boolean =>
    role === 'SYSTEM_ADMIN',

  canAccessBackoffice: (role: UserRole): boolean =>
    ['EDITOR', 'REVIEWER', 'AUTHOR', 'ACCOUNTANT', 'FINANCE_STAFF', 'FINANCE_MANAGER', 'STAFF', 'SYSTEM_ADMIN'].includes(role),

  canApproveRefunds: (role: UserRole): boolean =>
    ['FINANCE_MANAGER', 'ACCOUNTANT', 'SYSTEM_ADMIN'].includes(role),

  canPublishArticles: (role: UserRole): boolean =>
    ['EDITOR', 'REVIEWER', 'SYSTEM_ADMIN'].includes(role),

  getDefaultBackofficeRoute: (role: UserRole): string => {
    if (['EDITOR', 'REVIEWER', 'AUTHOR'].includes(role)) {
      return '/backoffice/editorial/articles'
    }
    if (['ACCOUNTANT', 'FINANCE_STAFF', 'FINANCE_MANAGER', 'STAFF'].includes(role)) {
      return '/backoffice/finance'
    }
    return '/backoffice/admin'
  },
}
