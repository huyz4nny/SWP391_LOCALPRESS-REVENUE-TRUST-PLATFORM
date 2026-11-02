import React, { useEffect, useState, useMemo } from 'react'
import {
  AlertOctagon,
  PlayCircle,
  CalendarPlus,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  PauseCircle,
  FileText,
  ShieldAlert,
} from 'lucide-react'
import { editorialApi } from '../api'
import type { CampaignControl } from '../types'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

export const CampaignControlPage: React.FC = () => {
  const [items, setItems] = useState<CampaignControl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'APPROVED'>('ALL')

  // Modals state
  const [suspendTarget, setSuspendTarget] = useState<CampaignControl | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const [isSuspending, setIsSuspending] = useState(false)

  const [resumeTarget, setResumeTarget] = useState<CampaignControl | null>(null)
  const [isResuming, setIsResuming] = useState(false)

  const [makeGoodTarget, setMakeGoodTarget] = useState<CampaignControl | null>(null)
  const [makeGoodDays, setMakeGoodDays] = useState(3)
  const [makeGoodReason, setMakeGoodReason] = useState('')
  const [isMakingGood, setIsMakingGood] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await editorialApi.getCampaignControlList()
      setItems(data)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách điều khiển chiến dịch')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Emergency Kill-Switch action
  const handleSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return
    try {
      setIsSuspending(true)
      setError(null)
      await editorialApi.suspendCampaign(suspendTarget.campaignId, suspendReason.trim())
      setSuccessMsg(`Đã dừng khẩn cấp chiến dịch #${suspendTarget.campaignId} ("${suspendTarget.campaignName}")`)
      setSuspendTarget(null)
      setSuspendReason('')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Không thể dừng khẩn cấp chiến dịch')
    } finally {
      setIsSuspending(false)
    }
  }

  // Resume action
  const handleResume = async () => {
    if (!resumeTarget) return
    try {
      setIsResuming(true)
      setError(null)
      await editorialApi.resumeCampaign(resumeTarget.campaignId)
      setSuccessMsg(`Đã mở lại phát sóng chiến dịch #${resumeTarget.campaignId} ("${resumeTarget.campaignName}")`)
      setResumeTarget(null)
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Không thể mở lại chiến dịch')
    } finally {
      setIsResuming(false)
    }
  }

  // Make-Good action
  const handleMakeGood = async () => {
    if (!makeGoodTarget || makeGoodDays < 1 || !makeGoodReason.trim()) return
    try {
      setIsMakingGood(true)
      setError(null)
      await editorialApi.makeGoodCampaign(makeGoodTarget.campaignId, makeGoodDays, makeGoodReason.trim())
      setSuccessMsg(
        `Đã bù thêm ${makeGoodDays} ngày phát sóng cho chiến dịch #${makeGoodTarget.campaignId}`
      )
      setMakeGoodTarget(null)
      setMakeGoodDays(3)
      setMakeGoodReason('')
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Không thể áp dụng bù ngày phát sóng')
    } finally {
      setIsMakingGood(false)
    }
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slotCode.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchSearch) return false

      if (filterStatus === 'ACTIVE') return item.status === 'ACTIVE'
      if (filterStatus === 'SUSPENDED') return item.status === 'SUSPENDED'
      if (filterStatus === 'APPROVED') return item.status === 'APPROVED'
      return true
    })
  }, [items, searchQuery, filterStatus])

  // KPIs
  const totalCampaigns = items.length
  const activeCount = items.filter((i) => i.status === 'ACTIVE').length
  const suspendedCount = items.filter((i) => i.status === 'SUSPENDED').length
  const totalMakeGoodDays = items.reduce((sum, i) => sum + i.makeGoodDaysAdded, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
              Màn II.2.8 • UC023, UC024
            </span>
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Emergency Kill-Switch
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Điều Khiển Vận Hành Chiến Dịch & Xử Lý Sự Cố (Campaign Control)
          </h1>
          <p className="text-sm text-slate-500">
            Công tắc dừng khẩn cấp banner độc hại (Kill-Switch), phục hồi phát sóng và lập lịch bù ngày (Make-Good)
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

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold">Lỗi thao tác</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="flex-1 font-medium">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Tổng chiến dịch</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-slate-900">{totalCampaigns}</p>
            <Layers className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-1 text-xs text-slate-500">Đang được quản lý vận hành</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Đang phát sóng (LIVE)</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-emerald-800">{activeCount}</p>
            <PlayCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-1 text-xs text-emerald-600">Hiển thị bình thường trên site</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-700">Tạm dừng khẩn cấp (SUSPENDED)</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-rose-800">{suspendedCount}</p>
            <AlertOctagon className="h-5 w-5 text-rose-600" />
          </div>
          <p className="mt-1 text-xs text-rose-600">Đã kích hoạt Kill-Switch</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Tổng ngày đã bù (Make-Good)</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-amber-800">+{totalMakeGoodDays} ngày</p>
            <CalendarPlus className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-1 text-xs text-amber-600">Đền bù thời gian gián đoạn</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên chiến dịch, đối tác doanh nghiệp, vị trí slot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Lọc theo:</span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({totalCampaigns})
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang LIVE ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('SUSPENDED')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === 'SUSPENDED' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tạm ngưng ({suspendedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Control Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Chiến dịch & Khách hàng</th>
                <th className="px-4 py-3">Vị trí & Ngân sách</th>
                <th className="px-4 py-3">Tiến độ phát sóng</th>
                <th className="px-4 py-3 text-center">Trạng thái vận hành</th>
                <th className="px-4 py-3 text-center">Bù ngày</th>
                <th className="px-4 py-3 text-right">Thao tác điều khiển</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary-600" />
                    <p className="mt-2 text-sm">Đang tải dữ liệu điều khiển chiến dịch...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-base font-medium text-slate-700">Không tìm thấy chiến dịch nào</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const percentProgress =
                    item.totalPlannedDays > 0
                      ? Math.min(100, Math.round((item.elapsedDays / item.totalPlannedDays) * 100))
                      : 0

                  return (
                    <tr key={item.campaignId} className="hover:bg-slate-50/70">
                      {/* Campaign & Advertiser */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.campaignName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {item.companyName} • <span className="font-mono text-slate-400">#{item.campaignId}</span>
                        </div>
                        {item.suspensionReason && (
                          <div className="mt-1.5 flex items-start gap-1 rounded bg-rose-50 p-1.5 text-xs text-rose-700">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>Lý do ngưng: {item.suspensionReason}</span>
                          </div>
                        )}
                      </td>

                      {/* Slot & Budget */}
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-primary-900">{item.slotName}</div>
                        <div className="font-mono text-slate-500">{item.slotCode}</div>
                        <div className="mt-1 font-semibold text-slate-700">{formatCurrency(item.amount)}</div>
                      </td>

                      {/* Progress */}
                      <td className="px-4 py-3">
                        <div className="w-48 text-xs">
                          <div className="flex items-center justify-between text-slate-600">
                            <span>
                              {formatDate(item.startDate)} → {formatDate(item.endDate)}
                            </span>
                            <span className="font-bold">{percentProgress}%</span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.status === 'SUSPENDED'
                                  ? 'bg-rose-500'
                                  : item.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : 'bg-primary-500'
                              }`}
                              style={{ width: `${percentProgress}%` }}
                            />
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            Đã chạy {item.elapsedDays}/{item.totalPlannedDays} ngày kế hoạch
                          </div>
                        </div>
                      </td>

                      {/* Operational Status */}
                      <td className="px-4 py-3 text-center">
                        {item.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                            ĐANG LIVE
                          </span>
                        ) : item.status === 'SUSPENDED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                            <PauseCircle className="h-3.5 w-3.5 text-rose-600" />
                            ĐÃ TẠM DỪNG
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Make-good info */}
                      <td className="px-4 py-3 text-center">
                        {item.makeGoodDaysAdded > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                            +{item.makeGoodDaysAdded} ngày
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Kill-switch: Available when ACTIVE or APPROVED */}
                          {(item.status === 'ACTIVE' || item.status === 'APPROVED') && (
                            <button
                              onClick={() => {
                                setSuspendTarget(item)
                                setSuspendReason('')
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              title="Dừng khẩn cấp chiến dịch (Emergency Kill-Switch)"
                            >
                              <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
                              Dừng khẩn cấp
                            </button>
                          )}

                          {/* Resume: Available when SUSPENDED */}
                          {item.status === 'SUSPENDED' && (
                            <button
                              onClick={() => setResumeTarget(item)}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                              title="Mở lại chiến dịch sau khi xử lý vi phạm"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              Mở lại
                            </button>
                          )}

                          {/* Make-good: Available anytime */}
                          <button
                            onClick={() => {
                              setMakeGoodTarget(item)
                              setMakeGoodDays(3)
                              setMakeGoodReason('')
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                            title="Lập lịch bù ngày phát sóng (Make-Good Scheduling)"
                          >
                            <CalendarPlus className="h-3.5 w-3.5 text-amber-600" />
                            Bù ngày
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Kill-Switch Modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-rose-100 pb-4">
              <div className="rounded-full bg-rose-100 p-2 text-rose-600">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-rose-900">
                  Dừng Khẩn Cấp Chiến Dịch (Emergency Kill-Switch)
                </h3>
                <p className="mt-0.5 text-xs text-rose-700">
                  Thao tác này sẽ hạ banner khỏi trang công khai ngay lập tức (Ad Serving Gatekeeper).
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  Chiến dịch: <span className="font-semibold text-slate-900">{suspendTarget.campaignName}</span>
                </p>
                <p className="mt-0.5">
                  Doanh nghiệp: <span className="font-semibold">{suspendTarget.companyName}</span>
                </p>
                <p className="mt-0.5">
                  Vị trí slot: <span className="font-mono">{suspendTarget.slotCode}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Lý do dừng khẩn cấp (Bắt buộc) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ví dụ: Phát hiện link đích bị cảnh báo mã độc, nội dung vi phạm bản quyền hoặc có khiếu nại..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={isSuspending}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSuspend}
                disabled={isSuspending || !suspendReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {isSuspending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertOctagon className="h-4 w-4" />
                )}
                Xác nhận dừng khẩn cấp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Make-Good Modal */}
      {makeGoodTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-amber-100 pb-4">
              <div className="rounded-full bg-amber-100 p-2 text-amber-600">
                <CalendarPlus className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Lập Lịch Bù Ngày Hiển Thị (Make-Good Scheduling)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Gia hạn ngày kết thúc của chiến dịch để đền bù thời gian bị gián đoạn phát sóng
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  Chiến dịch: <span className="font-semibold text-slate-900">{makeGoodTarget.campaignName}</span>
                </p>
                <p className="mt-0.5">
                  Ngày kết thúc hiện tại: <span className="font-semibold">{formatDate(makeGoodTarget.endDate)}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Số ngày bù thêm (1 - 60 ngày) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={makeGoodDays}
                  onChange={(e) => setMakeGoodDays(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Lý do bù phát sóng <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={makeGoodReason}
                  onChange={(e) => setMakeGoodReason(e.target.value)}
                  placeholder="Ví dụ: Đền bù 3 ngày do sự cố máy chủ phân phối banner ngày 28/09..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => setMakeGoodTarget(null)}
                disabled={isMakingGood}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleMakeGood}
                disabled={isMakingGood || makeGoodDays < 1 || !makeGoodReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {isMakingGood ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
                Xác nhận bù ngày
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Resume Dialog */}
      {resumeTarget && (
        <ConfirmDialog
          open={Boolean(resumeTarget)}
          title="Xác nhận Mở Lại Chiến Dịch"
          message={`Bạn có chắc chắn muốn mở lại phát sóng cho chiến dịch "${resumeTarget.campaignName}"? Banner sẽ được kích hoạt lại trong luồng Ad Serving công khai.`}
          confirmText="Mở lại phát sóng (ACTIVE)"
          cancelText="Hủy"
          onConfirm={handleResume}
          onClose={() => setResumeTarget(null)}
        />
      )}
    </div>
  )
}
