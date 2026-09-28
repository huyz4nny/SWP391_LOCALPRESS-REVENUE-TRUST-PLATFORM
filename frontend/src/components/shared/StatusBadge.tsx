import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileEdit,
  Eye,
  Send,
  Ban,
  PauseCircle,
  RotateCcw,
} from 'lucide-react'

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

export function StatusBadge({ type, status, className }: StatusBadgeProps) {
  // 1. Article Status
  if (type === 'article') {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge variant="secondary" className={className}>
            <FileEdit className="w-3 h-3 mr-1 text-slate-500" /> Bản nháp
          </Badge>
        )
      case 'IN_REVIEW':
        return (
          <Badge variant="info" className={className}>
            <Clock className="w-3 h-3 mr-1" /> Chờ duyệt
          </Badge>
        )
      case 'CHANGES_REQUESTED':
        return (
          <Badge variant="warning" className={className}>
            <AlertCircle className="w-3 h-3 mr-1" /> Cần sửa
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge variant="info" className={className}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã duyệt
          </Badge>
        )
      case 'SCHEDULED':
        return (
          <Badge variant="secondary" className={className}>
            <Clock className="w-3 h-3 mr-1 text-primary-700" /> Đã lên lịch
          </Badge>
        )
      case 'PUBLISHED':
        return (
          <Badge variant="success" className={className}>
            <Eye className="w-3 h-3 mr-1" /> Đã xuất bản
          </Badge>
        )
      case 'UNPUBLISHED':
        return (
          <Badge variant="destructive" className={className}>
            <Ban className="w-3 h-3 mr-1" /> Đã hạ bài
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 2. Booking Status
  if (type === 'booking') {
    switch (status) {
      case 'SUBMITTED':
        return (
          <Badge variant="warning" className={className}>
            <Send className="w-3 h-3 mr-1" /> Chờ báo giá
          </Badge>
        )
      case 'QUOTED':
        return (
          <Badge variant="info" className={className}>
            <Clock className="w-3 h-3 mr-1" /> Đã báo giá (Chờ khách)
          </Badge>
        )
      case 'CONFIRMED':
        return (
          <Badge variant="success" className={className}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã xác nhận
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive" className={className}>
            <XCircle className="w-3 h-3 mr-1" /> Từ chối
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge variant="secondary" className={className}>
            <Ban className="w-3 h-3 mr-1" /> Đã hủy
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 3. Payment Status
  if (type === 'payment') {
    switch (status) {
      case 'UNPAID':
        return (
          <Badge variant="outline" className={className}>
            Chưa thanh toán
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="warning" className={className}>
            <Clock className="w-3 h-3 mr-1" /> Chờ thanh toán
          </Badge>
        )
      case 'PROCESSING':
        return (
          <Badge variant="info" className={className}>
            <Clock className="w-3 h-3 mr-1 animate-spin" /> Đang xác minh
          </Badge>
        )
      case 'PAID':
      case 'SUCCESS':
        return (
          <Badge variant="success" className={className}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã thanh toán
          </Badge>
        )
      case 'FAILED':
      case 'EXPIRED':
        return (
          <Badge variant="destructive" className={className}>
            <XCircle className="w-3 h-3 mr-1" /> Thất bại
          </Badge>
        )
      case 'REFUNDED':
        return (
          <Badge variant="destructive" className={className}>
            <RotateCcw className="w-3 h-3 mr-1" /> Đã hoàn tiền
          </Badge>
        )
      case 'PARTIALLY_REFUNDED':
        return (
          <Badge variant="warning" className={className}>
            <RotateCcw className="w-3 h-3 mr-1" /> Hoàn một phần
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 4. Delivery Status
  if (type === 'delivery') {
    switch (status) {
      case 'NOT_STARTED':
        return (
          <Badge variant="secondary" className={className}>
            Chưa bắt đầu
          </Badge>
        )
      case 'ELIGIBLE':
        return (
          <Badge variant="info" className={className}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đủ điều kiện phát
          </Badge>
        )
      case 'LIVE':
        return (
          <Badge variant="success" className="bg-emerald-600 text-white font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white mr-1.5 inline-block"></span> ĐANG PHÁT (LIVE)
          </Badge>
        )
      case 'PAUSED':
        return (
          <Badge variant="warning" className={className}>
            <PauseCircle className="w-3 h-3 mr-1" /> Tạm dừng
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className={className}>
            Đã kết thúc
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 5. Creative Status
  if (type === 'creative') {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Bản nháp</Badge>
      case 'IN_REVIEW':
        return (
          <Badge variant="warning" className={className}>
            <Clock className="w-3 h-3 mr-1" /> Chờ duyệt banner
          </Badge>
        )
      case 'CHANGES_REQUESTED':
        return (
          <Badge variant="destructive" className={className}>
            <AlertCircle className="w-3 h-3 mr-1" /> Cần sửa banner
          </Badge>
        )
      case 'APPROVED':
        return (
          <Badge variant="success" className={className}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Banner đã duyệt
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 6. Refund Status
  if (type === 'refund') {
    switch (status) {
      case 'REQUESTED':
      case 'UNDER_REVIEW':
        return (
          <Badge variant="warning" className={className}>
            <Clock className="w-3 h-3 mr-1" /> Chờ trưởng phòng duyệt
          </Badge>
        )
      case 'APPROVED':
      case 'SUCCEEDED':
        return (
          <Badge variant="success" className={className}>
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã hoàn tất
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="destructive" className={className}>
            <XCircle className="w-3 h-3 mr-1" /> Từ chối hoàn
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return <Badge variant="secondary">{status}</Badge>
}
