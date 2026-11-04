import {useEffect, useRef, useState} from 'react'
import {contentApi} from '../api'
import type {
    ArticleVersionDetail,
    ArticleVersionReviewStatus,
    ArticleVersionSummary,
} from '../types'
import {Dialog} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {EmptyState} from '@/components/shared/EmptyState'
import {StatusBadge} from '@/components/shared/StatusBadge'
import {formatDateTime} from '@/lib/format'
import {ConfirmDialog} from '@/components/shared/ConfirmDialog'
import {AppApiError} from '@/lib/http/errors'

type LoadState<T> =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: T }

interface Props {
    articleId: string
    onClose: () => void
    onRestored?: () => void
}

interface RestoreTarget {
    sourceVersion: number
    expectedLatestVersion: number
}

// Chuyển trạng thái backend sang nhãn có sẵn của giao diện.
// Không thay đổi dữ liệu gửi lên backend.
const reviewStatusMap: Record<ArticleVersionReviewStatus, string> = {
    DRAFT: 'DRAFT',
    PENDING: 'IN_REVIEW',
    APPROVED: 'APPROVED',
    REJECTED: 'CHANGES_REQUESTED',
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Không tải được dữ liệu phiên bản.'
}

function LoadError({
                       message,
                       onRetry,
                   }: {
    message: string
    onRetry: () => void
}) {
    return (
        <div className="space-y-3">
            <p role="alert" className="text-sm text-red-700">
                {message}
            </p>

            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Thử lại
            </Button>
        </div>
    )
}

function VersionContent({
                            articleId,
                            versionNumber,
                        }: {
    articleId: string
    versionNumber: number
}) {
    const [state, setState] = useState<LoadState<ArticleVersionDetail>>({
        status: 'loading',
    })
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        let active = true

        async function load() {
            try {
                const data = await contentApi.getVersion(articleId, versionNumber)

                if (active) {
                    setState({status: 'ready', data})
                }
            } catch (error: unknown) {
                if (active) {
                    setState({
                        status: 'error',
                        message: getErrorMessage(error),
                    })
                }
            }
        }

        void load()

        // Bỏ qua phản hồi cũ khi đóng dialog hoặc chọn phiên bản khác.
        return () => {
            active = false
        }
    }, [articleId, versionNumber, attempt])

    function retry() {
        setState({status: 'loading'})
        setAttempt((value) => value + 1)
    }

    if (state.status === 'loading') {
        return <p role="status">Đang tải nội dung phiên bản...</p>
    }

    if (state.status === 'error') {
        return <LoadError message={state.message} onRetry={retry}/>
    }

    const version = state.data
    const changelog = version.metadata?.changelog

    return (
        <article className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Phiên bản {version.versionNumber}</span>

                <StatusBadge
                    type="article"
                    status={reviewStatusMap[version.reviewStatus]}
                />

                {version.published && (
                    <StatusBadge type="article" status="PUBLISHED"/>
                )}

                {version.latest && (
                    <span className="text-xs text-slate-500">Mới nhất</span>
                )}
            </div>

            <p className="text-xs text-slate-500">
                Tạo lúc: {formatDateTime(version.createdAt)}
                {' · '}
                ID người chỉnh sửa: {version.editedBy}
            </p>

            <h4 className="break-words font-serif text-xl font-bold text-slate-900">
                {version.title}
            </h4>

            {version.sapo && (
                <p className="whitespace-pre-wrap break-words font-medium text-slate-700">
                    {version.sapo}
                </p>
            )}

            <section className="space-y-2 border-t border-slate-200 pt-4">
                <h5 className="font-semibold">Nội dung</h5>

                {/* Hiển thị văn bản an toàn, không thực thi HTML từ bản thảo. */}
                <div className="whitespace-pre-wrap break-words leading-7 text-slate-700">
                    {version.content}
                </div>
            </section>

            {typeof changelog === 'string' && changelog.trim() && (
                <section className="rounded-lg bg-slate-50 p-3">
                    <h5 className="font-semibold">Ghi chú thay đổi</h5>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                        {changelog}
                    </p>
                </section>
            )}

            {version.reviewFeedback && (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <h5 className="font-semibold">Phản hồi kiểm duyệt</h5>
                    <p className="mt-1 whitespace-pre-wrap break-words">
                        {version.reviewFeedback}
                    </p>
                </section>
            )}
        </article>
    )
}

export function ArticleVersionHistoryDialog({
                                                articleId,
                                                onClose,
                                                onRestored,
                                            }: Props) {
    const [state, setState] = useState<LoadState<ArticleVersionSummary[]>>({
        status: 'loading',
    })
    const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
    const [attempt, setAttempt] = useState(0)

    const [restoreTarget, setRestoreTarget] = useState<RestoreTarget | null>(null)
    const [isRestoring, setIsRestoring] = useState(false)
    const [restoreError, setRestoreError] = useState('')
    const [restoreSuccess, setRestoreSuccess] = useState('')

    const restoreInFlight = useRef(false)

    const latestVersion =
        state.status === 'ready'
            ? state.data.find((version) => version.latest)
            : undefined

    const restoreBlocked =
        latestVersion?.reviewStatus === 'PENDING' ||
        (
            latestVersion?.reviewStatus === 'APPROVED' &&
            !latestVersion.published
        )

    useEffect(() => {
        let active = true

        async function load() {
            try {
                const data = await contentApi.getVersions(articleId)

                if (!active) return

                const versions = [...data].sort(
                    (a, b) => b.versionNumber - a.versionNumber,
                )

                const initialVersion =
                    versions.find((version) => version.latest) ?? versions[0]

                setSelectedVersion(initialVersion?.versionNumber ?? null)
                setState({status: 'ready', data: versions})
            } catch (error: unknown) {
                if (active) {
                    setState({
                        status: 'error',
                        message: getErrorMessage(error),
                    })
                }
            }
        }

        void load()

        return () => {
            active = false
        }
    }, [articleId, attempt])

    function reload() {
        setSelectedVersion(null)
        setState({status: 'loading'})
        setAttempt((value) => value + 1)
    }

    function requestRestore() {
        if (
            restoreInFlight.current ||
            selectedVersion === null ||
            !latestVersion ||
            (selectedVersion === latestVersion.versionNumber && !latestVersion.published) ||
            restoreBlocked
        ) {
            return
        }

        setRestoreError('')
        setRestoreSuccess('')

        // Lưu lại phiên bản mới nhất tại thời điểm mở xác nhận.
        setRestoreTarget({
            sourceVersion: selectedVersion,
            expectedLatestVersion: latestVersion.versionNumber,
        })
    }

    function cancelRestore() {
        if (restoreInFlight.current) return
        setRestoreTarget(null)
    }

    async function confirmRestore() {
        if (!restoreTarget || restoreInFlight.current) return

        restoreInFlight.current = true
        setIsRestoring(true)

        let restored: ArticleVersionDetail | null = null

        try {
            restored = await contentApi.restoreVersion(
                articleId,
                restoreTarget.sourceVersion,
                {
                    expectedLatestVersion: restoreTarget.expectedLatestVersion,
                    changelog:
                        `Khôi phục nội dung từ phiên bản ${restoreTarget.sourceVersion}`,
                },
            )

            setRestoreSuccess(
                `Đã tạo bản nháp v${restored.versionNumber} từ `
                + `v${restoreTarget.sourceVersion}. Bản đang xuất bản không thay đổi.`,
            )
        } catch (error: unknown) {
            if (error instanceof AppApiError && error.status === 409) {
                setRestoreError(
                    `${error.message}. Lịch sử sẽ được tải lại. `
                    + 'Hãy kiểm tra trước khi xác nhận khôi phục lần nữa.',
                )
            } else if (error instanceof AppApiError) {
                setRestoreError(getErrorMessage(error))
            } else {
                setRestoreError(
                    'Chưa xác nhận được kết quả khôi phục. '
                    + 'Hãy kiểm tra lịch sử sau khi tải lại trước khi thử lại, '
                    + 'vì yêu cầu có thể đã được máy chủ xử lý.',
                )
            }
        } finally {
            restoreInFlight.current = false
            setIsRestoring(false)
            setRestoreTarget(null)

            // Chỉ tải lại dữ liệu, không tự gửi lại POST khôi phục.
            reload()
        }

        if (restored) {
            onRestored?.()
        }
    }

    if (restoreTarget !== null) {
        return (
            <ConfirmDialog
                open
                onClose={cancelRestore}
                onConfirm={() => {
                    void confirmRestore()
                }}
                title={`Khôi phục phiên bản ${restoreTarget.sourceVersion}?`}
                message={
                    `Hệ thống sẽ sao chép nội dung v${restoreTarget.sourceVersion} `
                    + 'thành một phiên bản nháp mới. '
                    + 'Các phiên bản hiện có và bản đang xuất bản không bị ghi đè. '
                    + 'Bản nháp mới cần được gửi duyệt trước khi xuất bản.'
                }
                confirmText="Tạo bản nháp khôi phục"
                cancelText="Quay lại"
                isLoading={isRestoring}
            />
        )
    }

    return (
        <Dialog
            open
            onClose={onClose}
            title="Lịch sử phiên bản"
            description={
                `Bài viết #${articleId} — xem lịch sử hoặc khôi phục thành bản nháp mới.`
            }
            maxWidth="4xl"
        >
            {restoreSuccess && (
                <p
                    role="status"
                    className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                    {restoreSuccess}
                </p>
            )}

            {restoreError && (
                <p
                    role="alert"
                    className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
                >
                    {restoreError}
                </p>
            )}
            <div className="max-h-[65vh] overflow-y-auto text-sm">
                {state.status === 'loading' && (
                    <p role="status">Đang tải lịch sử phiên bản...</p>
                )}

                {state.status === 'error' && (
                    <LoadError message={state.message} onRetry={reload}/>
                )}

                {state.status === 'ready' && (
                    state.data.length === 0 ? (
                        <EmptyState
                            title="Chưa có phiên bản"
                            description="Bài viết chưa có dữ liệu lịch sử phiên bản."
                        />
                    ) : (
                        <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
                            <aside className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {state.data.length} phiên bản
                  </span>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={reload}
                                    >
                                        Tải lại
                                    </Button>
                                </div>

                                {state.data.map((version) => (
                                    <button
                                        key={version.versionNumber}
                                        type="button"
                                        aria-pressed={selectedVersion === version.versionNumber}
                                        onClick={() => setSelectedVersion(version.versionNumber)}
                                        className={`w-full space-y-2 rounded-lg border p-3 text-left ${
                                            selectedVersion === version.versionNumber
                                                ? 'border-primary-900 bg-slate-50'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <strong>v{version.versionNumber}</strong>
                                            {version.latest && (
                                                <span className="text-xs text-slate-500">
                          Mới nhất
                        </span>
                                            )}
                                        </div>

                                        <p className="line-clamp-2 break-words">{version.title}</p>

                                        <StatusBadge
                                            type="article"
                                            status={reviewStatusMap[version.reviewStatus]}
                                        />

                                        {version.published && (
                                            <div>
                                                <StatusBadge type="article" status="PUBLISHED"/>
                                            </div>
                                        )}

                                        <p className="text-xs text-slate-500">
                                            {formatDateTime(version.createdAt)}
                                        </p>
                                    </button>
                                ))}
                            </aside>

                            <div className="min-w-0 rounded-lg border border-slate-200 p-4">
                                {selectedVersion !== null && (
                                    <>
                                        <VersionContent
                                            key={`${articleId}:${selectedVersion}`}
                                            articleId={articleId}
                                            versionNumber={selectedVersion}
                                        />

                                        <div className="mt-5 space-y-2 border-t border-slate-200 pt-4">
                                            {latestVersion &&
                                                (selectedVersion !== latestVersion.versionNumber || latestVersion.published) && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={requestRestore}
                                                        disabled={restoreBlocked}
                                                    >
                                                        Khôi phục từ v{selectedVersion}
                                                    </Button>
                                                )}

                                            {restoreBlocked ? (
                                                <p className="text-xs text-amber-700">
                                                    Phiên bản mới nhất đang chờ duyệt hoặc chờ xuất bản.
                                                    Chưa thể khôi phục.
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500">
                                                    Khôi phục tạo bản nháp mới, không thay đổi bản đang xuất bản.
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>
        </Dialog>
    )
}