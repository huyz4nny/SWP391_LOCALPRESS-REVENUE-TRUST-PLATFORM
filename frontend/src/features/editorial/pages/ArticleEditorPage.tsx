import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Article, Category, ArticleVersion } from '@/features/reader/types'
import { editorialApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import {
  Sparkles,
  History,
  Send,
  Save,
  ArrowLeft,
  Crown,
  Eye,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react'

export function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id && id !== 'new'

  const [title, setTitle] = useState('')
  const [sapo, setSapo] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [categoryId, setCategoryId] = useState('cat-thoi-su')
  const [tags, setTags] = useState('Hải Phòng, Thời sự')
  const [isPremium, setIsPremium] = useState(false)
  const [price, setPrice] = useState(15000)
  const [changelog, setChangelog] = useState('')
  const [status, setStatus] = useState<Article['status']>('DRAFT')
  const [versions, setVersions] = useState<ArticleVersion[]>([])

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // AI Modal
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<{ suggestedTitles: string[]; suggestedSapo: string; suggestedTags: string[] } | null>(null)

  // Version Drawer
  const [showVersionDrawer, setShowVersionDrawer] = useState(false)

  useEffect(() => {
    setCategories(mockStore.getState().categories)
    if (isEditing) {
      loadArticle(id)
    }
  }, [id])

  const loadArticle = async (articleId: string) => {
    try {
      setLoading(true)
      const art = mockStore.getState().articles.find((a) => a.id === articleId)
      if (art) {
        setTitle(art.title)
        setSapo(art.sapo)
        setContent(art.content || art.previewContent || '')
        setCoverImage(art.coverImage)
        setCategoryId(art.categoryId)
        setTags(art.tags.join(', '))
        setIsPremium(art.isPremium)
        setPrice(art.price || 15000)
        setStatus(art.status)
        setVersions(art.versions || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (submitForReview: boolean = false) => {
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề bài viết')
      return
    }

    setIsSaving(true)
    try {
      const selectedCat = categories.find((c) => c.id === categoryId)
      const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean)

      const articlePayload: Partial<Article> = {
        title,
        sapo,
        content,
        previewContent: sapo.slice(0, 150),
        coverImage: coverImage || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1000&auto=format&fit=crop&q=80',
        categoryId,
        categoryName: selectedCat?.name || 'Thời sự',
        categorySlug: selectedCat?.slug || 'thoi-su',
        tags: tagsArray,
        isPremium,
        price: isPremium ? price : 0,
        status: submitForReview ? 'IN_REVIEW' : status,
      }

      if (isEditing) {
        await editorialApi.updateArticle(id, articlePayload, changelog || (submitForReview ? 'Nộp duyệt bài viết' : 'Cập nhật bản thảo'))
      } else {
        const created = await editorialApi.createArticle(articlePayload)
        if (submitForReview) {
          await editorialApi.updateArticleStatus(created.id, 'IN_REVIEW', 'Gửi duyệt lần đầu')
        }
      }

      navigate('/backoffice/editorial/articles')
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu bài viết')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRunAiAssistant = async () => {
    setIsAiLoading(true)
    try {
      const data = await editorialApi.getAiSuggestions(aiTopic || title || 'kinh tế logistics Hải Phòng')
      setAiResults(data)
    } finally {
      setIsAiLoading(false)
    }
  }

  const handleApplyAiTitle = (suggestedTitle: string) => {
    setTitle(suggestedTitle)
  }

  const handleApplyAiSapo = (suggestedSapo: string) => {
    setSapo(suggestedSapo)
  }

  const handleRestoreVersion = (v: ArticleVersion) => {
    if (window.confirm(`Khôi phục nội dung về phiên bản v${v.versionNumber}?`)) {
      setTitle(v.title)
      setSapo(v.sapo)
      setContent(v.content)
      setShowVersionDrawer(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center animate-pulse">Đang tải bài viết...</div>
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link
            to="/backoffice/editorial/articles"
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isEditing ? `Chỉnh sửa bài viết: ${title || id}` : 'Soạn thảo bài viết mới'}
            </h1>
            <span className="text-xs text-slate-500">
              Trạng thái hiện tại: <strong>{status}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* AI Helper trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAiModal(true)}
            className="text-xs bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
            Trợ lý AI gợi ý
          </Button>

          {/* Versions button */}
          {versions.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowVersionDrawer(true)}
              className="text-xs"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              Lịch sử phiên bản ({versions.length})
            </Button>
          )}

          {/* Save Draft */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            isLoading={isSaving}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Lưu bản nháp
          </Button>

          {/* Submit for Review */}
          <Button
            type="button"
            size="sm"
            onClick={() => handleSave(true)}
            isLoading={isSaving}
            className="text-xs bg-sky-700 hover:bg-sky-800 font-bold"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            Gửi kiểm duyệt (Submit)
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Main Content Fields */}
        <div className="md:col-span-8 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4 text-xs">
              <div>
                <Label htmlFor="artTitle" required>
                  Tiêu đề bài viết (Headline)
                </Label>
                <Input
                  id="artTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề hấp dẫn, đúng sự thật..."
                  className="font-serif text-base font-bold"
                  required
                />
              </div>

              <div>
                <Label htmlFor="artSapo" required>
                  Đoạn mở đầu (Sapo)
                </Label>
                <Textarea
                  id="artSapo"
                  value={sapo}
                  onChange={(e) => setSapo(e.target.value)}
                  placeholder="Đoạn tóm tắt cốt lõi bài viết (1-3 câu)..."
                  rows={3}
                  className="font-serif italic text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="artContent" required>
                  Nội dung chi tiết toàn văn (Hỗ trợ Markdown)
                </Label>
                <Textarea
                  id="artContent"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nội dung phóng sự... Dùng ### cho tiêu đề đoạn"
                  rows={14}
                  className="font-serif text-sm leading-relaxed"
                  required
                />
              </div>

              {isEditing && (
                <div>
                  <Label htmlFor="changelog">Ghi chú thay đổi phiên bản (Changelog)</Label>
                  <Input
                    id="changelog"
                    value={changelog}
                    onChange={(e) => setChangelog(e.target.value)}
                    placeholder="VD: Bổ sung số liệu hải quan theo yêu cầu của Reviewer..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Settings Panel */}
        <div className="md:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Phân loại & Xuất bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <Label htmlFor="cat">Chuyên mục</Label>
                <select
                  id="cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-sky-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="cover">Ảnh đại diện bài viết (URL)</Label>
                <Input
                  id="cover"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash..."
                />
                {coverImage && (
                  <div className="mt-2 rounded overflow-hidden border border-slate-200">
                    <img src={coverImage} alt="Cover preview" className="w-full h-28 object-cover" />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="tags">Thẻ Tag (ngăn cách bằng dấu phẩy)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Hải Phòng, Kinh tế, Lạch Huyện"
                />
              </div>

              {/* Paywall & Premium Settings */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-950 text-xs">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <span>Bài viết Premium (Paywall)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Nếu bật Premium, độc giả chỉ xem được Sapo & 120 từ xem thử; toàn văn cần có Gói VIP hoặc mua lẻ.
                </p>

                {isPremium && (
                  <div>
                    <Label htmlFor="price">Giá mua lẻ bài viết (VND)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      step={5000}
                      min={5000}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Assistant Modal */}
      <Dialog
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        title="Trợ lý AI Tòa soạn (AI Copilot Simulation)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            AI hỗ trợ gợi ý tiêu đề thu hút, viết mở đầu (Sapo) và thẻ tag. Người dùng có toàn quyền xem xét và quyết định áp dụng, không tự động xuất bản.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Nhập chủ đề hoặc từ khóa trọng tâm (VD: Cảng Lạch Huyện, du lịch Cát Bà)..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleRunAiAssistant} isLoading={isAiLoading} size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Tạo gợi ý AI
            </Button>
          </div>

          {aiResults && (
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Gợi ý tiêu đề bài báo:
                </span>
                <div className="space-y-1.5">
                  {aiResults.suggestedTitles.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <span className="font-serif font-bold text-slate-900">{t}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleApplyAiTitle(t)
                          alert('Đã áp dụng tiêu đề vào bài viết!')
                        }}
                        className="text-[11px] h-7"
                      >
                        Áp dụng
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Gợi ý Sapo mở đầu:
                </span>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-700 italic flex items-center justify-between gap-3">
                  <p>{aiResults.suggestedSapo}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleApplyAiSapo(aiResults.suggestedSapo)
                      alert('Đã áp dụng Sapo!')
                    }}
                    className="text-[11px] h-7 shrink-0"
                  >
                    Áp dụng
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowAiModal(false)}>
              Đóng trợ lý
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Version History Drawer Dialog */}
      <Dialog
        open={showVersionDrawer}
        onClose={() => setShowVersionDrawer(false)}
        title={`Lịch sử các phiên bản (${versions.length} versions)`}
        maxWidth="lg"
      >
        <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
          {versions.map((v) => (
            <div
              key={v.versionNumber}
              className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start justify-between gap-3"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-slate-900">Phiên bản v{v.versionNumber}</span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500">Tạo bởi: {v.createdBy}</span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-500">{formatDateTime(v.createdAt)}</span>
                </div>
                <h4 className="font-serif font-bold text-slate-800 mt-1">{v.title}</h4>
                <p className="text-slate-600 mt-0.5 italic">Ghi chú: {v.changelog || 'Không có'}</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestoreVersion(v)}
                className="text-[11px] h-7 shrink-0"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Khôi phục bản này
              </Button>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  )
}
