import Markdown, { defaultUrlTransform } from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { ARTICLE_FONTS, ARTICLE_FONT_SIZES, articleFontFamily, articleFontSize } from './articleTypography'

// Authors may format text, but cannot inject CSS, scripts, frames, forms or event handlers.
// Keep this allowlist shared by every draft preview and the public article renderer.
const articleSchema = {
  tagNames: ['div', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'span', 'img',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'pre', 'code', 'hr'],
  attributes: {
    a: ['href', 'title'],
    ol: ['start'],
    img: ['src', 'alt'],
    span: [
      ['dataArticleFont', ...Object.keys(ARTICLE_FONTS)],
      ['dataArticleSize', ...ARTICLE_FONT_SIZES.map(String)],
    ],
  },
  protocols: { src: ['data'], href: ['http', 'https', 'mailto'] },
  strip: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math'],
}

export function ArticleContent({ content, className = '' }: { content: string; className?: string }) {
  return (
    <div className={`article-content min-w-0 break-words font-serif text-base leading-relaxed text-stone-800
      [&_p]:my-3 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:font-sans [&_h2]:text-2xl [&_h2]:font-bold
      [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-sans [&_h3]:text-xl [&_h3]:font-bold
      [&_h4]:my-3 [&_h4]:font-bold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6
      [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1
      [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic
      [&_a]:text-primary-900 [&_a]:underline [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-3
      [&_code]:font-mono [&_hr]:my-5 ${className}`}>
      <Markdown
        remarkPlugins={[remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, articleSchema]]}
        urlTransform={(url, key) => key === 'src'
          ? (/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(url) && url.length <= 100000 ? url : '')
          : defaultUrlTransform(url)}
        components={{
          img: ({ src, alt }) => src
            ? <img src={src} alt={alt ?? ''} loading="lazy" className="mx-auto my-4 block h-auto max-w-full rounded" />
            : null,
          h1: 'h2', h5: 'h4', h6: 'h4',
          span: ({ node, children }) => (
            <span data-article-font={node?.properties.dataArticleFont?.toString()} data-article-size={node?.properties.dataArticleSize?.toString()} style={{
              fontFamily: articleFontFamily(node?.properties.dataArticleFont),
              fontSize: articleFontSize(node?.properties.dataArticleSize),
            }}>{children}</span>
          ),
        }}
      >{content.replace(/\r\n?/g, '\n')}</Markdown>
    </div>
  )
}
