import React from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '@/lib/format'
import { Crown, Bookmark, Clock, Flame } from 'lucide-react'

export interface PublicArticleCardProps {
  article: {
    id: string
    title: string
    slug: string
    sapo?: string
    thumbnailUrl: string
    categoryName: string
    isPremium: boolean
    price?: number
    publishedAt: string
    views?: number
  }
  isBookmarked?: boolean
  onToggleBookmark?: (id: string) => void
  layout?: 'standard' | 'horizontal' | 'compact'
}

export function PublicArticleCardExample({
  article,
  isBookmarked = false,
  onToggleBookmark,
  layout = 'standard',
}: PublicArticleCardProps) {
  if (layout === 'horizontal') {
    return (
      <article className="group flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all">
        {/* Thumbnail */}
        <div className="sm:w-56 h-36 shrink-0 relative overflow-hidden rounded-lg bg-stone-100">
          <img
            src={article.thumbnailUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {article.isPremium && (
            <span className="absolute top-2 left-2 bg-amber-600 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center space-x-1">
              <Crown className="w-3 h-3" />
              <span>PREMIUM</span>
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs text-stone-500 mb-1.5">
              <span className="font-semibold text-primary-900 uppercase tracking-wide">
                {article.categoryName}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatRelativeTime(article.publishedAt)}
              </span>
            </div>
            <Link to={`/articles/${article.slug}`}>
              <h3 className="font-serif font-bold text-base text-stone-900 group-hover:text-primary-900 line-clamp-2 leading-snug transition-colors">
                {article.title}
              </h3>
            </Link>
            {article.sapo && (
              <p className="mt-1.5 text-xs text-stone-600 font-serif line-clamp-2 leading-relaxed">
                {article.sapo}
              </p>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            {article.isPremium ? (
              <span className="text-amber-700 font-bold">15.000 ₫ hoặc Gói VIP</span>
            ) : (
              <span className="text-emerald-700 font-medium">Miễn phí</span>
            )}
            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(article.id)}
                className={`p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer ${
                  isBookmarked ? 'text-amber-600 fill-amber-600' : 'text-stone-400'
                }`}
                title="Lưu vào tủ sách"
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </article>
    )
  }

  // Standard vertical card
  return (
    <article className="group bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-stone-300 hover:shadow-md transition-all flex flex-col">
      <div className="relative aspect-16/10 overflow-hidden bg-stone-100">
        <img
          src={article.thumbnailUrl}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {article.isPremium && (
          <span className="absolute top-2.5 left-2.5 bg-amber-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded shadow-xs flex items-center space-x-1">
            <Crown className="w-3 h-3" />
            <span>PREMIUM</span>
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-semibold text-primary-900 uppercase tracking-wide">
              {article.categoryName}
            </span>
            <span className="flex items-center text-[11px]">
              <Clock className="w-3 h-3 mr-1" />
              {formatRelativeTime(article.publishedAt)}
            </span>
          </div>
          <Link to={`/articles/${article.slug}`}>
            <h3 className="font-serif font-bold text-base text-stone-900 group-hover:text-primary-900 line-clamp-2 leading-snug transition-colors">
              {article.title}
            </h3>
          </Link>
          {article.sapo && (
            <p className="mt-2 text-xs text-stone-600 font-serif line-clamp-2 leading-relaxed">
              {article.sapo}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
          {article.isPremium ? (
            <span className="text-amber-700 font-bold">15.000 ₫ / Gói VIP</span>
          ) : (
            <span className="text-emerald-700 font-medium">Đọc miễn phí</span>
          )}
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(article.id)}
              className={`p-1.5 rounded-full hover:bg-stone-100 transition-colors cursor-pointer ${
                isBookmarked ? 'text-amber-600 fill-amber-600' : 'text-stone-400'
              }`}
              title="Lưu bài viết"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
