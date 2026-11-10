import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  FileText,
  Calendar,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  Building,
  Users,
} from 'lucide-react'
import { editorialApi } from '../api'
import type { EditorialDashboardOverview } from '../types'
import { formatCurrency, formatDateTime } from '@/lib/format'

export const BusinessOperationDashboardPage: React.FC = () => {
  const [data, setData] = useState<EditorialDashboardOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await editorialApi.getDashboardOverview()
      setData(res)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu bảng điều khiển kinh doanh')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800">
              Màn II.2.10 • UC015, UC028
            </span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              Doanh Thu Kép B2B + B2C
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Bảng Điều Khiển Vận Hành Tòa Soạn & Kinh Doanh
          </h1>
          <p className="text-sm text-slate-500">
            Báo cáo tổng hợp Doanh thu kép B2B + B2C, giám sát tỷ lệ lấp đầy kho quảng cáo và hàng đợi xử lý khẩn cấp
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold">Lỗi tải dữ liệu</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            ✕
          </button>
        </div>
      )}

      {isLoading && !data ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-slate-400">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary-600" />
          <p className="mt-3 text-sm">Đang tính toán doanh thu kép và chỉ số vận hành...</p>
        </div>
      ) : data ? (
        <>
          {/* SECTION 1: HYBRID REVENUE OVERVIEW (PENDING FINANCE API) */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Mô Hình Doanh Thu Kép (Hybrid Revenue B2B + B2C)
                    </h2>
                    <span className="inline-flex items-center rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                      Đang đồng bộ API Finance (Rule 17)
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                    Chỉ số doanh thu thực thu (B2B quảng cáo sau thanh toán, B2C gói đọc, B2C bán lẻ trừ hoàn tiền REFUND)
                    tạm thời được ẩn tại Tòa soạn để chờ kết nối qua API tập trung của Module Kế toán (SV4).
                    Hệ thống đã loại bỏ cơ chế công nợ quảng cáo B2B.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <Link
                  to="/backoffice/editorial/bookings"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <Building className="h-3.5 w-3.5 text-primary-700" />
                  Xem Bookings B2B
                </Link>
                <Link
                  to="/backoffice/editorial/contracts"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-800 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-900 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Quản lý Hợp đồng
                </Link>
              </div>
            </div>
          </div>

          {/* SECTION 2: AD INVENTORY OCCUPANCY RATE */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary-700" />
                  Tỷ Lệ Lấp Đầy Kho Quảng Cáo (Ad Slot Occupancy Rate)
                </h2>
                <p className="text-xs text-slate-500">
                  Kiểm soát sức chứa, tình trạng kín chỗ độc quyền và luân phiên theo thời gian thực
                </p>
              </div>
              <Link
                to="/backoffice/editorial/calendar"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline"
              >
                Lịch tồn kho slot (UC017) <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {data.slotOccupancies.map((slot) => {
                const isFull = slot.occupancyPercentage >= 100
                const isNearFull = slot.occupancyPercentage >= 70 && !isFull

                return (
                  <div
                    key={slot.slotCode}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{slot.slotName}</div>
                        <div className="font-mono text-xs text-slate-500">{slot.slotCode}</div>
                      </div>
                      {isFull ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                          HẾT CHỖ (FULL)
                        </span>
                      ) : isNearFull ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                          GẦN ĐẦY
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                          CÒN TRỐNG
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-baseline justify-between text-xs text-slate-600">
                      <span>Kích thước: {slot.dimensions}</span>
                      <span className="font-semibold">{formatCurrency(slot.basePrice)}/ngày</span>
                    </div>

                    {/* Occupancy bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600">
                          Đang chạy: {slot.activeCampaignsCount}/{slot.capacity}
                        </span>
                        <span
                          className={
                            isFull ? 'text-rose-600 font-bold' : isNearFull ? 'text-amber-600' : 'text-emerald-600'
                          }
                        >
                          {slot.occupancyPercentage}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-rose-500' : isNearFull ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, slot.occupancyPercentage)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION 3: URGENT ACTION QUEUE */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  Hàng Đợi Công Việc Khẩn Cấp Cần Xử Lý (Urgent Action Queue)
                </h2>
                <p className="text-xs text-slate-500">
                  Tập trung giải quyết các bài viết, báo giá và banner đang ách tắc quy trình
                </p>
              </div>

              {/* 4 Shortcut badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/backoffice/editorial/articles"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <FileText className="h-3.5 w-3.5 text-primary-700" />
                  Bài viết chờ: <span className="font-bold text-primary-900">{data.pendingArticlesCount}</span>
                </Link>

                <Link
                  to="/backoffice/editorial/bookings"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-600" />
                  Booking chờ: <span className="font-bold text-amber-900">{data.pendingBookingsCount}</span>
                </Link>

                <Link
                  to="/backoffice/editorial/creatives"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-rose-600" />
                  Banner chờ: <span className="font-bold text-rose-900">{data.pendingCreativesCount}</span>
                </Link>

                <Link
                  to="/backoffice/editorial/comments"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-cyan-600" />
                  Bình luận chờ: <span className="font-bold text-cyan-900">{data.pendingCommentsCount}</span>
                </Link>
              </div>
            </div>

            {/* List of urgent action items */}
            <div className="mt-4 divide-y divide-slate-100">
              {data.urgentItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">Tất cả hàng đợi đã được xử lý xong!</p>
                  <p className="text-xs text-slate-500">Không có công việc nào tồn đọng cần phê duyệt</p>
                </div>
              ) : (
                data.urgentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between hover:bg-slate-50/60 rounded-lg px-2"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-800'
                            : item.priority === 'HIGH'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.priority === 'URGENT' ? 'KHẨN CẤP' : item.priority === 'HIGH' ? 'ƯU TIÊN' : 'BÌNH THƯỜNG'}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 pl-12 md:pl-0">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(item.createdAt)}
                      </span>
                      <Link
                        to={item.link}
                        className="inline-flex items-center gap-1 rounded-md bg-primary-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-primary-800"
                      >
                        Xử lý ngay <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
