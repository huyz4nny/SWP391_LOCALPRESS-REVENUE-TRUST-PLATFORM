import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { Article, ArticleVersion } from '@/features/reader/types'
import { editorialApi, type EditorialCategoryOption } from '../api'
import { contentApi } from '@/features/content/api'
import { APP_CONFIG } from '@/app/config'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AppApiError } from '@/lib/http/errors'
import { articleEditorSchema, checkCoverDimensions, editorFieldForApiError, type ArticleEditorValues } from '@/features/content/validation/articleEditor'
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
import { ArticleVersionDraftEditor } from '@/features/content/components/ArticleVersionDraftEditor'
import { articleVersionEditorPath, isArticleVersionEditorMode } from '@/features/content/routes'

export function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const saveInFlight = useRef(false)
  const location = useLocation()
  const isEditing = !!id && id !== 'new'
  const isAuthor = mockStore.getCurrentUser().role === 'AUTHOR'

  const [title, setTitle] = useState('')
  const [sapo, setSapo] = useState('')
  const [content, setContent] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverCaption, setCoverCaption] = useState('')
  const [coverAltText, setCoverAltText] = useState('')
  const [coverSource, setCoverSource] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverError, setCoverError] = useState('')
  const coverFileInput = useRef<HTMLInputElement>(null)
  const [categoryId, setCategoryId] = useState('cat-thoi-su')
  const [tags, setTags] = useState('Hải Phòng, Thời sự')
  const [isPremium, setIsPremium] = useState(false)
  const [price, setPrice] = useState(15000)
  const [changelog, setChangelog] = useState('')
  const [status, setStatus] = useState<Article['status']>('DRAFT')
  const [draftVersion, setDraftVersion] = useState<number | null>(null)
  const [versions, setVersions] = useState<ArticleVersion[]>([])

  const [categories, setCategories] = useState<EditorialCategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const { setValue, trigger, setError, clearErrors, formState: { errors: fieldErrors } } =
    useForm<ArticleEditorValues>({ resolver: zodResolver(articleEditorSchema) })

  // AI Modal
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiResults, setAiResults] = useState<{ suggestedTitles: string[]; suggestedSapo: string; suggestedTags: string[] } | null>(null)

  // Version Drawer
  const [showVersionDrawer, setShowVersionDrawer] = useState(false)

  useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoading(true)
      setLoadError('')
      setSaveError('')
      clearErrors()
      setCategories([])
      setTitle('')
      setSapo('')
      setContent('')
      setCoverImage('')
      setCoverFile(null)
      setCoverCaption('')
      setCoverAltText('')
      setCoverSource('')
      setCoverError('')
      if (coverFileInput.current) coverFileInput.current.value = ''
      setCategoryId('')
      setTags('Hải Phòng, Thời sự')
      setIsPremium(false)
      setPrice(15000)
      setChangelog('')
      setStatus('DRAFT')
      setDraftVersion(null)
      setVersions([])

      try {
        const [categoryOptions, article] = await Promise.all([
          editorialApi.getCategories(),
          isEditing && id
            ? (!APP_CONFIG.useMockApi ? contentApi.getDraft(id).then((draft) => ({
                title: draft.title,
                sapo: draft.sapo,
                content: draft.content,
                coverImage: draft.coverImageUrl,
                coverCaption: draft.coverCaption,
                coverAltText: draft.coverAltText,
                coverSource: draft.coverSource,
                categoryId: draft.categoryId,
                tags: draft.tags,
                isPremium: draft.isPremium,
                price: draft.price,
                status: draft.status,
                currentVersion: draft.latestVersion,
                versions: [] as ArticleVersion[],
              })) : editorialApi.getArticle(id))
            : Promise.resolve(null),
        ])

        if (!active) return

        setCategories(categoryOptions)
        if (article) {
          setTitle(article.title)
          setSapo(article.sapo ?? '')
          setContent(article.content ?? '')
          setCoverImage(article.coverImage ?? '')
          setCoverCaption(article.coverCaption ?? '')
          setCoverAltText(article.coverAltText ?? '')
          setCoverSource(article.coverSource ?? '')
          setCategoryId(!APP_CONFIG.useMockApi
            ? categoryOptions.find((category) => category.apiId === article.categoryId)?.id ?? ''
            : article.categoryId)
          setTags((article.tags ?? []).join(', '))
          setIsPremium(article.isPremium)
          setPrice(article.price || 15000)
          setStatus(article.status)
          setDraftVersion(article.currentVersion)
          setVersions(article.versions ?? [])
        } else {
          setCategoryId(
            categoryOptions.find((category) => category.id === 'cat-thoi-su')?.id
              ?? categoryOptions[0]?.id
              ?? '',
          )
        }
      } catch (error: unknown) {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : 'Không tải được dữ liệu bài viết')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadData()
    return () => { active = false }
  }, [id, isEditing, isAuthor, clearErrors, location.search])

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    setCoverPreview(null)

    if (coverFile) {
      objectUrl = URL.createObjectURL(coverFile)
      setCoverPreview(objectUrl)
    } else if (coverImage.startsWith('/api/v1/content/images/')) {
      void contentApi.getCoverImage(coverImage).then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setCoverPreview(objectUrl)
      }).catch((error: unknown) => {
        if (active) setCoverError(error instanceof Error ? error.message : 'Không tải được ảnh bìa')
      })
    } else {
      setCoverPreview(coverImage || null)
    }

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [coverFile, coverImage])

  const handleChooseCover = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setCoverError('')
    clearErrors('coverFile')
    if (file && ((file.type && !['image/jpeg', 'image/png'].includes(file.type)) || file.size > 5 * 1024 * 1024)) {
      event.target.value = ''
      setCoverFile(null)
      setCoverError('Vui lòng chọn JPEG hoặc PNG, tối đa 5 MB')
      return
    }
    setCoverFile(file)
  }

  const handleSave = async (submitForReview: boolean = false) => {
    if (saveInFlight.current || loading) return
    saveInFlight.current = true
    setIsSaving(true)
    try {
      setCoverError('')
      setSaveError('')
      clearErrors()
      const values: ArticleEditorValues = {
        title, sapo, content, categoryId, coverImage, coverFile, coverAltText,
        coverCaption, coverSource, tags, isPremium, price: isPremium ? price : 0, changelog,
      }
      for (const key of Object.keys(values) as (keyof ArticleEditorValues)[]) setValue(key, values[key])
      if (!await trigger()) {
        setSaveError('Vui lòng kiểm tra các trường được đánh dấu bên dưới')
        return
      }
      const validatedCategory = categories.find((category) => category.id === categoryId)
      if (!validatedCategory || (!APP_CONFIG.useMockApi && (!Number.isSafeInteger(Number(validatedCategory.apiId)) || Number(validatedCategory.apiId) <= 0))) {
        setError('categoryId', { message: 'Vui lòng chọn chuyên mục hợp lệ' })
        return
      }
      if (coverFile) {
        const dimensionError = await checkCoverDimensions(coverFile)
        if (dimensionError) {
          setError('coverFile', { message: dimensionError })
          return
        }
      }
      const hasCover = Boolean(coverImage.trim())
      const imageInfo = {
        caption: coverCaption.trim() || null,
        altText: coverAltText.trim(),
        imageSource: coverSource.trim() || null,
      }

      const selectedCat = categories.find((c) => c.id === categoryId)
      const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean)
      if (!APP_CONFIG.useMockApi) {
        const numericCategoryId = Number(selectedCat?.apiId)
        if (!Number.isSafeInteger(numericCategoryId) || numericCategoryId <= 0) {
          throw new Error('Vui lòng chọn chuyên mục hợp lệ')
        }
        const saved = await contentApi.saveDraft(isEditing ? id : undefined, {
          categoryId: numericCategoryId,
          title: title.trim(), sapo: sapo.trim(), content,
          coverImageUrl: coverImage.trim(),
          tags: tagsArray,
          isPremium,
          price: isPremium ? price : 0,
          changelog,
          imageInfo: !coverFile && hasCover ? imageInfo : undefined,
        }, coverFile, imageInfo)
        navigate(articleVersionEditorPath(saved.id), { replace: !isEditing })
        return
      }

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
        const notes = changelog || (submitForReview ? 'Nộp duyệt bài viết' : 'Cập nhật bản thảo')
        if (coverFile) {
          await editorialApi.updateArticleWithCover(id, articlePayload, coverFile, imageInfo, notes)
        } else {
          await editorialApi.updateArticle(id, articlePayload, notes, hasCover ? imageInfo : undefined)
        }
      } else {
        const created = coverFile
          ? await editorialApi.createArticleWithCover(articlePayload, coverFile, imageInfo)
          : await editorialApi.createArticle(articlePayload)
        if (submitForReview) {
          await editorialApi.updateArticleStatus(created.id, 'IN_REVIEW', 'Gửi duyệt lần đầu')
        }
      }

      navigate('/backoffice/editorial/articles')
    } catch (err: any) {
      if (err instanceof AppApiError) {
        for (const [path, message] of Object.entries(err.fieldErrors ?? {})) {
          const field = editorFieldForApiError(path)
          if (field) setError(field, { type: 'server', message })
        }
      }
      setSaveError(err instanceof Error ? err.message : 'Lỗi lưu bài viết')
    } finally {
      saveInFlight.current = false
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

  if (loadError) {
    return <div className="space-y-3 max-w-5xl mx-auto">
      <p role="alert" className="text-red-600">{loadError}</p>
      <Link to="/backoffice/editorial/articles" className="text-sky-700 underline">Về danh sách bài viết</Link>
    </div>
  }

  if (!APP_CONFIG.useMockApi && isEditing && id && (status === 'PUBLISHED' || isArticleVersionEditorMode(location.search))) {
    if (draftVersion === null) {
      return (
        <p role="alert" className="text-red-700">
          Không xác định được phiên bản bản nháp. Vui lòng mở lại bài viết.
        </p>
      )
    }

    return (
      <ArticleVersionDraftEditor
        key={`${id}:${draftVersion}`}
        articleId={id}
        versionNumber={draftVersion}
        initialTitle={title}
        initialSapo={sapo}
        initialContent={content}
        metadataEditorPath={status === 'DRAFT' ? `/backoffice/editorial/articles/${encodeURIComponent(id)}/edit` : undefined}
      />
    )
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
            onClick={() => handleSave(APP_CONFIG.useMockApi)}
            isLoading={isSaving}
            className="text-xs bg-sky-700 hover:bg-sky-800 font-bold"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            {APP_CONFIG.useMockApi ? 'Gửi kiểm duyệt (Submit)' : 'Lưu và tiếp tục gửi duyệt'}
          </Button>
        </div>
      </div>

      {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
      {/* Editor Body */}
      <fieldset disabled={isSaving} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
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
                  error={fieldErrors.title?.message}
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); clearErrors('title') }}
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
                  error={fieldErrors.sapo?.message}
                  value={sapo}
                  onChange={(e) => { setSapo(e.target.value); clearErrors('sapo') }}
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
                  error={fieldErrors.content?.message}
                  value={content}
                  onChange={(e) => { setContent(e.target.value); clearErrors('content') }}
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
                    error={fieldErrors.changelog?.message}
                    value={changelog}
                    onChange={(e) => { setChangelog(e.target.value); clearErrors('changelog') }}
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
                <Label htmlFor="cat" required>Chuyên mục</Label>
                <select
                  id="cat"
                  value={categoryId}
                  onChange={(e) => { setCategoryId(e.target.value); clearErrors('categoryId') }}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-sky-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.categoryId && <p role="alert" className="mt-1 text-xs text-red-600">{fieldErrors.categoryId.message}</p>}
              </div>

              <div>
                <Label htmlFor="cover">Ảnh đại diện bài viết (URL)</Label>
                <Input
                  id="cover"
                  error={fieldErrors.coverImage?.message}
                  value={coverImage}
                  onChange={(e) => { setCoverImage(e.target.value); setCoverError(''); clearErrors('coverImage') }}
                  placeholder="https://images.unsplash..."
                  disabled={Boolean(coverFile) || isSaving}
                />
                <Label htmlFor="coverFile" className="mt-3 block">Hoặc chọn ảnh từ máy</Label>
                <Input
                  ref={coverFileInput}
                  id="coverFile"
                  error={fieldErrors.coverFile?.message}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleChooseCover}
                  disabled={isSaving}
                />
                <p className="mt-1 text-stone-500">JPEG hoặc PNG, tối đa 5 MB và 4096 × 4096.</p>
                {coverFile && (
                  <div className="mt-2 space-y-2">
                    <p className="break-all">Đã chọn: {coverFile.name}</p>
                    <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={() => {
                      setCoverFile(null)
                      setCoverError('')
                      if (coverFileInput.current) coverFileInput.current.value = ''
                    }}>Bỏ chọn ảnh</Button>
                    <p className="text-stone-500">Ảnh sẽ được tải lên khi bạn lưu bản nháp.</p>
                  </div>
                )}
                {coverPreview && (
                  <div className="mt-2 rounded overflow-hidden border border-slate-200">
                    <img src={coverPreview} alt={coverAltText || 'Xem trước ảnh bìa'} className="w-full h-28 object-cover" />
                  </div>
                )}
                {(coverFile || coverImage.trim()) && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label htmlFor="coverAltText" required>Văn bản thay thế</Label>
                      <Input error={fieldErrors.coverAltText?.message} id="coverAltText" value={coverAltText} maxLength={300}
                        onChange={(event) => { setCoverAltText(event.target.value); clearErrors('coverAltText') }} disabled={isSaving} />
                    </div>
                    <div>
                      <Label htmlFor="coverCaption">Chú thích ảnh</Label>
                      <Input error={fieldErrors.coverCaption?.message} id="coverCaption" value={coverCaption} maxLength={500}
                        onChange={(event) => { setCoverCaption(event.target.value); clearErrors('coverCaption') }} disabled={isSaving} />
                    </div>
                    <div>
                      <Label htmlFor="coverSource">Nguồn ảnh</Label>
                      <Input error={fieldErrors.coverSource?.message} id="coverSource" value={coverSource} maxLength={300}
                        onChange={(event) => { setCoverSource(event.target.value); clearErrors('coverSource') }} disabled={isSaving} />
                    </div>
                  </div>
                )}
                {coverError && <p role="alert" className="mt-2 text-red-700">{coverError}</p>}
              </div>

              <div>
                <Label htmlFor="tags">Thẻ Tag (ngăn cách bằng dấu phẩy)</Label>
                <Input
                  id="tags"
                  error={fieldErrors.tags?.message}
                  value={tags}
                  onChange={(e) => { setTags(e.target.value); clearErrors('tags') }}
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
                      error={fieldErrors.price?.message}
                      type="number"
                      value={price}
                      onChange={(e) => { setPrice(Number(e.target.value)); clearErrors('price') }}
                      step={5000}
                      min={5000}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </fieldset>

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
