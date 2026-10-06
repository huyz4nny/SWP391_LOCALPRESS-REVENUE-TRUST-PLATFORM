import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { contentApi } from '../api'
import type {
    ArticleDraftDetailResponse,
    CategoryOption,
} from '../types'

import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

interface ArticleMetadataFormProps {
    article: ArticleDraftDetailResponse
    categories: CategoryOption[]
    onSaved: (article: ArticleDraftDetailResponse) => void
}

export function ArticleMetadataForm({
                                        article,
                                        categories,
                                        onSaved,
                                    }: ArticleMetadataFormProps) {
    const [categoryId, setCategoryId] = useState(article.categoryId)
    const [slug, setSlug] = useState(article.slug)

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const lifecycle = useRef(0)

    useEffect(() => {
        lifecycle.current += 1

        return () => {
            lifecycle.current += 1
        }
    }, [article.id])

    useEffect(() => {
        setCategoryId(article.categoryId)
        setSlug(article.slug)
    }, [article.id, article.categoryId, article.slug])

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (saving) return

        const requestLifecycle = lifecycle.current

        const isCurrent = () =>
            lifecycle.current === requestLifecycle

        setError('')
        setMessage('')

        const selectedCategory = categories.find(
            (category) => category.id === categoryId,
        )

        if (!selectedCategory || !slug.trim()) {
            setError(
                'Vui lòng chọn chuyên mục đang hoạt động và nhập slug',
            )
            return
        }

        setSaving(true)

        try {
            const updated = await contentApi.updateMetadata(
                article.id,
                {
                    categoryId: Number(categoryId),
                    slug: slug.trim(),
                },
            )

            if (!isCurrent()) return

            onSaved(updated)
            setMessage('Đã lưu thông tin bài viết')
        } catch (error) {
            if (!isCurrent()) return

            setError(
                error instanceof Error
                    ? error.message
                    : 'Không lưu được thông tin bài viết',
            )
        } finally {
            if (isCurrent()) {
                setSaving(false)
            }
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-5">
            {error && (
                <p role="alert" className="text-red-600">
                    {error}
                </p>
            )}

            {message && (
                <p role="status" className="text-green-700">
                    {message}
                </p>
            )}

            <fieldset disabled={saving} className="space-y-5">
                <div>
                    <Label htmlFor="metadata-category" required>
                        Chuyên mục
                    </Label>

                    <select
                        id="metadata-category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="h-10 w-full rounded-md border border-slate-300 px-3"
                        required
                    >
                        <option value="">Chọn chuyên mục</option>

                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}

                        {!categories.some(
                            (category) => category.id === article.categoryId,
                        ) && (
                            <option value={article.categoryId} disabled>
                                Chuyên mục #{article.categoryId} — ngừng hoạt động
                            </option>
                        )}
                    </select>
                </div>

                <div>
                    <Label htmlFor="metadata-slug" required>
                        Slug
                    </Label>

                    <Input
                        id="metadata-slug"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        maxLength={280}
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        title="Chữ thường không dấu, số và dấu gạch ngang giữa các từ"
                        required
                    />

                    <p className="mt-1 text-sm text-slate-500">
                        Ví dụ: tin-tuc-hai-phong
                    </p>
                </div>
            </fieldset>

            <Button
                type="submit"
                isLoading={saving}
                disabled={categories.length === 0}
            >
                Lưu thông tin
            </Button>
        </form>
    )
}