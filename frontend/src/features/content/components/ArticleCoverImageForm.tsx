import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import { contentApi } from '../api'
import type { ArticleDraftDetailResponse } from '../types'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

interface ArticleCoverImageFormProps {
    article: ArticleDraftDetailResponse
    onSaved: (article: ArticleDraftDetailResponse) => void
}

export function ArticleCoverImageForm({
                                          article,
                                          onSaved,
                                      }: ArticleCoverImageFormProps) {
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [caption, setCaption] = useState(article.coverCaption ?? '')
    const [altText, setAltText] = useState(article.coverAltText ?? '')
    const [imageSource, setImageSource] = useState(article.coverSource ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const fileInput = useRef<HTMLInputElement>(null)
    const lifecycle = useRef(0)

    useEffect(() => {if (saving) return
        lifecycle.current += 1

        return () => {
            lifecycle.current += 1
        }
    }, [article.id])

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null)
            return
        }

        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)

        return () => {
            URL.revokeObjectURL(objectUrl)
        }
    }, [file])

    useEffect(() => {
        setCaption(article.coverCaption ?? '')
        setAltText(article.coverAltText ?? '')
        setImageSource(article.coverSource ?? '')
    }, [
        article.id,
        article.coverCaption,
        article.coverAltText,
        article.coverSource,
    ])

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (saving) return

        const requestLifecycle = lifecycle.current

        const isCurrent = () =>
            lifecycle.current === requestLifecycle

        setError('')
        setMessage('')

        if (!file && !article.coverImageUrl) {
            setError('Vui lòng chọn ảnh bìa trước')
            return
        }

        if (file && file.size > 5 * 1024 * 1024) {
            setError('Ảnh tối đa 5 MB')
            return
        }

        if (!altText.trim()) {
            setError('Vui lòng nhập văn bản thay thế')
            return
        }

        const info = {
            caption: caption.trim() || null,
            altText: altText.trim(),
            imageSource: imageSource.trim() || null,
        }

        setSaving(true)
        let uploaded = false

        try {
            if (file) {
                await contentApi.uploadCoverImage(
                    article.id,
                    file,
                    info,
                )

                if (!isCurrent()) return

                uploaded = true
                setFile(null)

                if (fileInput.current) {
                    fileInput.current.value = ''
                }

                const updated = await contentApi.getDraft(article.id)

                if (!isCurrent()) return

                onSaved(updated)
                setMessage('Đã lưu ảnh bìa mới')
            } else {
                const updated = await contentApi.updateCoverImageInfo(
                    article.id,
                    info,
                )

                if (!isCurrent()) return

                onSaved(updated)
                setMessage('Đã lưu thông tin ảnh')
            }
        } catch (error) {
            if (!isCurrent()) return

            const detail = error instanceof Error
                ? error.message
                : 'Không lưu được thông tin ảnh'

            setError(
                uploaded
                    ? `Ảnh đã lưu nhưng chưa tải lại được bản nháp: ${detail}`
                    : detail,
            )
        } finally {
            if (isCurrent()) {
                setSaving(false)
            }
        }
    }

    return (
        <form
            onSubmit={handleSave}
            className="space-y-4 rounded-lg border p-4"
        >
            <h2 className="text-lg font-semibold">
                Quản lý ảnh bìa
            </h2>

            {error && (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            )}

            {message && (
                <p role="status" className="text-sm text-green-700">
                    {message}
                </p>
            )}

            <fieldset disabled={saving} className="space-y-4">
                <div>
                    <Label htmlFor="cover-file">File ảnh</Label>
                    <input
                        ref={fileInput}
                        id="cover-file"
                        type="file"
                        accept="image/jpeg,image/png"
                        required={!article.coverImageUrl}
                        onChange={(event) => {
                            setFile(event.target.files?.[0] ?? null)
                            setError('')
                            setMessage('')
                        }}
                        className="block w-full"
                    />
                    <p className="text-sm text-stone-500">
                        JPEG hoặc PNG, tối đa 5 MB và 4096 × 4096.
                    </p>
                </div>

                {file && previewUrl && (
                    <figure className="space-y-2 rounded border p-3">
                        <figcaption className="text-sm font-medium">
                            Ảnh đang chọn — chưa lưu
                        </figcaption>

                        <img
                            key={previewUrl}
                            src={previewUrl}
                            alt={altText.trim() || 'Ảnh đang chọn'}
                            className="max-h-72 w-full rounded object-contain"
                            onError={() => {
                                setError(
                                    'Không xem trước được file. Vui lòng chọn ảnh JPEG hoặc PNG hợp lệ.',
                                )
                            }}
                        />

                        <p className="break-all text-sm text-stone-500">
                            {file.name}
                        </p>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setFile(null)
                                setError('')
                                setMessage('')

                                if (fileInput.current) {
                                    fileInput.current.value = ''
                                }
                            }}
                        >
                            Bỏ chọn ảnh
                        </Button>
                    </figure>
                )}

                <div>
                    <Label htmlFor="cover-caption">Chú thích</Label>
                    <Input
                        id="cover-caption"
                        value={caption}
                        maxLength={500}
                        onChange={(event) => setCaption(event.target.value)}
                    />
                </div>

                <div>
                    <Label htmlFor="cover-alt">Văn bản thay thế</Label>
                    <Input
                        id="cover-alt"
                        value={altText}
                        required
                        maxLength={300}
                        onChange={(event) => setAltText(event.target.value)}
                    />
                </div>

                <div>
                    <Label htmlFor="cover-source">Nguồn ảnh</Label>
                    <Input
                        id="cover-source"
                        value={imageSource}
                        maxLength={300}
                        onChange={(event) => setImageSource(event.target.value)}
                    />
                </div>

                <Button
                    type="submit"
                    isLoading={saving}
                    disabled={!file && !article.coverImageUrl}
                >
                    {file ? 'Lưu ảnh bìa mới' : 'Lưu thông tin ảnh'}
                </Button>
            </fieldset>
        </form>
    )
}