// Tác dụng: UC041-UC042 — bình luận (xem, gửi, sửa, báo cáo) và báo lỗi nội dung bài viết.
import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { Comment } from '../types'
import { bodyId, idSegment, unwrapList } from './shared'

function mapComment(dto: Partial<Comment> & { id?: string | number; articleId?: string | number; userId?: string | number }): Comment {
  return {
    id: String(dto.id ?? ''),
    articleId: String(dto.articleId ?? ''),
    articleTitle: dto.articleTitle,
    userId: String(dto.userId ?? ''),
    userName: dto.userName ?? '',
    userAvatar: dto.userAvatar,
    content: dto.content ?? '',
    status: dto.status ?? 'APPROVED',
    createdAt: dto.createdAt ?? '',
    likeCount: dto.likeCount ?? 0,
    reported: dto.reported ?? false,
    reportReason: dto.reportReason,
  }
}

export const commentsApi = {
  // UC031 lấy bình luận đã duyệt của bài (rule 12) cho CommentSection
  // đường dẫn mock và backend thật khác nhau nên chọn theo cờ useMockApi
  getComments: async (articleId: string) => {
    const path = APP_CONFIG.useMockApi
      ? `/reader/comments/${encodeURIComponent(articleId)}`
      : `/comments/article/${encodeURIComponent(articleId)}`
    const data = await httpClient.get<Array<Partial<Comment>>>(path)
    return unwrapList(data).map(mapComment)
  },

  postComment: async (articleId: string, content: string) => {
    const data = await httpClient.post<Partial<Comment>>('/reader/comments', {
      articleId: bodyId(articleId),
      content,
    })
    return mapComment(data)
  },

  // sửa bình luận của chính mình, backend đưa status về PENDING
  updateComment: async (commentId: string, content: string) => {
    const data = await httpClient.put<Partial<Comment>>(`/reader/comments/${idSegment(commentId)}`, { content })
    return mapComment(data)
  },

  // bình luận của user đang đăng nhập, kể cả đang chờ duyệt
  getMyComments: async (articleId: string) => {
    const data = await httpClient.get<Array<Partial<Comment>>>('/reader/comments/mine', {
      params: { articleId: bodyId(articleId) },
    })
    return unwrapList(data).map(mapComment)
  },

  // chỉ comment đang APPROVED mới báo cáo được
  reportComment: (commentId: string, reason: string) => {
    return httpClient.post<{ commentId: string | number; status: string }>(
      `/reader/comments/${idSegment(commentId)}/report`,
      { reason },
    )
  },

  // UC042 báo lỗi nội dung bài đang xuất bản, server tự gắn user và status PENDING
  reportArticle: (articleId: string, reason: string, description: string) => {
    return httpClient.post<{ reportId: number; status: string }>('/reader/article-reports', {
      articleId: bodyId(articleId),
      reason,
      description,
    })
  },
}
