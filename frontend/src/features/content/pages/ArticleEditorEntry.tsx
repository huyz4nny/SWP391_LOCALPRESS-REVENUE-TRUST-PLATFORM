import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { APP_CONFIG, PERMISSION_CHECKERS } from '@/app/config'
import { mockStore } from '@/mocks/store'
import { ArticleEditorPage } from '@/features/editorial/pages/ArticleEditorPage'
import { loadArticleEditorAccess, type ReviewArticle } from '../articleEditorAccess'
import { ArticleReviewPreview } from '../components/ArticleReviewPreview'

type EntryState =
  | { key: string; status: 'ready'; article: ReviewArticle; editable: boolean }
  | { key: string; status: 'error'; message: string }

export function ArticleEditorEntry() {
  const { id } = useParams<{ id: string }>()
  const user = mockStore.getCurrentUser()
  const reviewEntry = !APP_CONFIG.useMockApi && !!id && id !== 'new'
    && PERMISSION_CHECKERS.canAccessEditorial(user.role)
  const key = `${user.id}:${user.role}:${id}`
  const [state, setState] = useState<EntryState | null>(null)

  useEffect(() => {
    if (!reviewEntry || !id) return
    let active = true
    void loadArticleEditorAccess(id, user.id).then(result => {
      if (active) setState({ key, status: 'ready', ...result })
    }).catch((error: unknown) => {
      if (active) setState({ key, status: 'error', message: error instanceof Error
        ? error.message : 'Không tải được bài viết để xem kiểm duyệt.' })
    })
    return () => { active = false }
  }, [id, key, reviewEntry, user.id])

  // Authors and new-article flows retain the existing CMS editor and owner checks.
  if (!reviewEntry) return <ArticleEditorPage />
  if (!state || state.key !== key) return <p role="status">Đang tải bài viết...</p>
  if (state.status === 'error') return (
    <div className="space-y-3">
      <p role="alert" className="text-red-700">{state.message}</p>
      <Link to="/backoffice/editorial/articles" className="text-primary-900 underline">Về danh sách bài viết</Link>
    </div>
  )
  if (state.editable) return <ArticleEditorPage />
  return <ArticleReviewPreview article={state.article} />
}
