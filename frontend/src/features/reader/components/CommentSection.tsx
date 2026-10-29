import React, { useEffect, useState } from 'react'
import { Comment } from '../types'
import { readerApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatRelativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { MessageSquare, Send, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

interface CommentSectionProps {
  articleId: string
}

const STATUS_LABEL: Record<Comment['status'], string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Không được duyệt',
  HIDDEN: 'Đã ẩn',
}

// UC041 gửi và sửa bình luận, UC042 báo cáo comment đang hiện
// bình luận mới và vừa sửa ở PENDING nên không nằm trong danh sách công khai
export function CommentSection({ articleId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [mine, setMine] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [reportingId, setReportingId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const currentUser = mockStore.getCurrentUser()
  const signedIn = currentUser.role !== 'GUEST'

  useEffect(() => {
    loadComments()
  }, [articleId])

  const loadComments = async () => {
    try {
      const approved = await readerApi.getComments(articleId)
      setComments(approved)
      if (mockStore.getCurrentUser().role !== 'GUEST') {
        setMine(await readerApi.getMyComments(articleId))
      } else {
        setMine([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được bình luận')
    }
  }

  const waiting = mine.filter((c) => c.status !== 'APPROVED')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      await readerApi.postComment(articleId, content.trim())
      setContent('')
      setNotice('Bình luận đã gửi và đang chờ tòa soạn duyệt.')
      await loadComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được bình luận')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      await readerApi.updateComment(commentId, editContent.trim())
      setEditingId(null)
      setEditContent('')
      setNotice('Đã sửa. Bình luận được duyệt lại trước khi hiện trên bài.')
      await loadComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không sửa được bình luận')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReport = async (commentId: string) => {
    if (!reportReason.trim()) return
    setIsSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      await readerApi.reportComment(commentId, reportReason.trim())
      setReportingId(null)
      setReportReason('')
      setNotice('Đã gửi báo cáo. Bình luận được đưa về hàng chờ duyệt.')
      await loadComments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được báo cáo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderEditor = (commentId: string) => (
    <div className="mt-2 space-y-2">
      <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} maxLength={1000} />
      <div className="flex gap-2">
        <Button size="sm" isLoading={isSubmitting} onClick={() => handleEdit(commentId)}>Lưu sửa</Button>
        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Hủy</Button>
      </div>
    </div>
  )

  return (
    <div className="mt-12 pt-8 border-t border-stone-200">
      <div className="flex items-center space-x-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary-900" />
        <h3 className="font-serif text-lg font-bold text-stone-900">
          Ý kiến bạn đọc ({comments.length})
        </h3>
      </div>

      {notice && (
        <p className="mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{notice}</p>
      )}
      {error && (
        <p className="mb-4 text-xs text-crimson border border-red-200 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {signedIn ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex items-start space-x-3">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-stone-300 shrink-0"
            />
            <div className="flex-1">
              <Textarea
                placeholder={`Bình luận với tư cách ${currentUser.name}...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                maxLength={1000}
                required
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-stone-400">
                  Bình luận hiện sau khi tòa soạn duyệt.
                </span>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Gửi bình luận
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-center text-xs text-stone-600 mb-8">
          Vui lòng{' '}
          <Link to="/login" className="font-bold text-primary-900 hover:underline">
            Đăng nhập
          </Link>{' '}
          để gửi bình luận và trao đổi văn minh cùng bạn đọc.
        </div>
      )}

      {waiting.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-xs font-bold text-stone-600">Bình luận của bạn chưa hiện trên bài</h4>
          {waiting.map((c) => (
            <div key={c.id} className="p-4 rounded-lg bg-stone-50 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-800">{c.userName}</span>
                <span className="text-[10px] font-semibold text-amber-800">{STATUS_LABEL[c.status]}</span>
              </div>
              {editingId === c.id ? renderEditor(c.id) : <p className="text-xs text-stone-700 leading-relaxed">{c.content}</p>}
              {editingId !== c.id && (
                <button
                  type="button"
                  className="mt-2 text-[11px] text-primary-900 hover:underline"
                  onClick={() => { setEditingId(c.id); setEditContent(c.content); setReportingId(null) }}
                >
                  Sửa
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-xs text-stone-400 italic">
            Chưa có ý kiến nào về bài viết này. Hãy là người đầu tiên nêu góc nhìn của bạn!
          </p>
        ) : (
          comments.map((c) => {
            const own = String(c.userId) === String(currentUser.id)
            return (
              <div key={c.id} className="p-4 rounded-lg bg-white border border-stone-100 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <img
                      src={c.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover border border-stone-200"
                    />
                    <span className="text-xs font-bold text-stone-800">{c.userName}</span>
                    <span className="text-[10px] text-stone-400">•</span>
                    <span className="text-[10px] text-stone-400">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                </div>

                {editingId === c.id ? renderEditor(c.id) : (
                  <p className="text-xs text-stone-700 leading-relaxed">{c.content}</p>
                )}

                {editingId !== c.id && (
                  <div className="mt-3 flex items-center space-x-4 text-[11px] text-stone-500">
                    {own && (
                      <button
                        type="button"
                        className="hover:text-primary-800"
                        onClick={() => { setEditingId(c.id); setEditContent(c.content); setReportingId(null) }}
                      >
                        Sửa
                      </button>
                    )}
                    {signedIn && !own && (
                      <button
                        type="button"
                        className="flex items-center space-x-1 hover:text-crimson"
                        onClick={() => { setReportingId(c.id); setReportReason(''); setEditingId(null) }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Báo cáo</span>
                      </button>
                    )}
                  </div>
                )}

                {reportingId === c.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Lý do báo cáo"
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      rows={2}
                      maxLength={500}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" isLoading={isSubmitting} onClick={() => handleReport(c.id)}>
                        Gửi báo cáo
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReportingId(null)}>Hủy</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
