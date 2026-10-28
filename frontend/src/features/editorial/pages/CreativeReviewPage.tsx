import React, { useState, useEffect } from 'react'
import { AdCampaign, AdCreative, CreativeStatus } from '@/features/advertising/types'
import { editorialApi } from '../api'
import { formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea, Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import {
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileCheck2,
} from 'lucide-react'

interface FlattenedCreative extends AdCreative {
  campaignName: string
  companyName: string
  slotName: string
  campaign: AdCampaign
}

export function CreativeReviewPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState<string>('')

  // Review Dialog State
  const [selectedCreative, setSelectedCreative] = useState<FlattenedCreative | null>(null)
  const [activeServingCreative, setActiveServingCreative] = useState<AdCreative | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await editorialApi.getCampaigns()
      setCampaigns([...data])
    } catch (err: unknown) {
      console.error('Lỗi tải danh sách creative:', err)
    } finally {
      setLoading(false)
    }
  }

  // Flatten all creatives with campaign details
  const allCreatives: FlattenedCreative[] = campaigns.flatMap((c) =>
    c.creatives.map((cr) => ({
      ...cr,
      campaignName: c.name,
      companyName: c.companyName,
      slotName: c.slotName,
      campaign: c,
    }))
  )

  // Mở modal duyệt creative (kèm so sánh nếu là version mới)
  const handleOpenReview = (cr: FlattenedCreative) => {
    setSelectedCreative(cr)
    setReviewNotes(cr.reviewNotes || 'Hình ảnh đạt chuẩn kích thước, tỷ lệ và độ phân giải.')

    // Tìm xem chiến dịch này có bản nào đang phục vụ trực tiếp không (Rule 8)
    const currentLive = cr.campaign.creatives.find(
      (other) => other.isActiveServing && other.id !== cr.id
    )
    setActiveServingCreative(currentLive || null)
  }

  // Thực thi duyệt hoặc yêu cầu sửa
  const handleExecuteReview = async (approved: boolean) => {
    if (!selectedCreative) return
    setIsSubmitting(true)
    try {
      await editorialApi.reviewCreative(selectedCreative.id, approved, reviewNotes)
      setSelectedCreative(null)
      setActiveServingCreative(null)
      setReviewNotes('')
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Lỗi duyệt creative')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Preset rejection reasons
  const PRESET_REASONS = [
    'Hình ảnh banner sai tỷ lệ quy định cho vị trí slot này.',
    'URL chuyển tiếp (Landing page) bị lỗi hoặc không bảo mật HTTPS.',
    'Chất lượng ảnh vỡ nét, không đủ tiêu chuẩn độ phân giải hiển thị.',
    'Nội dung quảng cáo chứa yếu tố phản cảm hoặc chưa được cấp phép phát hành.',
  ]

  // KPI Counts
  const totalCount = allCreatives.length
  const inReviewCount = allCreatives.filter((c) => c.status === 'IN_REVIEW').length
  const liveCount = allCreatives.filter((c) => c.isActiveServing).length
  const approvedCount = allCreatives.filter((c) => c.status === 'APPROVED').length
  const changesRequestedCount = allCreatives.filter((c) => c.status === 'CHANGES_REQUESTED').length

  // Filtered creatives
  const filteredCreatives = allCreatives.filter((cr) => {
    if (statusFilter === 'IN_REVIEW' && cr.status !== 'IN_REVIEW') return false
    if (statusFilter === 'LIVE' && !cr.isActiveServing) return false
    if (statusFilter === 'APPROVED' && cr.status !== 'APPROVED') return false
    if (statusFilter === 'CHANGES_REQUESTED' && cr.status !== 'CHANGES_REQUESTED') return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchTitle = cr.title.toLowerCase().includes(q)
      const matchCompany = cr.companyName.toLowerCase().includes(q)
      const matchSlot = cr.slotName.toLowerCase().includes(q)
      const matchUrl = cr.targetUrl.toLowerCase().includes(q)
      if (!matchTitle && !matchCompany && !matchSlot && !matchUrl) return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-sky-700" />
            Kiểm Duyệt Banner Quảng Cáo & URL Đích (Creative Review)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Màn II.2.6 (UC020, UC021, UC022): Kiểm tra kích thước banner, test link đích và so sánh phiên bản thay thế theo Quy tắc 8
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="text-xs"
          disabled={loading}
        >
          <RotateCcw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80">Tổng Creative</div>
          <div className="text-xl font-bold mt-1">{totalCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_REVIEW')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'IN_REVIEW'
              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
              : 'bg-amber-50/50 text-amber-900 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90 flex items-center justify-between">
            <span>Chờ kiểm duyệt</span>
            {inReviewCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
          <div className="text-xl font-bold mt-1 text-amber-700">{inReviewCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('LIVE')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'LIVE'
              ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
              : 'bg-purple-50/50 text-purple-900 border-purple-200 hover:border-purple-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90">Đang phát LIVE</div>
          <div className="text-xl font-bold mt-1 text-purple-700">{liveCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-emerald-50/50 text-emerald-900 border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90">Đã phê duyệt</div>
          <div className="text-xl font-bold mt-1 text-emerald-700">{approvedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('CHANGES_REQUESTED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'CHANGES_REQUESTED'
              ? 'bg-red-700 text-white border-red-700 shadow-sm'
              : 'bg-red-50/50 text-red-900 border-red-200 hover:border-red-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-90">Cần chỉnh sửa</div>
          <div className="text-xl font-bold mt-1 text-red-700">{changesRequestedCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-500 mr-1">Bộ lọc:</span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'IN_REVIEW', label: 'Chờ duyệt' },
            { key: 'LIVE', label: 'Đang phát LIVE' },
            { key: 'APPROVED', label: 'Đã duyệt' },
            { key: 'CHANGES_REQUESTED', label: 'Cần sửa' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            placeholder="Tìm theo tiêu đề, doanh nghiệp, slot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Creatives List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredCreatives.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            Không có banner quảng cáo nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          filteredCreatives.map((cr) => {
            const hasMultipleVersions = cr.campaign.creatives.length > 1
            const isReplacement = cr.versionNumber > 1

            return (
              <div
                key={cr.id}
                className={`p-5 rounded-xl border bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  cr.status === 'IN_REVIEW'
                    ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                  {/* Thumbnail */}
                  <div className="w-48 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group">
                    <img src={cr.imageUrl} alt={cr.title} className="w-full h-full object-cover" />
                    <a
                      href={cr.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold"
                    >
                      Xem ảnh gốc
                    </a>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 text-xs flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{cr.title}</h3>

                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold border border-slate-200">
                        v{cr.versionNumber}
                      </span>

                      {cr.isActiveServing && (
                        <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                          Đang phục vụ trực tiếp
                        </span>
                      )}

                      {isReplacement && cr.status === 'IN_REVIEW' && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-amber-600" />
                          Bản thay thế (Rule 8)
                        </span>
                      )}
                    </div>

                    <div className="text-slate-600 text-[11px]">
                      Doanh nghiệp: <strong>{cr.companyName}</strong> • Vị trí: <strong>{cr.slotName}</strong>
                    </div>

                    <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-2">
                      <span>Kích thước: <strong>{cr.width} x {cr.height} px</strong></span>
                      <span>•</span>
                      <span>Dung lượng: {cr.fileSizeKb} KB</span>
                      <span>•</span>
                      <span>Tải lên lúc: {formatDateTime(cr.uploadedAt)}</span>
                    </div>

                    {/* URL destination click-to-test */}
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={cr.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:text-sky-900 hover:underline flex items-center font-medium text-[11px]"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Link đích: {cr.targetUrl}
                      </a>
                    </div>

                    {cr.reviewNotes && (
                      <div className="p-2 bg-slate-50 rounded text-slate-600 text-[11px] italic border border-slate-200 mt-1">
                        Ghi chú duyệt: {cr.reviewNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions & Badges */}
                <div className="flex items-center space-x-3 shrink-0">
                  <StatusBadge type="creative" status={cr.status} />

                  <Button
                    size="sm"
                    onClick={() => handleOpenReview(cr)}
                    className={`text-xs font-bold ${
                      cr.status === 'IN_REVIEW'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {isReplacement && cr.status === 'IN_REVIEW' ? (
                      <>
                        <Layers className="w-3.5 h-3.5 mr-1" />
                        So sánh & Duyệt
                      </>
                    ) : cr.status === 'IN_REVIEW' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Kiểm duyệt
                      </>
                    ) : (
                      'Xem chi tiết'
                    )}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Review & Version Comparison Dialog (UC022 - Rule 8) */}
      {selectedCreative && (
        <Dialog
          open={!!selectedCreative}
          onClose={() => {
            setSelectedCreative(null)
            setActiveServingCreative(null)
          }}
          title={
            activeServingCreative
              ? `So Sánh & Phê Duyệt Phiên Bản Thay Thế (UC022 — Rule 8)`
              : `Kiểm Duyệt Banner: ${selectedCreative.title} (v${selectedCreative.versionNumber})`
          }
        >
          <div className="space-y-4 text-xs">
            {/* Rule 8 Version Comparison Banner */}
            {activeServingCreative ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    Thực thi Quy tắc bất biến số 8: Phiên bản hóa Creative
                  </div>
                  <p>
                    Chiến dịch hiện tại vẫn đang phát sóng bản <strong>v{activeServingCreative.versionNumber}</strong>. Khi bạn bấm <strong>"Phê duyệt bản mới"</strong>, hệ thống sẽ kích hoạt bản <strong>v{selectedCreative.versionNumber}</strong> lên trang báo ngay lập tức. Nếu bấm <strong>"Yêu cầu sửa"</strong>, chiến dịch vẫn tiếp tục chạy bản cũ an toàn.
                  </p>
                </div>

                {/* Side-by-Side Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Left: Active Version (v1) */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        Bản hiện tại đang phát (v{activeServingCreative.versionNumber})
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                        Đang phát LIVE
                      </span>
                    </div>

                    <div className="h-32 rounded overflow-hidden border border-slate-200 bg-white">
                      <img
                        src={activeServingCreative.imageUrl}
                        alt="Bản đang phát"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Kích thước: <strong>{activeServingCreative.width} x {activeServingCreative.height} px</strong></div>
                      <div>Dung lượng: {activeServingCreative.fileSizeKb} KB</div>
                      <div className="truncate text-sky-700 font-mono">
                        {activeServingCreative.targetUrl}
                      </div>
                    </div>
                  </div>

                  {/* Right: New Replacement (v2) */}
                  <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900">
                        Bản mới đề xuất (v{selectedCreative.versionNumber})
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                        Chờ duyệt
                      </span>
                    </div>

                    <div className="h-32 rounded overflow-hidden border border-amber-200 bg-white">
                      <img
                        src={selectedCreative.imageUrl}
                        alt="Bản mới"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Kích thước: <strong>{selectedCreative.width} x {selectedCreative.height} px</strong></div>
                      <div>Dung lượng: {selectedCreative.fileSizeKb} KB</div>
                      <div className="truncate text-sky-700 font-mono">
                        {selectedCreative.targetUrl}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Single Banner Preview */
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={selectedCreative.imageUrl}
                    alt={selectedCreative.title}
                    className="w-full max-h-48 object-contain mx-auto"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] p-2 bg-slate-50 rounded border border-slate-200">
                  <div>Vị trí: <strong>{selectedCreative.slotName}</strong></div>
                  <div>Phiên bản: <strong>v{selectedCreative.versionNumber}</strong></div>
                  <div>Kích thước: <strong>{selectedCreative.width} x {selectedCreative.height} px</strong></div>
                  <div>Dung lượng: <strong>{selectedCreative.fileSizeKb} KB</strong></div>
                  <div className="col-span-2">
                    Link đích:{' '}
                    <a
                      href={selectedCreative.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-700 hover:underline font-mono"
                    >
                      {selectedCreative.targetUrl}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Quick rejection reason presets */}
            <div>
              <Label className="mb-1 block text-slate-600">Lý do gợi ý chọn nhanh:</Label>
              <div className="space-y-1">
                {PRESET_REASONS.map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReviewNotes(reason)}
                    className="w-full text-left p-1.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] text-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>{reason}</span>
                    <span className="text-sky-700 font-semibold shrink-0 ml-2">Chọn</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Review Notes Input */}
            <div>
              <Label htmlFor="rvNotes" required>
                Nhận xét & Ghi chú kiểm duyệt:
              </Label>
              <Textarea
                id="rvNotes"
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Nhập lý do phê duyệt hoặc lý do yêu cầu sửa đổi..."
                required
                className="text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCreative(null)
                  setActiveServingCreative(null)
                }}
              >
                Hủy
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExecuteReview(false)}
                isLoading={isSubmitting}
                className="text-red-700 hover:bg-red-50 border-red-200"
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Yêu cầu sửa đổi
              </Button>

              <Button
                size="sm"
                onClick={() => handleExecuteReview(true)}
                isLoading={isSubmitting}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {activeServingCreative ? 'Duyệt & Kích hoạt bản mới' : 'Phê duyệt & Phát LIVE'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
