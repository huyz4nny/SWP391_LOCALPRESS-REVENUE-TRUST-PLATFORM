import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { contentApi } from '../api'
import type { ArticleVersionDetail } from '../types'
import { articleVersionEditorPath } from '../routes'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { AppApiError } from '@/lib/http/errors'
import { formatDateTime } from '@/lib/format'

export function ArticleRevisionDialog({ articleId, versionNumber, onClose, onCreated }: {
    articleId: string
    versionNumber: number
    onClose: () => void
    onCreated: () => void
}) {
    const navigate = useNavigate()
    const [version, setVersion] = useState<ArticleVersionDetail | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [confirm, setConfirm] = useState(false)
    const [busy, setBusy] = useState(false)
    const [blocked, setBlocked] = useState(false)
    const inFlight = useRef(false)

    useEffect(() => {
        let active = true
        void contentApi.getVersion(articleId, versionNumber).then(data => {
            if (!active) return
            setVersion(data)
            if (!data.latest || data.reviewStatus !== 'REJECTED') {
                setBlocked(true)
                setError('Phiên bản không còn ở trạng thái cần sửa mới nhất. Hãy tải lại danh sách.')
            }
        }).catch(() => {
            if (active) setError('Không tải được phản hồi. Hãy đóng và mở lại để thử lại.')
        }).finally(() => {
            if (active) setLoading(false)
        })
        return () => { active = false }
    }, [articleId, versionNumber])

    async function createRevision() {
        if (inFlight.current || !version || blocked) return
        inFlight.current = true
        setBusy(true)
        setError('')
        try {
            await contentApi.restoreVersion(articleId, versionNumber, {
                expectedLatestVersion: versionNumber,
                changelog: `Tạo bản sửa theo phản hồi kiểm duyệt phiên bản ${versionNumber}`,
            })
            setBlocked(true)
            onCreated()
            navigate(articleVersionEditorPath(articleId))
        } catch (err) {
            if (err instanceof AppApiError && err.status === 409) {
                setBlocked(true)
                setError('Bài viết đã thay đổi. Hãy đóng hộp thoại và tải lại danh sách trước khi sửa.')
            } else if (!(err instanceof AppApiError) || !err.status || err.status === 408 || err.status >= 500) {
                setBlocked(true)
                setError('Chưa xác định được kết quả tạo bản sửa. Hãy kiểm tra lịch sử phiên bản trước khi thử lại.')
            } else {
                setError(err.message || 'Không tạo được bản sửa. Vui lòng thử lại.')
            }
        } finally {
            inFlight.current = false
            setBusy(false)
            setConfirm(false)
        }
    }

    return <>
        <Dialog open={!confirm} onClose={() => { if (!inFlight.current) onClose() }} title={`Phản hồi kiểm duyệt — v${versionNumber}`} maxWidth="lg">
            <div className="space-y-4">
                {loading && <p role="status">Đang tải phản hồi...</p>}
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                {version && <>
                    <h2 className="font-semibold text-slate-900">{version.title}</h2>
                    <p className="text-sm text-slate-600">Tạo lúc: {formatDateTime(version.createdAt)}</p>
                    <div className="rounded-lg border border-slate-200 p-4">
                        <h3 className="mb-2 font-semibold">Yêu cầu chỉnh sửa</h3>
                        <p className="whitespace-pre-wrap break-words text-slate-700">
                            {version.reviewFeedback?.trim() || 'Biên tập viên chưa ghi phản hồi chi tiết.'}
                        </p>
                    </div>
                    <p className="text-sm text-slate-600">Tạo bản nháp mới để chỉnh sửa và gửi duyệt lại. Phiên bản này cùng phản hồi được giữ trong lịch sử.</p>
                </>}
                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Đóng</Button>
                    <Button type="button" disabled={loading || !version || blocked || confirm} isLoading={busy} onClick={() => setConfirm(true)}>Tạo bản sửa</Button>
                </div>
            </div>
        </Dialog>
        <ConfirmDialog open={confirm} onClose={() => { if (!inFlight.current) setConfirm(false) }}
            onConfirm={() => { void createRevision() }} isLoading={busy}
            title="Tạo bản nháp để chỉnh sửa?"
            message={`Sao chép nội dung v${versionNumber} sang bản nháp mới. Bản đang xuất bản và phản hồi cũ được giữ nguyên.`}
            confirmText="Tạo bản sửa" cancelText="Quay lại" />
    </>
}
