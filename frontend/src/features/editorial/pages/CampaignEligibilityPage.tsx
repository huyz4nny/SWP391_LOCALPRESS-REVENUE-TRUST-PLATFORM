import React, { useEffect, useState, useMemo } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  FileCheck,
  CreditCard,
  FileText,
  Layers,
  Eye,
  Info,
} from 'lucide-react'
import { editorialApi } from '../api'
import type { CampaignEligibility } from '../types'
import { formatCurrency, formatDate } from '@/lib/format'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

export const CampaignEligibilityPage: React.FC = () => {
  const [items, setItems] = useState<CampaignEligibility[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ELIGIBLE' | 'BLOCKED' | 'ACTIVE'>('ALL')

  // Selected item for detail modal
  const [selectedItem, setSelectedItem] = useState<CampaignEligibility | null>(null)
  const [activatingId, setActivatingId] = useState<number | null>(null)
  const [confirmActivationItem, setConfirmActivationItem] = useState<CampaignEligibility | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await editorialApi.getEligibilityChecklist()
      setItems(data)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách thẩm định điều kiện phát sóng')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleActivate = async (campaignId: number) => {
    try {
      setActivatingId(campaignId)
      setError(null)
      await editorialApi.activateCampaign(campaignId)
      setSuccessMsg(`Kích hoạt phát sóng thành công chiến dịch #${campaignId} (LIVE)`)
      setConfirmActivationItem(null)
      await loadData()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setError(err?.message || 'Kích hoạt thất bại. Vui lòng kiểm tra lại 5 điều kiện tiên quyết.')
    } finally {
      setActivatingId(null)
    }
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slotCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.contractReference && item.contractReference.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchSearch) return false

      if (filterStatus === 'ELIGIBLE') return item.overallEligible
      if (filterStatus === 'BLOCKED') return !item.overallEligible
      if (filterStatus === 'ACTIVE') return item.status === 'ACTIVE'
      return true
    })
  }, [items, searchQuery, filterStatus])

  // KPI stats
  const totalCampaigns = items.length
  const eligibleCount = items.filter((i) => i.overallEligible).length
  const blockedCount = items.filter((i) => !i.overallEligible).length
  const activeCount = items.filter((i) => i.status === 'ACTIVE').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800">
              Màn II.2.7 • UC022, UC023
            </span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              Quy tắc 9 (Rule 9)
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Thẩm Định Điều Kiện Phát Sóng Quảng Cáo (Ad Serving Gatekeeper)
          </h1>
          <p className="text-sm text-slate-500">
            Hàng rào an toàn kiểm soát nghiêm ngặt 5 điều kiện tiên quyết trước khi phân phối banner ra trang công khai
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
          <p className="mt-1 text-xs text-slate-500">Trong hệ thống tòa soạn</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Đủ điều kiện (Ready)</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-emerald-800">{eligibleCount}</p>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-1 text-xs text-emerald-600">Thỏa mãn 100% 5 tiêu chí</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-700">Chưa đủ điều kiện</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-rose-800">{blockedCount}</p>
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
          <p className="mt-1 text-xs text-rose-600">Thiếu thanh toán/hợp đồng/banner</p>
        </div>

        <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-800">Đang phát sóng (LIVE)</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-bold text-primary-900">{activeCount}</p>
            <Play className="h-5 w-5 text-primary-700" />
          </div>
          <p className="mt-1 text-xs text-primary-700">Đang hiển thị cho độc giả</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên chiến dịch, doanh nghiệp, vị trí slot, số hợp đồng..."
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
              onClick={() => setFilterStatus('ELIGIBLE')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === 'ELIGIBLE' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đủ điều kiện ({eligibleCount})
            </button>
            <button
              onClick={() => setFilterStatus('BLOCKED')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === 'BLOCKED' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa đạt ({blockedCount})
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filterStatus === 'ACTIVE' ? 'bg-white text-primary-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đang LIVE ({activeCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Chiến dịch & Doanh nghiệp</th>
                <th className="px-4 py-3">Vị trí & Thời gian</th>
                <th className="px-4 py-3 text-center">1. Tiền</th>
                <th className="px-4 py-3 text-center">2. Báo giá</th>
                <th className="px-4 py-3 text-center">3. HĐ</th>
                <th className="px-4 py-3 text-center">4. Banner</th>
                <th className="px-4 py-3 text-center">5. Slot</th>
                <th className="px-4 py-3 text-center">Đánh giá chung</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary-600" />
                    <p className="mt-2 text-sm">Đang tải và thẩm định điều kiện phát sóng...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-2 text-base font-medium text-slate-700">Không tìm thấy chiến dịch nào</p>
                    <p className="text-xs text-slate-500">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.campaignId} className="hover:bg-slate-50/70">
                    {/* Campaign & Advertiser */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.campaignName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {item.companyName} • <span className="font-mono text-slate-400">ID #{item.campaignId}</span>
                      </div>
                      <div className="mt-1 text-xs font-medium text-slate-700">
                        Giá trị: {formatCurrency(item.quotedAmount)}
                      </div>
                    </td>

                    {/* Slot & Dates */}
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-primary-900">{item.slotName}</div>
                      <div className="font-mono text-slate-500">{item.slotCode}</div>
                      <div className="mt-1 text-slate-500">
                        {formatDate(item.startDate)} → {formatDate(item.endDate)}
                      </div>
                    </td>

                    {/* 1. Payment */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center" title={item.paymentMessage}>
                        {item.paymentPassed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                            <XCircle className="h-3 w-3" /> {item.paymentStatus}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 2. Quotation */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center" title={item.quotationMessage}>
                        {item.quotationPassed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> {item.quotationStatus}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Contract */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center" title={item.contractMessage}>
                        {item.contractPassed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Đã ký
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                            <XCircle className="h-3 w-3" /> Thiếu
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Creative */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center" title={item.creativeMessage}>
                        {item.creativePassed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> v{item.creativeVersion}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                            <XCircle className="h-3 w-3" /> {item.creativeReviewStatus || 'Chưa nộp'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Slot Status */}
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center" title={item.slotMessage}>
                        {item.slotPassed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> Mở
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                            <XCircle className="h-3 w-3" /> Khóa
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Overall Assessment */}
                    <td className="px-4 py-3 text-center">
                      {item.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-2.5 py-1 text-xs font-bold text-primary-800">
                          <span className="h-2 w-2 rounded-full bg-primary-600 animate-pulse" />
                          Đang LIVE
                        </span>
                      ) : item.overallEligible ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ĐỦ ĐIỀU KIỆN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          CHƯA ĐỦ
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          title="Xem chi tiết 5 tiêu chí"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Chi tiết
                        </button>

                        {item.canActivate && (
                          <button
                            onClick={() => setConfirmActivationItem(item)}
                            disabled={activatingId === item.campaignId}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Phát sóng
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal Dialog */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Thẩm Định Chi Tiết 5 Tiêu Chí (Gatekeeper Checklist)
                </h3>
                <p className="text-xs text-slate-500">
                  Chiến dịch: <span className="font-semibold text-slate-800">{selectedItem.campaignName}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* 1. Payment */}
              <div
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  selectedItem.paymentPassed ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
                }`}
              >
                <CreditCard
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    selectedItem.paymentPassed ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">1. Điều kiện Thanh toán (Payment Status)</p>
                    <span
                      className={`text-xs font-bold ${
                        selectedItem.paymentPassed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {selectedItem.paymentPassed ? '✓ ĐẠT' : '✗ CHƯA ĐẠT'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{selectedItem.paymentMessage}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ngân sách chiến dịch: <span className="font-semibold">{formatCurrency(selectedItem.quotedAmount)}</span>
                  </p>
                </div>
              </div>

              {/* 2. Quotation */}
              <div
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  selectedItem.quotationPassed ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <FileCheck
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    selectedItem.quotationPassed ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">2. Điều kiện Chấp thuận Báo giá (Quotation Status)</p>
                    <span
                      className={`text-xs font-bold ${
                        selectedItem.quotationPassed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {selectedItem.quotationPassed ? '✓ ĐẠT' : '✗ CHƯA ĐẠT'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{selectedItem.quotationMessage}</p>
                </div>
              </div>

              {/* 3. Contract */}
              <div
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  selectedItem.contractPassed ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
                }`}
              >
                <FileText
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    selectedItem.contractPassed ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">3. Hợp đồng Pháp lý (Contract Reference)</p>
                    <span
                      className={`text-xs font-bold ${
                        selectedItem.contractPassed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {selectedItem.contractPassed ? '✓ ĐẠT' : '✗ CHƯA ĐẠT'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{selectedItem.contractMessage}</p>
                  {selectedItem.contractFileUrl && (
                    <a
                      href={selectedItem.contractFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Xem file PDF hợp đồng số hóa
                    </a>
                  )}
                </div>
              </div>

              {/* 4. Creative */}
              <div
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  selectedItem.creativePassed ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
                }`}
              >
                <ShieldCheck
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    selectedItem.creativePassed ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">4. Bản thiết kế & Quét An toàn URL (Creative & Security)</p>
                    <span
                      className={`text-xs font-bold ${
                        selectedItem.creativePassed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {selectedItem.creativePassed ? '✓ ĐẠT' : '✗ CHƯA ĐẠT'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{selectedItem.creativeMessage}</p>
                  {selectedItem.creativeMediaUrl && (
                    <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
                      <p className="text-xs font-medium text-slate-700">Preview Banner:</p>
                      <img
                        src={selectedItem.creativeMediaUrl}
                        alt="Creative preview"
                        className="mt-1 max-h-32 rounded object-cover shadow-sm"
                      />
                      {selectedItem.creativeTargetUrl && (
                        <p className="mt-1 font-mono text-[11px] text-slate-500">
                          Target URL: {selectedItem.creativeTargetUrl}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Slot Status */}
              <div
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  selectedItem.slotPassed ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
                }`}
              >
                <Layers
                  className={`mt-0.5 h-5 w-5 shrink-0 ${
                    selectedItem.slotPassed ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-900">5. Vị trí Quảng cáo (Ad Slot Availability)</p>
                    <span
                      className={`text-xs font-bold ${
                        selectedItem.slotPassed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {selectedItem.slotPassed ? '✓ ĐẠT' : '✗ CHƯA ĐẠT'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600">{selectedItem.slotMessage}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Mã vị trí: <span className="font-mono font-semibold">{selectedItem.slotCode}</span> • {selectedItem.slotName}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Trạng thái hiện tại:</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                  {selectedItem.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                {selectedItem.canActivate && (
                  <button
                    onClick={() => {
                      const target = selectedItem
                      setSelectedItem(null)
                      setConfirmActivationItem(target)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Play className="h-4 w-4" />
                    Kích hoạt phát sóng
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmActivationItem && (
        <ConfirmDialog
          open={Boolean(confirmActivationItem)}
          title="Xác nhận Kích hoạt Phát sóng (LIVE)"
          message={`Bạn có chắc chắn muốn kích hoạt phát sóng cho chiến dịch "${confirmActivationItem.campaignName}" của khách hàng "${confirmActivationItem.companyName}"? Hệ thống đã kiểm chứng đủ 100% 5 điều kiện an toàn.`}
          confirmText="Kích hoạt ngay (LIVE)"
          cancelText="Hủy"
          onConfirm={() => handleActivate(confirmActivationItem.campaignId)}
          onClose={() => setConfirmActivationItem(null)}
        />
      )}
    </div>
  )
}
