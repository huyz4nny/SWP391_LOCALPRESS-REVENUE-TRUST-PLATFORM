import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { contentApi } from '../api'
import { AppApiError } from '@/lib/http/errors'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/StatusBadge'

const schema = z.object({
    title: z.string().trim()
        .min(1, 'Vui lòng nhập tiêu đề')
        .max(255, 'Tiêu đề tối đa 255 ký tự'),
    sapo: z.string().max(2000, 'Sapo tối đa 2000 ký tự'),
    content: z.string().max(100000, 'Nội dung tối đa 100000 ký tự'),
    changelog: z.string().max(2000, 'Ghi chú tối đa 2000 ký tự'),
})

type FormValues = z.infer<typeof schema>

interface Props {
    articleId: string
    versionNumber: number
    initialTitle: string
    initialSapo: string
    initialContent: string
}

export function ArticleVersionDraftEditor({
                                              articleId,
                                              versionNumber,
                                              initialTitle,
                                              initialSapo,
                                              initialContent,
                                          }: Props) {
    const inFlight = useRef(false)
    const [conflict, setConflict] = useState(false)
    const [success, setSuccess] = useState('')

    const {
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: initialTitle,
            sapo: initialSapo,
            content: initialContent,
            changelog: '',
        },
    })

    async function save(values: FormValues) {
        if (inFlight.current || conflict) return

        inFlight.current = true
        setSuccess('')
        clearErrors()

        try {
            const saved = await contentApi.updateVersionContent(
                articleId,
                versionNumber,
                values,
            )

            reset({
                title: saved.title,
                sapo: saved.sapo ?? '',
                content: saved.content,
                changelog: '',
            })

            setSuccess(
                `Đã lưu bản nháp v${saved.versionNumber}. `
                + 'Bản đang xuất bản không thay đổi.',
            )
        } catch (error: unknown) {
            if (error instanceof AppApiError) {
                if (error.status === 409) {
                    setConflict(true)
                }

                const fields = ['title', 'sapo', 'content', 'changelog'] as const

                for (const field of fields) {
                    const message = error.fieldErrors?.[field]
                    if (message) {
                        setError(field, { type: 'server', message })
                    }
                }
            }

            setError('root.server', {
                message: error instanceof Error
                    ? error.message
                    : 'Chưa xác nhận được kết quả lưu. Hãy kiểm tra lại bản nháp.',
            })
        } finally {
            inFlight.current = false
        }
    }

    const textFields = [
        { name: 'sapo', label: 'Sapo', rows: 3 },
        { name: 'content', label: 'Nội dung', rows: 14 },
        { name: 'changelog', label: 'Ghi chú thay đổi', rows: 2 },
    ] as const

    return (
        <div className="mx-auto max-w-5xl space-y-5">
            <header className="space-y-2 border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-bold text-slate-900">
                    Chỉnh sửa bản nháp v{versionNumber}
                </h1>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>Bài viết #{articleId}</span>
                    <StatusBadge type="article" status="DRAFT" />
                </div>

                <p className="text-sm text-slate-600">
                    Chỉ sửa nội dung bản nháp. Không thay đổi ảnh, chuyên mục,
                    giá hoặc bản đang xuất bản.
                </p>
            </header>

            {success && (
                <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
                    {success}
                </p>
            )}

            {errors.root?.server && (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">
                    {errors.root.server.message}
                </p>
            )}

            {conflict && (
                <p role="alert" className="text-sm text-amber-800">
                    Bản nháp không còn chỉnh sửa được hoặc không còn là bản mới nhất.
                    Nội dung bạn đang nhập vẫn được giữ trên màn hình.
                    Hãy sao chép phần cần giữ trước khi về danh sách và mở lại bản mới nhất.
                </p>
            )}

            <form
                onSubmit={handleSubmit(save)}
                className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
            >
                <fieldset disabled={isSubmitting} className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="version-title">Tiêu đề</Label>
                        <Input id="version-title" {...register('title')} />
                        {errors.title && (
                            <p className="text-sm text-red-600">{errors.title.message}</p>
                        )}
                    </div>

                    {textFields.map((field) => (
                        <div key={field.name} className="space-y-1">
                            <Label htmlFor={`version-${field.name}`}>{field.label}</Label>
                            <Textarea
                                id={`version-${field.name}`}
                                rows={field.rows}
                                {...register(field.name)}
                            />
                            {errors[field.name] && (
                                <p className="text-sm text-red-600">
                                    {errors[field.name]?.message}
                                </p>
                            )}
                        </div>
                    ))}
                </fieldset>

                <div className="flex items-center justify-between gap-3">
                    {!isSubmitting && (
                        <Link
                            to="/backoffice/editorial/articles"
                            className="text-sm text-primary-900 underline"
                        >
                            Về danh sách
                        </Link>
                    )}

                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        disabled={conflict}
                    >
                        Lưu bản nháp v{versionNumber}
                    </Button>
                </div>
            </form>
        </div>
    )
}