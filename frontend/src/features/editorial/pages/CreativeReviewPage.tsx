import React, { useState, useEffect } from 'react'
import { AdCampaign, AdCreative } from '@/features/advertising/types'
import { editorialApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Image as ImageIcon, CheckCircle2, AlertCircle, ExternalLink, Clock } from 'lucide-react'

export function CreativeReviewPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [loading, setLoading] = useState(true)

  // Review Dialog
  const [selectedCreative, setSelectedCreative] = useState<AdCreative | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const allCamps = mockStore.getState().campaigns
      setCampaigns([...allCamps])
    } finally {
      setLoading(false)
    }
  }

  // Flatten all creatives
  const allCreatives = campaigns.flatMap((c) =>
    c.creatives.map((cr) => ({
      ...cr,
      campaignName: c.name,
      companyName: c.companyName,
      slotName: c.slotName,
    }))
  )

  const handleExecuteReview = async (approved: boolean) => {
    if (!selectedCreative) return
    setIsSubmitting(true)
    try {
      await editorialApi.reviewCreative(selectedCreative.id, approved, reviewNotes)
      setSelectedCreative(null)
      setReviewNotes('')
      loadData()
      alert(approved ? 'Đã duyệt banner thành công! Phiên bản mới đã được kích hoạt phát trực tiếp.' : 'Đã gửi yêu cầu chỉnh sửa tới doanh nghiệp.')
    } catch (err: any) {
      alert(err.message || 'Lỗi duyệt creative')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Kiểm duyệt Banner Quảng cáo (Creative Review)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Đảm bảo banner quảng cáo đạt chuẩn kích thước, độ phân giải và không vi phạm thuần phong mỹ tục
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {allCreatives.map((cr) => (
          <div
            key={cr.id}
            className={`p-5 rounded-xl border bg-white shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              cr.status === 'IN_REVIEW' ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-48 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative group">
                <img src={cr.imageUrl} alt="" className="w-full h-full object-cover" />
                <a
                  href={cr.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold"
                >
                  Xem ảnh gốc
                </a>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm text-slate-900">{cr.title}</h3>
                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                    v{cr.versionNumber}
                  </span>
                  {cr.isActiveServing && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      ✓ Đang phục vụ trực tiếp
                    </span>
                  )}
                </div>

                <div className="text-slate-600">
                  Doanh nghiệp: <strong>{cr.companyName}</strong> • Vị trí: {cr.slotName}
                </div>

                <div className="text-slate-500 text-[11px] space-x-2">
                  <span>Kích thước: {cr.width} x {cr.height} px</span>
                  <span>•</span>
                  <span>Dung lượng: {cr.fileSizeKb} KB</span>
                  <span>•</span>
                  <span>Nộp lúc: {formatDateTime(cr.uploadedAt)}</span>
                </div>

                <div className="pt-1">
                  <a
                    href={cr.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-800 hover:underline flex items-center font-medium"
                  >
                    Link chuyển tiếp: {cr.targetUrl}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>

                {cr.reviewNotes && (
                  <div className="p-2 bg-slate-50 rounded text-slate-600 italic border border-slate-200 mt-1">
                    Ghi chú duyệt: {cr.reviewNotes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <StatusBadge type="creative" status={cr.status} />

              {cr.status === 'IN_REVIEW' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedCreative(cr)
                    setReviewNotes('Hình ảnh đạt chuẩn kích thước và bố cục hiển thị.')
                  }}
                  className="text-xs font-bold bg-amber-600 hover:bg-amber-700"
                >
                  Xem & Phê duyệt
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Dialog */}
      {selectedCreative && (
        <Dialog
          open={!!selectedCreative}
          onClose={() => setSelectedCreative(null)}
          title={`Kiểm duyệt Banner: ${selectedCreative.title} (v${selectedCreative.versionNumber})`}
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-lg overflow-hidden border border-slate-200">
              <img src={selectedCreative.imageUrl} alt="" className="w-full max-h-48 object-cover" />
            </div>

            <div>
              <Label htmlFor="rvNotes">Nhận xét của kiểm duyệt viên</Label>
              <Textarea
                id="rvNotes"
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Nhập lý do phê duyệt hoặc lý do yêu cầu sửa..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCreative(null)}
              >
                Hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleExecuteReview(false)}
                isLoading={isSubmitting}
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                Yêu cầu sửa lại
              </Button>
              <Button
                size="sm"
                onClick={() => handleExecuteReview(true)}
                isLoading={isSubmitting}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Phê duyệt & Kích hoạt phát LIVE
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
