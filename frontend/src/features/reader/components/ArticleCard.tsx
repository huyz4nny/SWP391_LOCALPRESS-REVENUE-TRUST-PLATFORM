import React from 'react'
import { Link } from 'react-router-dom'
import { Article } from '../types'
import { formatRelativeTime } from '@/lib/format'
import { Crown, Clock, Bookmark, ArrowRight } from 'lucide-react'

export function getCategoryBadgeStyle(slug?: string) {
  switch (slug) {
    case 'thoi-su':
      return 'bg-red-50 text-red-700 border-red-200/80 hover:bg-red-100'
    case 'kinh-te':
      return 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100'
    case 'phap-luat':
      return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
    case 'van-hoa':
      return 'bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100'
    case 'nong-nghiep':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
    case 'cong-nghe':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200/80 hover:bg-indigo-100'
    default:
      return 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
  }
}

interface ArticleCardProps {
  article: Article
  variant?: 'featured' | 'lead' | 'standard' | 'horizontal' | 'compact'
  isBookmarked?: boolean
  onToggleBookmark?: (articleId: string) => void
}

export function ArticleCard({
  article,
  variant = 'standard',
  isBookmarked = false,
  onToggleBookmark,
}: ArticleCardProps) {
  // 1. Featured Card (Big Hero Story)
  if (variant === 'featured') {
    return (
      <div className="relative group overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm hover:shadow-xl transition-all duration-300">
        <Link to={`/articles/${article.slug}`} className="block relative aspect-16/10 overflow-hidden">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/40 to-transparent" />
          
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <span className="bg-crimson text-white text-[11px] font-black uppercase px-2.5 py-1 rounded tracking-wider shadow-md">
              Tiêu điểm đặc biệt
            </span>
            {article.isPremium && (
              <span className="bg-amber-500 text-stone-950 text-[11px] font-extrabold px-2.5 py-1 rounded flex items-center shadow-md">
                <Crown className="w-3.5 h-3.5 mr-1" />
                Premium VIP
              </span>
            )}
          </div>

          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="flex items-center space-x-2 mb-2.5">
              <span className="text-amber-300 text-xs font-bold uppercase tracking-wider">
                {article.categoryName}
              </span>
              <span className="text-stone-400">•</span>
              <span className="text-stone-300 text-xs flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {article.readTimeMinutes} phút đọc
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight group-hover:text-amber-200 transition-colors drop-shadow-sm">
              {article.title}
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-stone-200 line-clamp-2 leading-relaxed drop-shadow-sm">
              {article.sapo}
            </p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-stone-300">
              <span className="font-medium text-white">{article.authorName}</span>
              <span>{formatRelativeTime(article.publishedAt || article.createdAt)}</span>
            </div>
          </div>
        </Link>
      </div>
    )
  }

  // 2. Lead Category Story (Semi-featured inside category grid)
  if (variant === 'lead') {
    return (
      <div className="group flex flex-col rounded-xl border border-stone-200/90 bg-white overflow-hidden hover:shadow-md transition-all duration-300">
        <Link to={`/articles/${article.slug}`} className="relative aspect-16/10 overflow-hidden">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {article.isPremium && (
            <div className="absolute top-2.5 right-2.5 bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded shadow-sm flex items-center">
              <Crown className="w-3 h-3 mr-1" /> VIP
            </div>
          )}
        </Link>
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getCategoryBadgeStyle(article.categorySlug)}`}>
                {article.categoryName}
              </span>
              {onToggleBookmark && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    onToggleBookmark(article.id)
                  }}
                  className={`p-1 rounded hover:bg-stone-100 ${
                    isBookmarked ? 'text-primary-900 fill-primary-900' : 'text-stone-400'
                  }`}
                  title="Lưu bài viết"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
            <Link to={`/articles/${article.slug}`}>
              <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-primary-900 transition-colors leading-snug line-clamp-2">
                {article.title}
              </h3>
            </Link>
            <p className="mt-2 text-xs text-stone-600 line-clamp-2 leading-relaxed">
              {article.sapo}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span>{article.authorName}</span>
            <span>{formatRelativeTime(article.publishedAt || article.createdAt)}</span>
          </div>
        </div>
      </div>
    )
  }

  // 3. Horizontal Card (Secondary news list)
  if (variant === 'horizontal') {
    return (
      <div className="flex gap-3.5 p-3 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-sm transition-all group">
        <Link
          to={`/articles/${article.slug}`}
          className="w-32 sm:w-40 h-24 sm:h-28 shrink-0 overflow-hidden rounded-lg relative aspect-16/10"
        >
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {article.isPremium && (
            <div className="absolute top-1.5 left-1.5 bg-amber-500 text-stone-950 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center shadow-xs">
              <Crown className="w-2.5 h-2.5 mr-0.5" /> VIP
            </div>
          )}
        </Link>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getCategoryBadgeStyle(article.categorySlug)}`}>
                {article.categoryName}
              </span>
              {onToggleBookmark && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    onToggleBookmark(article.id)
                  }}
                  className={`p-1 rounded hover:bg-stone-100 ${
                    isBookmarked ? 'text-primary-900 fill-primary-900' : 'text-stone-400'
                  }`}
                  title="Lưu bài viết"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
            <Link to={`/articles/${article.slug}`}>
              <h3 className="font-serif text-sm sm:text-base font-bold text-stone-900 group-hover:text-primary-900 transition-colors line-clamp-2 leading-snug">
                {article.title}
              </h3>
            </Link>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-stone-400 mt-2">
            <span>{formatRelativeTime(article.publishedAt || article.createdAt)}</span>
            <span>•</span>
            <span>{article.readTimeMinutes} phút</span>
          </div>
        </div>
      </div>
    )
  }

  // 4. Compact Card (Sidebar or minimal list)
  if (variant === 'compact') {
    return (
      <div className="py-2.5 border-b border-stone-100 last:border-0 group">
        <div className="flex items-center space-x-2 mb-1">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getCategoryBadgeStyle(article.categorySlug)}`}>
            {article.categoryName}
          </span>
          {article.isPremium && (
            <span className="text-[10px] font-bold text-amber-700 flex items-center bg-amber-50 px-1 rounded border border-amber-200/60">
              <Crown className="w-2.5 h-2.5 mr-0.5 text-amber-600" /> VIP
            </span>
          )}
        </div>
        <Link to={`/articles/${article.slug}`}>
          <h4 className="font-serif text-sm font-semibold text-stone-900 group-hover:text-primary-900 transition-colors line-clamp-2 leading-snug">
            {article.title}
          </h4>
        </Link>
        <div className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
          <span>{article.authorName}</span>
          <span>{formatRelativeTime(article.publishedAt || article.createdAt)}</span>
        </div>
      </div>
    )
  }

  // 5. Default Standard card
  return (
    <div className="group flex flex-col rounded-xl border border-stone-200/90 bg-white overflow-hidden hover:shadow-md hover:border-stone-300 transition-all duration-300">
      <Link to={`/articles/${article.slug}`} className="relative aspect-16/10 overflow-hidden">
        <img
          src={article.coverImage}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {article.isPremium && (
          <div className="absolute top-2 right-2 bg-amber-500 text-stone-950 text-xs font-black px-2 py-0.5 rounded shadow-sm flex items-center">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Link
              to={`/categories/${article.categorySlug}`}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getCategoryBadgeStyle(article.categorySlug)}`}
            >
              {article.categoryName}
            </Link>
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onToggleBookmark(article.id)
                }}
                className={`p-1 rounded hover:bg-stone-100 ${
                  isBookmarked ? 'text-primary-900 fill-primary-900' : 'text-stone-400'
                }`}
                title="Lưu bài viết"
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>

          <Link to={`/articles/${article.slug}`}>
            <h3 className="font-serif text-base font-bold text-stone-900 leading-snug group-hover:text-primary-900 transition-colors line-clamp-2">
              {article.title}
            </h3>
          </Link>

          <p className="mt-2 text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {article.sapo}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
          <span>{article.authorName}</span>
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" /> {article.readTimeMinutes} phút
          </span>
        </div>
      </div>
    </div>
  )
}
