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
  | 'EDITOR'
  | 'REVIEWER'
  | 'FINANCE_STAFF'
  | 'FINANCE_MANAGER'
  | 'SYSTEM_ADMIN'

export const ROLE_LABELS: Record<UserRole, string> = {
  GUEST: 'Khách vãng lai',
  READER: 'Độc giả (Reader)',
  ADVERTISER: 'Nhà quảng cáo (B2B)',
  EDITOR: 'Biên tập viên / Phóng viên',
  REVIEWER: 'Thư ký tòa soạn / Kiểm duyệt viên',
  FINANCE_STAFF: 'Nhân viên kế toán / Thu ngân',
  FINANCE_MANAGER: 'Kế toán trưởng / Quản lý tài chính',
  SYSTEM_ADMIN: 'Quản trị viên hệ thống (Admin)',
}
