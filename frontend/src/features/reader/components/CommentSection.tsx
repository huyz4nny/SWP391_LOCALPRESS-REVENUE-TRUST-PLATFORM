import React, { useState, useEffect } from 'react'
import { Comment } from '../types'
import { readerApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatRelativeTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { MessageSquare, ThumbsUp, Send, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'

interface CommentSectionProps {
  articleId: string
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentUser = mockStore.getCurrentUser()

  useEffect(() => {
    loadComments()
  }, [articleId])

  const loadComments = async () => {
    try {
      const data = await readerApi.getComments(articleId)
      setComments(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      await readerApi.postComment(articleId, content.trim())
      setContent('')
      loadComments()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLike = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likeCount: c.likeCount + 1 } : c))
    )
  }

  return (
    <div className="mt-12 pt-8 border-t border-stone-200">
      <div className="flex items-center space-x-2 mb-6">
        <MessageSquare className="w-5 h-5 text-primary-900" />
        <h3 className="font-serif text-lg font-bold text-stone-900">
          Ý kiến bạn đọc ({comments.length})
        </h3>
      </div>

      {/* Post comment box */}
      {currentUser.role === 'GUEST' ? (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-center text-xs text-stone-600 mb-8">
          Vui lòng{' '}
          <Link to="/login" className="font-bold text-primary-900 hover:underline">
            Đăng nhập
          </Link>{' '}
          để gửi bình luận và trao đổi văn minh cùng bạn đọc.
        </div>
      ) : (
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
                required
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-stone-400">
                  Bình luận tuân thủ chuẩn mực văn hóa và pháp luật báo chí.
                </span>
                <Button type="submit" size="sm" isLoading={isSubmitting}>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Gửi bình luận
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comment List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-xs text-stone-400 italic">
            Chưa có ý kiến nào về bài viết này. Hãy là người đầu tiên nêu góc nhìn của bạn!
          </p>
        ) : (
          comments.map((c) => (
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

              <p className="text-xs text-stone-700 leading-relaxed">{c.content}</p>

              <div className="mt-3 flex items-center space-x-4 text-[11px] text-stone-500">
                <button
                  onClick={() => handleLike(c.id)}
                  className="flex items-center space-x-1 hover:text-primary-800 transition-colors cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Hữu ích ({c.likeCount})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
