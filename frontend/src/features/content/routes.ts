export function articleVersionEditorPath(articleId: string): string {
    return `/backoffice/editorial/articles/${encodeURIComponent(articleId)}/edit?mode=content`
}

export function isArticleVersionEditorMode(search: string): boolean {
    return new URLSearchParams(search).get('mode') === 'content'
}
