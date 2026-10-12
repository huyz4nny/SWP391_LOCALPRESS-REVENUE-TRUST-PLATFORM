import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Article, ArticleStatus } from '@/features/reader/types'
import { editorialApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatDate, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import {
  FileText,
  PlusCircle,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Ban,
  Clock,
  Send,
  Sparkles,
} from 'lucide-react'

export function ArticleListPage() {
  const navigate = useNavigate()
  const currentUser = mockStore.getCurrentUser()
  const isReviewer = currentUser.role === 'REVIEWER' || currentUser.role === 'SYSTEM_ADMIN'

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  // Review modal
  const [reviewArticle, setReviewArticle] = useState<Article | null>(null)
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'PUBLISH' | 'UNPUBLISH'>('APPROVE')
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      setLoading(true)
      const data = await editorialApi.getArticles()
      setArticles(data)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenReview = (art: Article, action: 'APPROVE' | 'REJECT' | 'PUBLISH' | 'UNPUBLISH') => {
    setReviewArticle(art)
    setReviewAction(action)
    setReviewNotes('')
  }

  const handleExecuteReview = async () => {
    if (!reviewArticle) return
    setIsSubmittingReview(true)

    try {
      let targetStatus: ArticleStatus = 'APPROVED'
      if (reviewAction === 'APPROVE') targetStatus = 'APPROVED'
      if (reviewAction === 'REJECT') targetStatus = 'CHANGES_REQUESTED'
      if (reviewAction === 'PUBLISH') targetStatus = 'PUBLISHED'
      if (reviewAction === 'UNPUBLISH') targetStatus = 'UNPUBLISHED'

      await editorialApi.updateArticleStatus(reviewArticle.id, targetStatus, reviewNotes)
      setReviewArticle(null)
      loadArticles()
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật trạng thái')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const filteredArticles = articles.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.authorName.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Quản lý Bài viết & Tòa soạn
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quy trình xuất bản: Bản nháp → Chờ duyệt → Cần sửa / Đã duyệt → Xuất bản lên báo
          </p>
        </div>

        <Link to="/backoffice/editorial/articles/new">
          <Button size="sm" className="text-xs font-bold bg-sky-700 hover:bg-sky-800">
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Viết bài mới
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-500 mr-1">Trạng thái:</span>
          {['ALL', 'DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'UNPUBLISHED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'DRAFT' && 'Bản nháp'}
              {st === 'IN_REVIEW' && 'Chờ duyệt'}
              {st === 'CHANGES_REQUESTED' && 'Cần sửa'}
              {st === 'APPROVED' && 'Đã duyệt'}
              {st === 'PUBLISHED' && 'Đang xuất bản'}
              {st === 'UNPUBLISHED' && 'Đã gỡ bài'}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Tìm theo tiêu đề hoặc tác giả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Bài viết</th>
                <th className="px-4 py-3">Chuyên mục</th>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Tác giả</th>
                <th className="px-4 py-3">Phiên bản</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArticles.map((art) => (
                <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 max-w-sm">
                    <Link
                      to={`/backoffice/editorial/articles/${art.id}/edit`}
                      className="font-serif font-bold text-slate-900 hover:text-sky-700 line-clamp-2"
                    >
                      {art.title}
                    </Link>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Cập nhật: {formatDateTime(art.updatedAt)}
                    </span>
                    {art.reviewNotes && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                        Góp ý: {art.reviewNotes}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">{art.categoryName}</td>
                  <td className="px-4 py-3">
                    {art.isPremium ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                        👑 Premium
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">Miễn phí</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{art.authorName}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">v{art.currentVersion || 1}</td>
                  <td className="px-4 py-3">
                    <StatusBadge type="article" status={art.status} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-1 shrink-0">
                    <Link
                      to={`/backoffice/editorial/articles/${art.id}/edit`}
                      className="inline-flex items-center px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                    >
                      <Edit className="w-3 h-3 mr-1" /> Sửa
                    </Link>

                    {/* Reviewer / Admin Workflow Actions */}
                    {(art.status === 'IN_REVIEW' || art.status === 'CHANGES_REQUESTED') && (
                      <>
                        <button
                          onClick={() => handleOpenReview(art, 'APPROVE')}
                          className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer"
                        >
                          Duyệt
                        </button>
                        {art.status === 'IN_REVIEW' && (
                          <button
                            onClick={() => handleOpenReview(art, 'REJECT')}
                            className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold cursor-pointer"
                          >
                            Yêu cầu sửa
                          </button>
                        )}
                      </>
                    )}

                    {(art.status === 'APPROVED' || art.status === 'UNPUBLISHED') && (
                      <button
                        onClick={() => handleOpenReview(art, 'PUBLISH')}
                        className="px-2 py-1 rounded bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Xuất bản ngay
                      </button>
                    )}

                    {art.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleOpenReview(art, 'UNPUBLISH')}
                        className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold cursor-pointer"
                      >
                        Hạ bài
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Dialog */}
      {reviewArticle && (
        <Dialog
          open={!!reviewArticle}
          onClose={() => setReviewArticle(null)}
          title={
            reviewAction === 'APPROVE'
              ? 'Phê duyệt bài viết (APPROVED)'
              : reviewAction === 'REJECT'
              ? 'Yêu cầu phóng viên chỉnh sửa (CHANGES_REQUESTED)'
              : reviewAction === 'PUBLISH'
              ? 'Xuất bản bài viết lên trang báo'
              : 'Gỡ bài viết khỏi trang báo'
          }
        >
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Tác giả: <strong>{reviewArticle.authorName}</strong></span>
                <span>Phiên bản: <strong>v{reviewArticle.currentVersion || 1}</strong> • {reviewArticle.categoryName}</span>
              </div>
              <h4 className="font-serif font-bold text-slate-900 text-sm">
                {reviewArticle.title}
              </h4>
              <p className="font-medium text-slate-700 italic">
                {reviewArticle.sapo}
              </p>
              <div className="text-slate-600 pt-2 border-t border-slate-200 whitespace-pre-line">
                {reviewArticle.content}
              </div>
              {reviewArticle.versions && reviewArticle.versions.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-700 block">Lịch sử phiên bản ({reviewArticle.versions.length}):</span>
                  {reviewArticle.versions.map((ver) => (
                    <div key={ver.versionNumber} className="text-[11px] text-slate-500 flex justify-between bg-white px-2 py-1 rounded border border-slate-100">
                      <span><strong>v{ver.versionNumber}:</strong> {ver.title}</span>
                      <span className="text-slate-400 ml-2 shrink-0">{ver.changelog || 'Bản thảo'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="reviewNote">
                {reviewAction === 'REJECT' ? 'Nêu chi tiết yêu cầu phóng viên bổ sung/sửa đổi' : 'Ghi chú kiểm duyệt lưu vào MySQL (tùy chọn)'}
              </Label>
              <Textarea
                id="reviewNote"
                rows={3}
                placeholder="Nhập nhận xét kiểm duyệt..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                required={reviewAction === 'REJECT'}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setReviewArticle(null)}>
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteReview}
                isLoading={isSubmittingReview}
                className={reviewAction === 'REJECT' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-primary-900'}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
