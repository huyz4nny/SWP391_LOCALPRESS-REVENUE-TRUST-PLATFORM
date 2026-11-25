import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArticleContent } from '@/components/shared/ArticleContent'
import { formatArticleSelection } from '@/features/content/components/articleFormatting'

const render = (content: string) => renderToStaticMarkup(<ArticleContent content={content} />)

describe('published article formatting', () => {
  it.each(['\n', '\r\n', '\r'])('preserves a single Enter (%j) as a visible break', newline => {
    expect(render(`Dòng một${newline}Dòng hai`)).toContain('Dòng một<br/>\nDòng hai')
  })

  it('retains paragraphs and existing Markdown headings while supporting emphasis and lists', () => {
    const html = render('### Tiêu đề\nNội dung **đậm** và *nghiêng*.\n\nĐoạn hai\n\n- Một\n- Hai')
    expect(html).toContain('<h3>Tiêu đề</h3>')
    expect(html).toContain('<strong>đậm</strong>')
    expect(html).toContain('<em>nghiêng</em>')
    expect(html).toContain('<p>Đoạn hai</p>')
    expect(html).toContain('<li>Một</li>')
  })

  it('renders persisted font, size and underline when reopening an article', () => {
    const stored = JSON.parse(JSON.stringify({ content: '<span data-article-font="arial"><span data-article-size="24"><u>Tiếng Việt</u></span></span>' }))
    const html = render(stored.content)
    expect(html).toContain('font-family:Arial, sans-serif')
    expect(html).toContain('font-size:1.5rem')
    expect(html).toContain('<u>Tiếng Việt</u>')
  })

  it('strips executable HTML, arbitrary styles, invalid typography and unsafe links', () => {
    const html = render('<script>alert(1)</script><iframe src="https://bad.test"></iframe>\n\n<span style="position:fixed" onclick="alert(2)" data-article-size="999" data-article-font="evil">Safe</span>\n\n[bad](javascript:alert%281%29)\n\n<a href="data:text/html,bad">bad</a>')
    expect(html).not.toMatch(/<script|<iframe|onclick|position:fixed|font-size:|font-family:|javascript:|data:text/)
    expect(html).toContain('Safe')
  })

  it('retains safe links and tolerates a server-truncated formatted preview', () => {
    expect(render('[Báo](https://example.com)')).toContain('href="https://example.com"')
    expect(render('<span data-article-font="arial">Phần xem trước')).toContain('Phần xem trước')
    expect(render('<span data-article-size="')).not.toContain('<script')
  })
})

describe('editor toolbar selection', () => {
  it('formats only selected text, keeping Vietnamese and surrounding newlines unchanged', () => {
    const result = formatArticleSelection('Trước\nTiếng Việt\nSau', 6, 16, 'bold')
    expect(result.value).toBe('Trước\n**Tiếng Việt**\nSau')
    expect(render(result.value)).toContain('<strong>Tiếng Việt</strong>')
  })

  it('formats the current line when there is no selection', () => {
    expect(formatArticleSelection('Một\nHai\nBa', 5, 5, 'heading2').value).toBe('Một\n## Hai\nBa')
    expect(formatArticleSelection('\nHai', 0, 0, 'bold').value).toBe('**Nội dung**\nHai')
  })

  it('keeps heading markers outside inline typography and permits changing size again', () => {
    let result = formatArticleSelection('### Tiêu đề', 0, 11, { size: '20' })
    result = formatArticleSelection(result.value, result.start, result.end, { size: '24' })
    const html = render(result.value)
    expect(html).toContain('<h3>')
    expect(html).toContain('font-size:1.5rem')
    expect(html).not.toContain('font-size:1.25rem')
  })

  it('formats multiple paragraphs without losing their boundaries', () => {
    const value = 'Đoạn một\nDòng hai\n\nĐoạn ba'
    const result = formatArticleSelection(value, 0, value.length, { font: 'times' })
    const html = render(result.value)
    expect(html).toContain('<br/>')
    expect(html.match(/<p>/g)).toHaveLength(2)
    expect(html).toContain('Times New Roman')
  })

  it('replaces existing block formatting and toggles bold off', () => {
    expect(formatArticleSelection('## Một\n- Hai', 0, 12, 'numbered').value).toBe('1. Một\n2. Hai')
    expect(formatArticleSelection('**Đậm**', 0, 7, 'bold').value).toBe('Đậm')
  })
})

it('renders an embedded article photo but rejects other image URL types', () => {
  expect(render('![Ảnh](data:image/webp;base64,UklGRg==)')).toContain('src="data:image/webp;base64,UklGRg=="')
  expect(render('![Ảnh](data:image/svg+xml;base64,PHN2Zz4=)')).not.toContain('<img')
  expect(render('![Ảnh](https://example.com/photo.png)')).not.toContain('<img')
})

it('renders saved visual editor content with formatting, separate lines and inline images', () => {
  const html = render('<div><b>Đậm</b><div><i>Nghiêng</i></div><div><img src="data:image/webp;base64,UklGRg==" alt="Ảnh trong bài"></div></div>')
  expect(html).toContain('<b>Đậm</b><div><i>Nghiêng</i></div>')
  expect(html).toContain('src="data:image/webp;base64,UklGRg=="')
})
