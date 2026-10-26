import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Edit } from 'lucide-react'
import { APP_CONFIG, PERMISSION_CHECKERS } from '@/app/config'
import { mockStore } from '@/mocks/store'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { ArticleVersionReviewStatus } from '../types'
import { ArticleVersionHistoryDialog } from './ArticleVersionHistoryDialog'
import { ArticleRevisionDialog } from './ArticleRevisionDialog'

interface VersionedArticle {
  id: string
  authorId: string
  status: string
  currentVersion: number
  latestReviewStatus?: ArticleVersionReviewStatus
  publishedVersion?: number | null
}

const statusMap: Record<ArticleVersionReviewStatus, string> = {
  DRAFT: 'DRAFT',
  PENDING: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'CHANGES_REQUESTED',
}

// Content owns version presentation; editorial only supplies a list item.
export function ArticleVersionCell({ article }: { article: VersionedArticle }) {
  return (
    <div className="space-y-2">
      <span className="block font-mono text-slate-700">v{article.currentVersion}</span>
      {article.latestReviewStatus && (
        <StatusBadge type="article" status={statusMap[article.latestReviewStatus]} />
      )}
    </div>
  )
}

export function ArticlePublishedVersionNote({ article }: { article: VersionedArticle }) {
  if (article.status !== 'PUBLISHED') return null
  return (
    <p className="text-xs text-slate-600">
      {article.publishedVersion != null
        ? `Đang xuất bản: v${article.publishedVersion}`
        : 'Chưa có thông tin phiên bản xuất bản'}
    </p>
  )
}

export function ArticleVersionActions({ article, onRestored }: {
  article: VersionedArticle
  onRestored: () => void
}) {
  const [open, setOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const user = mockStore.getCurrentUser()
  const allowed = !APP_CONFIG.useMockApi
    && PERMISSION_CHECKERS.canComposeArticles(user.role)
    && article.authorId === user.id

  if (!allowed) return null

  const canEdit = article.status === 'PUBLISHED'
    && article.latestReviewStatus === 'DRAFT'
    && article.publishedVersion != null
    && article.currentVersion > article.publishedVersion

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Lịch sử
      </Button>
      {canEdit && (
        <Link
          to={`/backoffice/editorial/articles/${encodeURIComponent(article.id)}/edit`}
          className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
        >
          <Edit className="mr-1 h-3 w-3" /> Sửa bản nháp v{article.currentVersion}
        </Link>
      )}
      {article.latestReviewStatus === 'REJECTED' && (article.status === 'CHANGES_REQUESTED' || article.status === 'REJECTED' || article.status === 'PUBLISHED') && (
        <Button type="button" variant="outline" size="sm" onClick={() => setRevisionOpen(true)}>
          Xem phản hồi / Sửa bài
        </Button>
      )}
      {revisionOpen && (
        <ArticleRevisionDialog key={`${article.id}:${article.currentVersion}`} articleId={article.id}
          versionNumber={article.currentVersion} onClose={() => setRevisionOpen(false)} onCreated={onRestored} />
      )}
      {open && (
        <ArticleVersionHistoryDialog
          key={`${user.id}:${user.role}:${article.id}`}
          articleId={article.id}
          onClose={() => setOpen(false)}
          onRestored={onRestored}
        />
      )}
    </>
  )
}
