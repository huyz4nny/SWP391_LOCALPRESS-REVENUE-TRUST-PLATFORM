import React from 'react'
import { Badge, BadgeProps } from '@/components/ui/badge'

type StatusType =
  | 'article'
  | 'booking'
  | 'payment'
  | 'delivery'
  | 'creative'
  | 'refund'

interface StatusBadgeProps {
  type: StatusType
  status: string
  className?: string
}

type Variant = NonNullable<BadgeProps['variant']>

// Một pill cho mỗi trạng thái: nền nhạt + chữ đậm cùng sắc độ. Xám cho trạng thái trung tính,
// màu chỉ dùng khi trạng thái cần người xem chú ý (chờ xử lý, lỗi, hoàn tất).
const STATUS_MAP: Record<StatusType, Record<string, [string, Variant]>> = {
  article: {
    DRAFT: ['Bản nháp', 'secondary'],
    IN_REVIEW: ['Chờ duyệt', 'warning'],
    CHANGES_REQUESTED: ['Cần sửa', 'warning'],
    APPROVED: ['Đã duyệt', 'info'],
    SCHEDULED: ['Đã lên lịch', 'info'],
    PUBLISHED: ['Đã xuất bản', 'success'],
    UNPUBLISHED: ['Đã hạ bài', 'destructive'],
  },
  booking: {
    SUBMITTED: ['Chờ báo giá', 'warning'],
    QUOTED: ['Đã báo giá, chờ khách', 'info'],
    CONFIRMED: ['Đã xác nhận', 'success'],
    REJECTED: ['Từ chối', 'destructive'],
    CANCELLED: ['Đã hủy', 'secondary'],
  },
  payment: {
    UNPAID: ['Chưa thanh toán', 'outline'],
    PENDING: ['Chờ thanh toán', 'warning'],
    PROCESSING: ['Đang xác minh', 'info'],
    PAID: ['Đã thanh toán', 'success'],
    SUCCESS: ['Đã thanh toán', 'success'],
    FAILED: ['Thất bại', 'destructive'],
    EXPIRED: ['Hết hạn', 'secondary'],
    REFUNDED: ['Đã hoàn tiền', 'secondary'],
    PARTIALLY_REFUNDED: ['Hoàn một phần', 'warning'],
  },
  delivery: {
    NOT_STARTED: ['Chưa bắt đầu', 'secondary'],
    ELIGIBLE: ['Đủ điều kiện phát', 'info'],
    LIVE: ['Đang phát', 'success'],
    PAUSED: ['Tạm dừng', 'warning'],
    COMPLETED: ['Đã kết thúc', 'secondary'],
  },
  creative: {
    DRAFT: ['Bản nháp', 'secondary'],
    IN_REVIEW: ['Chờ duyệt banner', 'warning'],
    CHANGES_REQUESTED: ['Cần sửa banner', 'destructive'],
    APPROVED: ['Banner đã duyệt', 'success'],
  },
  refund: {
    REQUESTED: ['Chờ kế toán trưởng duyệt', 'warning'],
    PENDING: ['Chờ kế toán trưởng duyệt', 'warning'],
    UNDER_REVIEW: ['Chờ kế toán trưởng duyệt', 'warning'],
    APPROVED: ['Đã hoàn tất', 'success'],
    SUCCEEDED: ['Đã hoàn tất', 'success'],
    REJECTED: ['Từ chối hoàn', 'destructive'],
  },
}

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  const entry = STATUS_MAP[type]?.[status]
  if (!entry) return <Badge variant="secondary" className={className}>{status}</Badge>
  const [label, variant] = entry
  return (
    <Badge variant={variant} className={className}>
      {type === 'delivery' && status === 'LIVE' && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-positive" aria-hidden />
      )}
      {label}
    </Badge>
  )
}
