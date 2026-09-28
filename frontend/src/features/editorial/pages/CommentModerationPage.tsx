import React, { useState, useEffect } from 'react'
import { Comment } from '@/features/reader/types'
import { editorialApi } from '../api'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { MessageSquare, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

export function CommentModerationPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadComments()
  }, [])

  const loadComments = async () => {
    try {
      setLoading(true)
      const data = await editorialApi.getComments()
      setComments(data)
    } finally {
      setLoading(false)
    }
  }

  const handleModerate = async (commentId: string, status: 'APPROVED' | 'REJECTED') => {
    await editorialApi.moderateComment(commentId, status)
    loadComments()
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Kiểm duyệt Bình luận & Báo cáo Vi phạm
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Hàng đợi kiểm duyệt bình luận của độc giả, lọc spam và nội dung độc hại
        </p>
      </div>

      <div className="space-y-3">
        {comments.map((c) => (
          <div
            key={c.id}
            className={`p-4 rounded-xl border bg-white shadow-2xs text-xs space-y-2 ${
              c.reported ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900">{c.userName}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 font-medium">Bài viết: {c.articleTitle || c.articleId}</span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-400">{formatDateTime(c.createdAt)}</span>
              </div>

              <div className="flex items-center space-x-2">
                {c.reported && (
                  <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Bị báo cáo: {c.reportReason}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    c.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {c.status === 'APPROVED' ? 'Đã duyệt' : c.status === 'REJECTED' ? 'Đã chặn' : 'Chờ duyệt'}
                </span>
              </div>
            </div>

            <p className="p-3 bg-slate-50 rounded-lg text-slate-800 leading-relaxed border border-slate-100">
              "{c.content}"
            </p>

            <div className="flex justify-end space-x-2 pt-1">
              {c.status !== 'REJECTED' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleModerate(c.id, 'REJECTED')}
                  className="text-red-700 border-red-200 hover:bg-red-50 text-xs h-7"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Ẩn / Chặn bình luận
                </Button>
              )}
              {c.status !== 'APPROVED' && (
                <Button
                  size="sm"
                  onClick={() => handleModerate(c.id, 'APPROVED')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-7"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Duyệt hiển thị công khai
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
