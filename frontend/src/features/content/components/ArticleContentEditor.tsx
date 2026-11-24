import { useLayoutEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Bold, Italic, Underline, Quote, ImagePlus } from 'lucide-react'
import type { TextareaProps } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArticleContent } from '@/components/shared/ArticleContent'

type Props = Omit<TextareaProps, 'value' | 'onChange'> & { value: string; onChange: (value: string) => void }
const actions = [
  ['bold', 'In đậm', Bold], ['italic', 'In nghiêng', Italic],
  ['underline', 'Gạch chân', Underline], ['quote', 'Trích dẫn', Quote],
] as const

export function ArticleContentEditor({ value, onChange, disabled, readOnly, maxLength = 100000, id, rows = 14, error, placeholder = 'Nhập nội dung…' }: Props) {
  const editor = useRef<HTMLDivElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const selection = useRef<Range | null>(null)
  const lastValue = useRef<string | null>(null)
  const lastHtml = useRef('')
  const [message, setMessage] = useState('')
  const locked = disabled || readOnly

  useLayoutEffect(() => {
    const element = editor.current
    if (!element || lastValue.current === value) return
    const template = document.createElement('template')
    template.innerHTML = renderToStaticMarkup(<ArticleContent content={value} />)
    element.replaceChildren(...(template.content.querySelector('.article-content')?.childNodes ?? []))
    lastValue.current = value
    lastHtml.current = element.innerHTML
    selection.current = null
  }, [value])

  function saveInput() {
    const element = editor.current
    if (!element) return
    const html = element.innerHTML
    const next = element.textContent?.trim() || element.querySelector('img') ? '<div>' + html + '</div>' : ''
    if (next.length > maxLength) {
      element.innerHTML = lastHtml.current
      setMessage('Nội dung đã đạt giới hạn. Hãy rút ngắn bài hoặc dùng ảnh nhỏ hơn.')
      return
    }
    lastHtml.current = html
    lastValue.current = next
    setMessage('')
    onChange(next)
  }

  function format(command: typeof actions[number][0]) {
    editor.current?.focus()
    if (command === 'quote') {
      const node = window.getSelection()?.anchorNode
      const block = node instanceof Element ? node : node?.parentElement
      document.execCommand('formatBlock', false, block?.closest('blockquote') ? 'p' : 'blockquote')
    } else {
      document.execCommand(command)
    }
    saveInput()
  }

  async function insertImage(file: File) {
    const element = editor.current
    const range = selection.current
    if (!element || element.contentEditable !== 'true') return
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        throw new Error('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.')
      }
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const ratio = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
      try {
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Không xử lý được ảnh.')
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      } finally {
        bitmap.close()
      }
      if (editor.current !== element || element.contentEditable !== 'true') return
      const budget = maxLength - element.innerHTML.length - 150
      let url = canvas.toDataURL('image/webp', 0.75)
      while (url.length > budget && Math.max(canvas.width, canvas.height) > 200) {
        url = canvas.toDataURL('image/webp', 0.48)
        if (url.length <= budget) break
        const smaller = document.createElement('canvas')
        smaller.width = Math.max(1, Math.round(canvas.width * 0.75))
        smaller.height = Math.max(1, Math.round(canvas.height * 0.75))
        const context = smaller.getContext('2d')
        if (!context) throw new Error('Không xử lý được ảnh.')
        context.drawImage(canvas, 0, 0, smaller.width, smaller.height)
        canvas.width = smaller.width
        canvas.height = smaller.height
        canvas.getContext('2d')?.drawImage(smaller, 0, 0)
        url = canvas.toDataURL('image/webp', 0.65)
      }
      if (url.length > budget || !url.startsWith('data:image/webp;base64,')) {
        throw new Error('Ảnh vượt dung lượng còn lại của bài. Hãy chọn ảnh nhỏ hơn.')
      }
      element.focus()
      const currentSelection = window.getSelection()
      if (range && element.contains(range.commonAncestorContainer)) {
        currentSelection?.removeAllRanges()
        currentSelection?.addRange(range)
      } else {
        currentSelection?.selectAllChildren(element)
        currentSelection?.collapseToEnd()
      }
      const image = document.createElement('img')
      image.src = url
      image.alt = 'Ảnh trong bài'
      document.execCommand('insertHTML', false, '<div>' + image.outerHTML + '</div><div><br></div>')
      saveInput()
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Không đọc được ảnh.')
    }
  }

  return (
    <fieldset disabled={locked} className="min-w-0 overflow-hidden rounded-md border border-slate-300 bg-white">
      <div role="group" aria-label="Định dạng nội dung" className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1">
        {actions.map(([command, label, Icon]) => (
          <Button key={command} type="button" variant="ghost" size="sm" title={label} aria-label={label}
            className="h-8 w-8 p-0" onMouseDown={event => event.preventDefault()} onClick={() => format(command)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </Button>
        ))}
        <input ref={imageInput} type="file" hidden accept="image/jpeg,image/png,image/webp"
          onChange={event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void insertImage(file)
          }} />
        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
          title="Chèn ảnh" aria-label="Chèn ảnh" onMouseDown={event => event.preventDefault()} onClick={() => {
            const current = window.getSelection()
            selection.current = current?.rangeCount ? current.getRangeAt(0).cloneRange() : null
            imageInput.current?.click()
          }}>
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div ref={editor} id={id} role="textbox" aria-label="Nội dung bài viết" aria-multiline="true"
        aria-readonly={locked || undefined} contentEditable={!locked} data-placeholder={placeholder}
        style={{ minHeight: rows * 26 }}
        className="break-words px-4 py-3 font-serif text-base leading-relaxed outline-none focus:ring-2 focus:ring-inset focus:ring-primary-900/20 empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
        onInput={saveInput}
        onDrop={event => event.preventDefault()}
        onPaste={event => {
          event.preventDefault()
          const image = Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/'))
          if (image) {
            const current = window.getSelection()
            selection.current = current?.rangeCount ? current.getRangeAt(0).cloneRange() : null
            void insertImage(image)
          } else {
            document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
          }
        }} />
      {(message || error) && <p role="alert" className="px-4 py-2 text-xs text-red-700">{message || error}</p>}
    </fieldset>
  )
}
