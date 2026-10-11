import React, { useState, useEffect } from 'react'
import { Article, Comment, SubscriptionPlan } from '@/features/reader/types'
import { editorialApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  PlusCircle,
  Edit,
  Power,
  Crown,
  BookOpen,
  Headphones,
  Sparkles,
} from 'lucide-react'

type TabType = 'COMMENTS' | 'ARTICLE_POLICY' | 'SUBSCRIPTION_PLANS'

export function CommentModerationPage() {
  const [activeTab, setActiveTab] = useState<TabType>('COMMENTS')
  const [loading, setLoading] = useState(false)

  // ==========================================
  // TAB 1: KIỂM DUYỆT BÌNH LUẬN (UC026)
  // ==========================================
  const [comments, setComments] = useState<Comment[]>([])
  const [commentStatusFilter, setCommentStatusFilter] = useState<string>('ALL')
  const [rejectingComment, setRejectingComment] = useState<Comment | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // ==========================================
  // TAB 2: CHÍNH SÁCH BÀI VIẾT (UC027)
  // ==========================================
  const [articles, setArticles] = useState<Article[]>([])
  const [editingArticlePolicy, setEditingArticlePolicy] = useState<Article | null>(null)
  const [policyAccessType, setPolicyAccessType] = useState<'FREE' | 'PREMIUM'>('FREE')
  const [policyPrice, setPolicyPrice] = useState<number>(15000)
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false)

  // ==========================================
  // TAB 3: QUẢN LÝ GÓI CƯỚC HỘI VIÊN (UC028)
  // ==========================================
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false)
  const [planFormName, setPlanFormName] = useState('')
  const [planFormPrice, setPlanFormPrice] = useState(50000)
  const [planFormDuration, setPlanFormDuration] = useState(30)
  const [planFormAdFree, setPlanFormAdFree] = useState(true)
  const [planFormAudio, setPlanFormAudio] = useState(false)
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false)

  useEffect(() => {
    if (activeTab === 'COMMENTS') {
      loadComments()
    } else if (activeTab === 'ARTICLE_POLICY') {
      loadArticles()
    } else if (activeTab === 'SUBSCRIPTION_PLANS') {
      loadPlans()
    }
  }, [activeTab, commentStatusFilter])

  // --- Functions UC026 ---
  const loadComments = async () => {
    try {
      setLoading(true)
      const data = await editorialApi.getComments(commentStatusFilter)
      setComments(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleModerateComment = async (commentId: string, status: 'APPROVED' | 'REJECTED' | 'HIDDEN', reason?: string) => {
    try {
      await editorialApi.moderateComment(commentId, status, reason)
      setRejectingComment(null)
      setRejectReason('')
      loadComments()
    } catch (err: any) {
      alert(err.message || 'Lỗi kiểm duyệt bình luận')
    }
  }

  // --- Functions UC027 ---
  const loadArticles = async () => {
    try {
      setLoading(true)
      const data = await editorialApi.getArticles()
      setArticles(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditPolicy = (art: Article) => {
    setEditingArticlePolicy(art)
    setPolicyAccessType(art.isPremium ? 'PREMIUM' : 'FREE')
    setPolicyPrice(art.price > 0 ? art.price : 15000)
  }

  const handleSavePolicy = async () => {
    if (!editingArticlePolicy) return
    setIsSubmittingPolicy(true)
    try {
      await editorialApi.updateArticlePolicy(
        editingArticlePolicy.id,
        policyAccessType,
        policyAccessType === 'FREE' ? 0 : Number(policyPrice)
      )
      setEditingArticlePolicy(null)
      loadArticles()
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật chính sách bài viết')
    } finally {
      setIsSubmittingPolicy(false)
    }
  }

  // --- Functions UC028 ---
  const loadPlans = async () => {
    try {
      setLoading(true)
      const data = await editorialApi.getSubscriptionPlans()
      setPlans(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreatePlan = () => {
    setPlanFormName('')
    setPlanFormPrice(50000)
    setPlanFormDuration(30)
    setPlanFormAdFree(true)
    setPlanFormAudio(false)
    setIsCreatePlanOpen(true)
  }

  const handleOpenEditPlan = (p: SubscriptionPlan) => {
    setEditingPlan(p)
    setPlanFormName(p.name)
    setPlanFormPrice(p.price)
    setPlanFormDuration(p.durationDays)
    setPlanFormAdFree((p as any).hasAdFree ?? true)
    setPlanFormAudio((p as any).hasAudio ?? false)
  }

  const handleSavePlan = async (isEdit: boolean) => {
    if (!planFormName.trim()) {
      alert('Vui lòng nhập tên gói cước')
      return
    }
    setIsSubmittingPlan(true)
    try {
      const payload: any = {
        name: planFormName.trim(),
        price: Number(planFormPrice),
        durationDays: Number(planFormDuration),
        hasAdFree: planFormAdFree,
        hasAudio: planFormAudio,
      }

      if (isEdit && editingPlan) {
        await editorialApi.updateSubscriptionPlan(editingPlan.id, payload)
        setEditingPlan(null)
      } else {
        await editorialApi.createSubscriptionPlan(payload)
        setIsCreatePlanOpen(false)
      }
      loadPlans()
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu thông tin gói cước')
    } finally {
      setIsSubmittingPlan(false)
    }
  }

  const handleTogglePlan = async (planId: string) => {
    try {
      await editorialApi.toggleSubscriptionPlanStatus(planId)
      loadPlans()
    } catch (err: any) {
      alert(err.message || 'Lỗi đổi trạng thái gói cước')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2 text-primary-900" />
            Kiểm duyệt Nội dung & Thiết lập Chính sách (SV2)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị 3 trụ cột: Duyệt bình luận (UC026) • Chính sách bài viết Free/Premium (UC027) • Quản lý gói cước hội viên (UC028)
          </p>
        </div>

        {activeTab === 'SUBSCRIPTION_PLANS' && (
          <Button
            size="sm"
            onClick={handleOpenCreatePlan}
            className="text-xs font-bold bg-sky-700 hover:bg-sky-800"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Tạo gói cước mới
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('COMMENTS')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'COMMENTS'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Duyệt bình luận độc giả (UC026)
        </button>

        <button
          onClick={() => setActiveTab('ARTICLE_POLICY')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ARTICLE_POLICY'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Crown className="w-4 h-4 text-amber-600" />
          Chính sách Free / Premium (UC027)
        </button>

        <button
          onClick={() => setActiveTab('SUBSCRIPTION_PLANS')}
          className={`pb-3 px-4 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === 'SUBSCRIPTION_PLANS'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          Quản lý Gói cước Hội viên (UC028)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KIỂM DUYỆT BÌNH LUẬN (UC026)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'COMMENTS' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">Trạng thái:</span>
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setCommentStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-colors ${
                  commentStatusFilter === st
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' && 'Tất cả'}
                {st === 'PENDING' && 'Chờ duyệt'}
                {st === 'APPROVED' && 'Đã duyệt'}
                {st === 'REJECTED' && 'Bị từ chối / Ẩn'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Đang tải danh sách bình luận...</div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
              Không có bình luận nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border bg-white shadow-2xs text-xs space-y-2 ${
                    c.reported ? 'border-red-300 ring-2 ring-red-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{c.userName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-medium line-clamp-1 max-w-xs sm:max-w-md">
                        Bài viết: <strong>{c.articleTitle || '#' + c.articleId}</strong>
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400">{formatDateTime(c.createdAt)}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {c.reported && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {c.reportReason || 'Báo cáo vi phạm'}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status === 'APPROVED' ? 'Đã duyệt' : c.status === 'REJECTED' ? 'Đã chặn' : 'Chờ duyệt'}
                      </span>
                    </div>
                  </div>

                  <p className="p-3 bg-slate-50 rounded-lg text-slate-800 leading-relaxed border border-slate-100">
                    "{c.content}"
                  </p>

                  <div className="flex justify-end space-x-2 pt-1">
                    {c.status !== 'REJECTED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectingComment(c)}
                        className="text-red-700 border-red-200 hover:bg-red-50 text-xs h-7"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Từ chối / Chặn vi phạm
                      </Button>
                    )}
                    {c.status !== 'APPROVED' && (
                      <Button
                        size="sm"
                        onClick={() => handleModerateComment(c.id, 'APPROVED')}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Duyệt hiển thị công khai
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Reject Comment */}
          {rejectingComment && (
            <Dialog
              open={!!rejectingComment}
              onClose={() => setRejectingComment(null)}
              title="Từ chối / Chặn bình luận vi phạm chính sách"
            >
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Nội dung bình luận: <em>"{rejectingComment.content}"</em> (Tác giả: {rejectingComment.userName})
                </p>

                <div>
                  <Label htmlFor="rejectReason">Lý do từ chối / Vi phạm tiêu chuẩn cộng đồng</Label>
                  <Input
                    id="rejectReason"
                    placeholder="Ví dụ: Ngôn từ thù địch, quấy rối, spam quảng cáo..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setRejectingComment(null)}>
                    Hủy bỏ
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleModerateComment(rejectingComment.id, 'REJECTED', rejectReason)}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Xác nhận từ chối
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHÍNH SÁCH BÀI VIẾT (UC027)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'ARTICLE_POLICY' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800">Danh mục Bài viết & Cấu hình Truy cập (Paywall Scope)</span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Quy tắc 2: Phân quyền theo Scope (Miễn phí 100% hoặc Trả tiền mua lẻ từng bài / Gói hội viên).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Bài viết</th>
                  <th className="px-4 py-3">Chuyên mục</th>
                  <th className="px-4 py-3">Chính sách hiện tại</th>
                  <th className="px-4 py-3">Giá bán lẻ (VND)</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-serif font-bold text-slate-900 max-w-sm">
                      {art.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{art.categoryName}</td>
                    <td className="px-4 py-3">
                      {art.isPremium ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 flex items-center w-fit gap-1">
                          <Crown className="w-3 h-3 text-amber-600" />
                          PREMIUM (Trả phí)
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center w-fit gap-1">
                          <BookOpen className="w-3 h-3 text-emerald-600" />
                          FREE (Miễn phí 100%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {art.isPremium ? formatCurrency(art.price) : '0 ₫'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditPolicy(art)}
                        className="text-xs h-7"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Đổi chính sách
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Edit Article Policy */}
          {editingArticlePolicy && (
            <Dialog
              open={!!editingArticlePolicy}
              onClose={() => setEditingArticlePolicy(null)}
              title="Thiết lập chính sách truy cập bài viết"
            >
              <div className="space-y-4 text-xs">
                <p className="text-slate-600">
                  Bài viết: <strong>{editingArticlePolicy.title}</strong>
                </p>

                <div className="space-y-2">
                  <Label>Chọn chế độ phát hành</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPolicyAccessType('FREE')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        policyAccessType === 'FREE'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        FREE (Đọc tự do)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Khách không cần đăng nhập, đọc toàn văn không giới hạn.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPolicyAccessType('PREMIUM')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        policyAccessType === 'PREMIUM'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Crown className="w-4 h-4 text-amber-600" />
                        PREMIUM (Trả phí)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Kích hoạt Paywall 30%, yêu cầu mua lẻ hoặc mua gói hội viên.
                      </p>
                    </button>
                  </div>
                </div>

                {policyAccessType === 'PREMIUM' && (
                  <div>
                    <Label htmlFor="policyPrice">Giá mua lẻ bài viết (VND)</Label>
                    <Input
                      id="policyPrice"
                      type="number"
                      step={5000}
                      min={0}
                      value={policyPrice}
                      onChange={(e) => setPolicyPrice(Number(e.target.value))}
                      className="mt-1"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Đề xuất: 15.000 ₫ (Bài phóng sự ngắn) • 25.000 ₫ (Điều tra độc quyền)
                    </span>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingArticlePolicy(null)}>
                    Hủy bỏ
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePolicy}
                    isLoading={isSubmittingPolicy}
                    className="bg-primary-900 text-white"
                  >
                    Lưu chính sách
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUẢN LÝ GÓI CƯỚC HỘI VIÊN (UC028)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'SUBSCRIPTION_PLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`p-5 rounded-xl border bg-white shadow-2xs text-xs space-y-4 flex flex-col justify-between ${
                p.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50/60 opacity-70'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-base">{p.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {p.isActive ? 'Đang mở bán' : 'Tạm ngưng'}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {formatCurrency(p.price)}
                  </span>
                  <span className="text-slate-500 text-xs">/ {p.durationDays} ngày</span>
                </div>

                <p className="text-slate-600 text-xs">{p.description}</p>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="font-semibold text-slate-700 block text-[11px]">Quyền lợi đi kèm:</span>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Đọc toàn bộ bài viết chuyên sâu</span>
                  </div>
                  {(p as any).hasAdFree && (
                    <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Trải nghiệm 100% Không quảng cáo</span>
                    </div>
                  )}
                  {(p as any).hasAudio && (
                    <div className="flex items-center gap-1.5 text-sky-700 font-medium">
                      <Headphones className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Nghe báo nói AI chất lượng cao</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTogglePlan(p.id)}
                  className={`text-xs h-7 ${p.isActive ? 'text-amber-700' : 'text-emerald-700'}`}
                >
                  <Power className="w-3 h-3 mr-1" />
                  {p.isActive ? 'Tạm ngưng' : 'Kích hoạt'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditPlan(p)}
                  className="text-xs h-7"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Sửa gói
                </Button>
              </div>
            </div>
          ))}

          {/* Modal Create/Edit Plan */}
          {(isCreatePlanOpen || editingPlan) && (
            <Dialog
              open={isCreatePlanOpen || !!editingPlan}
              onClose={() => {
                setIsCreatePlanOpen(false)
                setEditingPlan(null)
              }}
              title={editingPlan ? 'Chỉnh sửa gói cước hội viên' : 'Tạo mới gói cước hội viên'}
            >
              <div className="space-y-4 text-xs">
                <div>
                  <Label htmlFor="planName">Tên gói cước</Label>
                  <Input
                    id="planName"
                    placeholder="Ví dụ: Gói Tháng VIP, Gói Năm Toàn Năng..."
                    value={planFormName}
                    onChange={(e) => setPlanFormName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="planPrice">Giá cước (VND)</Label>
                    <Input
                      id="planPrice"
                      type="number"
                      step={5000}
                      min={0}
                      value={planFormPrice}
                      onChange={(e) => setPlanFormPrice(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="planDuration">Thời hạn (ngày)</Label>
                    <Input
                      id="planDuration"
                      type="number"
                      min={1}
                      value={planFormDuration}
                      onChange={(e) => setPlanFormDuration(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="font-semibold text-slate-700 block">Tính năng đặc quyền:</span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planFormAdFree}
                      onChange={(e) => setPlanFormAdFree(e.target.checked)}
                      className="rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                    />
                    <span className="text-slate-700">Đọc báo Không quảng cáo (Ad-Free)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={planFormAudio}
                      onChange={(e) => setPlanFormAudio(e.target.checked)}
                      className="rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                    />
                    <span className="text-slate-700">Nghe báo nói AI (Audio Speech)</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreatePlanOpen(false)
                      setEditingPlan(null)
                    }}
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSavePlan(!!editingPlan)}
                    isLoading={isSubmittingPlan}
                    className="bg-primary-900 text-white"
                  >
                    {editingPlan ? 'Lưu thay đổi' : 'Tạo gói cước'}
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
        </div>
      )}
    </div>
  )
}
