import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import type { ReviewArticle } from '../articleEditorAccess'
import { ArticleReviewCover } from './ArticleReviewCover'

export function ArticleReviewPreview({ article }: { article: ReviewArticle }) {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Chi tiết bài viết</h1>
          <p className="text-sm text-slate-600">
            Tác giả: {article.authorName} · Phiên bản v{article.currentVersion}
          </p>
          <StatusBadge type="article" status={article.status} />
        </div>
        <Link to="/backoffice/editorial/articles" className="text-sm text-primary-900 underline">
          Về danh sách bài viết
        </Link>
      </header>
      <p className="text-sm text-slate-600">
        Chế độ xem nội dung. Bạn có thể duyệt, yêu cầu sửa hoặc quản lý xuất bản tại danh sách bài viết.
      </p>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{article.title}</CardTitle>
          <p className="text-sm text-slate-500">
            {article.categoryName} · {article.isPremium ? 'Premium' : 'Miễn phí'}
            {article.updatedAt && ` · Cập nhật: ${formatDateTime(article.updatedAt)}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {article.sapo && <p className="whitespace-pre-wrap font-medium text-slate-700">{article.sapo}</p>}
          <ArticleReviewCover
            key={`${article.id}:${article.currentVersion}:${article.coverImage}`}
            articleId={article.id}
            versionNumber={article.currentVersion}
            imageUrl={article.coverImage ?? ''}
            altText={article.coverAltText || article.title}
            caption={article.coverCaption}
            source={article.coverSource}
          />
          <div className="whitespace-pre-wrap break-words leading-relaxed text-slate-800">
            {article.content || 'Bài viết chưa có nội dung.'}
          </div>
          {article.reviewNotes && (
            <div className="border-t border-slate-200 pt-4">
              <h2 className="mb-2 font-semibold">Phản hồi kiểm duyệt</h2>
              <p className="whitespace-pre-wrap text-slate-700">{article.reviewNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      {!!article.versions?.length && (
        <Card>
          <CardHeader><CardTitle>Các phiên bản của bài viết</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-700">
              {[...article.versions].sort((a, b) => b.versionNumber - a.versionNumber).map(version => (
                <li key={version.versionNumber}>v{version.versionNumber} — {version.title}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
