import { useEffect, useRef, useState } from 'react'
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

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
    metadataEditorPath?: string
}

export function ArticleVersionDraftEditor({
                                              articleId,
                                              versionNumber,
                                              initialTitle,
                                              initialSapo,
                                              initialContent,
                                              metadataEditorPath,
                                          }: Props) {
    const inFlight = useRef(false)
    const [conflict, setConflict] = useState(false)
    const [success, setSuccess] = useState('')
    const [confirmSubmit, setConfirmSubmit] = useState(false)
    const [sending, setSending] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [submissionUncertain, setSubmissionUncertain] = useState(false)
    const [revisionFeedback, setRevisionFeedback] = useState<string | null>(null)
    const [feedbackError, setFeedbackError] = useState('')

    useEffect(() => {
        let active = true
        void contentApi.getVersion(articleId, versionNumber).then(async draft => {
            const sourceVersion = draft.metadata.restoredFromVersion
            if (typeof sourceVersion !== 'number' || !Number.isSafeInteger(sourceVersion) || sourceVersion < 1) return
            const source = await contentApi.getVersion(articleId, sourceVersion)
            if (active && source.reviewStatus === 'REJECTED') {
                setRevisionFeedback(source.reviewFeedback?.trim() || 'Biên tập viên chưa ghi phản hồi chi tiết.')
            }
        }).catch(() => {
            if (active) setFeedbackError('Không tải được phản hồi cũ. Bạn có thể xem lại trong lịch sử phiên bản.')
        })
        return () => { active = false }
    }, [articleId, versionNumber])

    const {
        register,
        handleSubmit,
        reset,
        setError,
        clearErrors,
        getValues,
        formState: { errors, isSubmitting, isDirty },
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
        if (inFlight.current || conflict || submitted || submissionUncertain || confirmSubmit) return

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

    function requestSubmission() {
        if (inFlight.current || isSubmitting || conflict || submitted || submissionUncertain) return
        clearErrors()
        if (isDirty) {
            setError('root.server', { message: 'Vui lòng lưu thay đổi trước khi gửi duyệt.' })
            return
        }
        const values = getValues()
        if (!values.title.trim()) {
            setError('title', { message: 'Vui lòng nhập tiêu đề trước khi gửi duyệt.' })
            return
        }
        if (!values.content.trim()) {
            setError('content', { message: 'Vui lòng nhập nội dung trước khi gửi duyệt.' })
            return
        }
        setConfirmSubmit(true)
    }

    async function submitForReview() {
        if (inFlight.current || isDirty || conflict || submitted || submissionUncertain) return
        inFlight.current = true
        setSending(true)
        setSuccess('')
        clearErrors()
        try {
            await contentApi.submitVersionForReview(articleId, versionNumber)
            setSubmitted(true)
            setSuccess(
                `Đã gửi phiên bản v${versionNumber} đi duyệt. `
                + 'Phiên bản này không còn chỉnh sửa được; bản đang xuất bản không thay đổi.',
            )
        } catch (error: unknown) {
            if (error instanceof AppApiError && error.status === 409) {
                setConflict(true)
            }
            // A transport error/5xx can happen after the server committed the submission.
            // Require checking history instead of blindly submitting or saving again.
            const uncertain = !(error instanceof AppApiError)
                || error.status === 0 || error.status === 408 || error.status >= 500
            setSubmissionUncertain(uncertain)
            setError('root.server', {
                message: uncertain
                    ? 'Chưa xác nhận được kết quả gửi duyệt. Hãy về danh sách và kiểm tra lịch sử phiên bản trước khi thử lại.'
                    : error.message,
            })
        } finally {
            inFlight.current = false
            setSending(false)
            setConfirmSubmit(false)
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
                    {submitted ? 'Phiên bản chờ duyệt' : 'Chỉnh sửa bản nháp'} v{versionNumber}
                </h1>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>Bài viết #{articleId}</span>
                    <StatusBadge type="article" status={submitted ? 'IN_REVIEW' : 'DRAFT'} />
                </div>

                <p className="text-sm text-slate-600">
                    {metadataEditorPath
                        ? 'Bản nháp đã được lưu. Bạn có thể chỉnh tiếp nội dung hoặc gửi phiên bản này đi duyệt.'
                        : 'Chỉnh nội dung bản nháp trước khi gửi duyệt. Bản đang xuất bản được giữ nguyên.'}
                </p>
            </header>

            {revisionFeedback !== null && (
                <section className="rounded-lg border border-slate-200 p-4">
                    <h2 className="mb-2 font-semibold text-slate-900">Phản hồi cần chỉnh sửa</h2>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{revisionFeedback}</p>
                </section>
            )}
            {feedbackError && <p role="alert" className="text-sm text-red-700">{feedbackError}</p>}
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
                <fieldset disabled={isSubmitting || sending || submitted || confirmSubmit} className="space-y-4">
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

                {isDirty && !submitted && (
                    <p className="text-sm text-slate-600">
                        Có thay đổi chưa lưu. Hãy lưu bản nháp trước khi gửi duyệt.
                    </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    {metadataEditorPath && !isDirty && !isSubmitting && !sending && !submitted && !conflict && !submissionUncertain && !confirmSubmit && (
                        <Link to={metadataEditorPath} className="text-sm text-primary-900 underline">
                            Sửa ảnh, chuyên mục và giá
                        </Link>
                    )}
                    {!isSubmitting && !sending && (
                        <Link
                            to="/backoffice/editorial/articles"
                            className="text-sm text-primary-900 underline"
                        >
                            Về danh sách
                        </Link>
                    )}

                    {!submitted && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="submit"
                                variant="outline"
                                isLoading={isSubmitting}
                                disabled={conflict || sending || submissionUncertain || confirmSubmit}
                            >
                                Lưu bản nháp v{versionNumber}
                            </Button>
                            <Button
                                type="button"
                                onClick={requestSubmission}
                                disabled={isSubmitting || sending || isDirty || conflict || submissionUncertain}
                            >
                                Gửi duyệt v{versionNumber}
                            </Button>
                        </div>
                    )}
                </div>
            </form>

            {/* Outside the form: shared dialog buttons must not trigger a draft save. */}
            <ConfirmDialog
                open={confirmSubmit}
                onClose={() => {
                    if (!inFlight.current) setConfirmSubmit(false)
                }}
                onConfirm={() => { void submitForReview() }}
                title={`Gửi phiên bản v${versionNumber} đi duyệt?`}
                message="Hệ thống gửi nội dung đã lưu. Sau khi gửi, phiên bản sẽ bị khóa chỉnh sửa trong khi chờ duyệt. Bản đang xuất bản vẫn được giữ nguyên."
                confirmText="Xác nhận gửi duyệt"
                cancelText="Quay lại"
                isLoading={sending}
            />
        </div>
    )
}
