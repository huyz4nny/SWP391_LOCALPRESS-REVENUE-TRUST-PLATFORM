import { editorialApi } from '@/features/editorial/api'
import type { Article, ArticleVersion } from '@/features/reader/types'
import type { ArticleVersionReviewStatus } from './types'

export type ReviewArticle = Omit<Article, 'versions'> & {
  versions?: Array<ArticleVersion & { reviewStatus?: ArticleVersionReviewStatus }>
}

export function canEditOwnedDraft(article: ReviewArticle, userId: string): boolean {
  if (article.authorId !== userId) return false
  if (article.status === 'DRAFT') return true
  return article.status === 'PUBLISHED'
    && article.versions?.some(version => version.versionNumber === article.currentVersion
      && version.reviewStatus === 'DRAFT') === true
}

export async function loadArticleEditorAccess(articleId: string, userId: string) {
  const article: ReviewArticle = await editorialApi.getArticle(articleId)
  return { article, editable: canEditOwnedDraft(article, userId) }
}
