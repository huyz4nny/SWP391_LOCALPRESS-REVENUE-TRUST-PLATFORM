import { useEffect, useState } from 'react'
import { contentApi } from '../api'
import type { ArticleDraftDetailResponse } from '../types'

interface ArticleCoverImageProps {
    article: ArticleDraftDetailResponse
}

export function ArticleCoverImage({
                                      article,
                                  }: ArticleCoverImageProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const imageUrl = article.coverImageUrl

    useEffect(() => {
        let active = true
        let objectUrl: string | null = null

        setPreviewUrl(null)
        setError('')
        setLoading(Boolean(imageUrl))

        async function loadImage() {
            if (!imageUrl) return

            try {
                const blob = await contentApi.getCoverImage(imageUrl)

                if (!active) return

                objectUrl = URL.createObjectURL(blob)
                setPreviewUrl(objectUrl)
            } catch (error) {
                if (!active) return

                setError(
                    error instanceof Error
                        ? error.message
                        : 'Không tải được ảnh bìa',
                )
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        void loadImage()

        return () => {
            active = false

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [imageUrl])

    return (
        <section className="space-y-3 rounded-lg border p-4">
            <h2 className="text-lg font-semibold">Ảnh bìa</h2>

            {!imageUrl && (
                <p className="text-sm text-stone-500">
                    Bản nháp chưa có ảnh bìa.
                </p>
            )}

            {loading && (
                <p role="status">Đang tải ảnh...</p>
            )}

            {error && (
                <p role="alert" className="text-sm text-red-700">
                    {error}
                </p>
            )}

            {previewUrl && (
                <figure className="space-y-2">
                    <img
                        src={previewUrl}
                        alt={article.coverAltText ?? ''}
                        className="max-h-96 w-full rounded object-contain"
                    />

                    {article.coverCaption && (
                        <figcaption className="text-sm text-stone-600">
                            {article.coverCaption}
                        </figcaption>
                    )}
                </figure>
            )}

            {imageUrl && article.coverSource && (
                <p className="text-sm text-stone-600">
                    Nguồn ảnh: {article.coverSource}
                </p>
            )}
        </section>
    )
}