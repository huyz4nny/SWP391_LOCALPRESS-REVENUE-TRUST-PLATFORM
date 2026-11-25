export type ArticleFormat = 'bold' | 'italic' | 'underline' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'quote'
  | { font: string } | { size: string }

/** Operates only on the selection (or current line), preserving the surrounding draft verbatim. */
export function formatArticleSelection(value: string, start: number, end: number, format: ArticleFormat) {
  const block = typeof format === 'string' && ['heading2', 'heading3', 'bullet', 'numbered', 'quote'].includes(format)
  if (block || start === end) {
    start = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
    const lineEnd = value.indexOf('\n', Math.max(start, end - (end > start ? 1 : 0)))
    end = lineEnd < 0 ? value.length : lineEnd
  }
  const selected = value.slice(start, end) || 'Nội dung'
  let numbered = 0
  const replacement = selected.split('\n').map(line => {
    if (!line.trim()) return line
    if (block) {
      const plain = line.replace(/^(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*)/, '')
      const prefix = format === 'heading2' ? '## ' : format === 'heading3' ? '### '
        : format === 'bullet' ? '- ' : format === 'quote' ? '> ' : `${++numbered}. `
      return prefix + plain
    }
    // Keep block markers outside inline formatting, including when formatting a whole line.
    const [, prefix = '', body = line] = /^(#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s*)(.*)$/.exec(line) ?? []
    if (typeof format === 'object') {
      const attr = 'font' in format ? 'font' : 'size'
      const choice = 'font' in format ? format.font : format.size
      const cleaned = body.replace(new RegExp(` data-article-${attr}="[^"]*"`, 'g'), '')
      return `${prefix}<span data-article-${attr}="${choice}">${cleaned}</span>`
    }
    const [open, close] = format === 'bold' ? ['**', '**'] : format === 'italic' ? ['*', '*'] : ['<u>', '</u>']
    return prefix + (body.startsWith(open) && body.endsWith(close)
      ? body.slice(open.length, -close.length) : open + body + close)
  }).join('\n')
  return { value: value.slice(0, start) + replacement + value.slice(end), start, end: start + replacement.length }
}
