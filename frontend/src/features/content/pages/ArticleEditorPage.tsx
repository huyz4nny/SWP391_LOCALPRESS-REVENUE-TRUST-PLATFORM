import {useEffect, useState} from 'react'
import type {FormEvent} from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import {ArticleMetadataForm} from '../components/ArticleMetadataForm'
import { ArticleCoverImage } from '../components/ArticleCoverImage'
import { ArticleCoverImageForm } from '../components/ArticleCoverImageForm'

import {contentApi} from '../api'
import type {
    ArticleDraftDetailResponse,
    CategoryOption,
} from '../types'

import {Button} from '@/components/ui/button'
import {Input, Label, Textarea} from '@/components/ui/input'

const emptyForm = {
    categoryId: '',
    title: '',
    sapo: '',
    content: '',
    source: '',
}

export function ArticleEditorPage() {
    const {id} = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] =
        useState<'content' | 'metadata'>('content')

    const [form, setForm] = useState(emptyForm)
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [draft, setDraft] =
        useState<ArticleDraftDetailResponse | null>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const isReadOnly = Boolean(id)

    useEffect(() => {
        let active = true

        async function loadData() {
            setLoading(true)
            setError('')
            setDraft(null)
            setForm(emptyForm)
            setActiveTab('content')

            try {
                const [categoryOptions, article] = await Promise.all([
                    contentApi.getCategories(),
                    id ? contentApi.getDraft(id) : Promise.resolve(null),
                ])

                if (!active) return

                setCategories(categoryOptions)
                setDraft(article)

                setForm(
                    article
                        ? {
                            categoryId: article.categoryId,
                            title: article.title,
                            sapo: article.sapo ?? '',
                            content: article.content,
                            source: article.source ?? '',
                        }
                        : emptyForm,
                )
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Không tải được dữ liệu',
                    )
                }
            } finally {
                if (active) setLoading(false)
            }
        }

        void loadData()

        return () => {
            active = false
        }
    }, [id])

    function changeField(
        field: keyof typeof emptyForm,
        value: string,
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))
    }

    async function handleCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isReadOnly || loading || saving) return

        if (!form.title.trim() || !form.categoryId) {
            setError('Vui lòng nhập tiêu đề và chọn chuyên mục')
            return
        }

        setSaving(true)
        setError('')

        try {
            const created = await contentApi.createDraft({
                categoryId: Number(form.categoryId),
                title: form.title.trim(),
                sapo: form.sapo,
                content: form.content,
                source: form.source,
            })

            navigate(`/content/articles/${created.id}`, {
                replace: true,
            })
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không tạo được bản nháp',
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
            <header className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">
                    {isReadOnly ? 'Chi tiết bản nháp' : 'Soạn bài mới'}
                </h1>

                <Link
                    to="/content/articles/new"
                    className="text-sm text-blue-700 underline"
                >
                    Tạo bài mới
                </Link>
            </header>

            {draft && !loading && (
                <nav
                    aria-label="Các phần của bài viết"
                    className="flex gap-2 border-b pb-3"
                >
                    <Button
                        type="button"
                        variant={activeTab === 'content' ? 'primary' : 'outline'}
                        aria-pressed={activeTab === 'content'}
                        onClick={() => setActiveTab('content')}
                    >
                        Nội dung
                    </Button>

                    <Button
                        type="button"
                        variant={activeTab === 'metadata' ? 'primary' : 'outline'}
                        aria-pressed={activeTab === 'metadata'}
                        onClick={() => setActiveTab('metadata')}
                    >
                        Thông tin & hình ảnh
                    </Button>
                </nav>
            )}

            {loading && <p role="status">Đang tải dữ liệu…</p>}

            {error && (
                <p role="alert" className="text-red-600">
                    {error}
                </p>
            )}

            {draft && (
                <p role="status" className="text-green-700">
                    Bản nháp #{draft.id} — phiên bản {draft.latestVersion}
                </p>
            )}

            {!loading &&
                activeTab === 'content' &&
                (!isReadOnly || draft !== null) && (
                <form onSubmit={handleCreate} className="space-y-5">
                    <fieldset
                        disabled={saving || isReadOnly}
                        className="space-y-5"
                    >
                        <div>
                            <Label htmlFor="title" required>
                                Tiêu đề
                            </Label>
                            <Input
                                id="title"
                                value={form.title}
                                onChange={(e) => changeField('title', e.target.value)}
                                maxLength={255}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="categoryId" required>
                                Chuyên mục
                            </Label>
                            <select
                                id="categoryId"
                                value={form.categoryId}
                                onChange={(e) =>
                                    changeField('categoryId', e.target.value)
                                }
                                className="h-10 w-full rounded-md border border-slate-300 px-3"
                                required
                            >
                                <option value="">Chọn chuyên mục</option>

                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}

                                {draft &&
                                    !categories.some(
                                        (category) => category.id === draft.categoryId,
                                    ) && (
                                        <option value={draft.categoryId}>
                                            Chuyên mục #{draft.categoryId} — ngừng hoạt động
                                        </option>
                                    )}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="sapo">Sapo</Label>
                            <Textarea
                                id="sapo"
                                value={form.sapo}
                                onChange={(e) => changeField('sapo', e.target.value)}
                                maxLength={2000}
                                rows={3}
                            />
                        </div>

                        <div>
                            <Label htmlFor="content">Nội dung</Label>
                            <Textarea
                                id="content"
                                value={form.content}
                                onChange={(e) =>
                                    changeField('content', e.target.value)
                                }
                                maxLength={100000}
                                rows={12}
                            />
                        </div>

                        <div>
                            <Label htmlFor="source">Nguồn</Label>
                            <Input
                                id="source"
                                value={form.source}
                                onChange={(e) => changeField('source', e.target.value)}
                                maxLength={1000}
                            />
                        </div>
                    </fieldset>

                    {!isReadOnly && (
                        <Button
                            type="submit"
                            isLoading={saving}
                            disabled={categories.length === 0}
                        >
                            Tạo bản nháp
                        </Button>
                    )}
                </form>
            )}
            {!loading && draft && activeTab === 'metadata' && (
                <div className="space-y-6">
                    <ArticleMetadataForm
                        key={draft.id}
                        article={draft}
                        categories={categories}
                        onSaved={(updated) => {
                            setDraft(updated)

                            setForm((previous) => ({
                                ...previous,
                                categoryId: updated.categoryId,
                            }))
                        }}
                    />

                    <ArticleCoverImageForm
                        key={draft.id}
                        article={draft}
                        onSaved={(updated) => setDraft(updated)}
                    />

                    <ArticleCoverImage
                        key={`${draft.id}:${draft.coverImageUrl ?? 'no-image'}`}
                        article={draft}
                    />
                </div>
            )}
        </main>
    )
}