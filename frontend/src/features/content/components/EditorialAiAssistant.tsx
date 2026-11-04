import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { editorialApi } from '@/features/editorial/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'

interface Props {
  getTitle: () => string
  disabled?: boolean
  onApplyTitle: (value: string) => void
  onApplySapo: (value: string) => void
  onApplyTag?: (value: string) => string
}

export function EditorialAiAssistant({ getTitle, disabled = false, onApplyTitle, onApplySapo, onApplyTag }: Props) {
  // AI Modal
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiTopic, setAiTopic] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiNotice, setAiNotice] = useState('')
  const aiRequest = useRef(0)
  const aiInFlight = useRef(false)

  const [aiResults, setAiResults] = useState<{ suggestedTitles: string[]; suggestedSapo: string; suggestedTags: string[] } | null>(null)


  useEffect(() => () => { aiRequest.current += 1 }, [])

  function close() {
    aiRequest.current += 1
    aiInFlight.current = false
    setIsAiLoading(false)
    setShowAiModal(false)
  }
  const handleRunAiAssistant = async () => {
    if (disabled || aiInFlight.current) return
    const topic = (aiTopic.trim() || getTitle().trim())
    setAiError('')
    setAiNotice('')
    setAiResults(null)
    if (!topic || topic.length > 1000) {
      setAiError('Vui lòng nhập chủ đề hoặc tiêu đề bài viết từ 1 đến 1000 ký tự.')
      return
    }
    const request = ++aiRequest.current
    aiInFlight.current = true
    setIsAiLoading(true)
    try {
      const data = await editorialApi.getAiSuggestions(topic)
      if (request === aiRequest.current) setAiResults(data)
    } catch (error) {
      if (request === aiRequest.current) {
        setAiError(error instanceof Error ? error.message : 'Không thể lấy gợi ý AI. Vui lòng thử lại sau.')
      }
    } finally {
      if (request === aiRequest.current) {
        aiInFlight.current = false
        setIsAiLoading(false)
      }
    }
  }

  const handleApplyAiTitle = (suggestedTitle: string) => {
    if (disabled) return
    onApplyTitle(suggestedTitle)
    setAiNotice('Đã áp dụng tiêu đề. Hãy kiểm tra và lưu bản nháp.')
  }

  const handleApplyAiSapo = (suggestedSapo: string) => {
    if (disabled) return
    onApplySapo(suggestedSapo)
    setAiNotice('Đã áp dụng Sapo. Hãy kiểm tra và lưu bản nháp.')
  }

  const handleApplyAiTag = (tag: string) => {
    if (!disabled && onApplyTag) setAiNotice(onApplyTag(tag))
  }


  return <>
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setShowAiModal(true)}>
      <Sparkles className="mr-1 h-4 w-4" />Trợ lý AI gợi ý
    </Button>
      {/* AI Assistant Modal */}
      <Dialog
        open={showAiModal}
        onClose={close}
        title="Trợ lý AI Tòa soạn"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            AI hỗ trợ gợi ý tiêu đề thu hút, viết mở đầu (Sapo) và thẻ tag. Người dùng có toàn quyền xem xét và quyết định áp dụng, không tự động xuất bản.
          </p>

          <div className="flex gap-2">
            <Input
              placeholder="Nhập chủ đề hoặc từ khóa trọng tâm (VD: Cảng Lạch Huyện, du lịch Cát Bà)..."
              aria-label="Chủ đề gợi ý AI"
              maxLength={1000}
              disabled={isAiLoading || disabled}
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              className="flex-1"
            />
            <Button type="button" disabled={disabled || isAiLoading} onClick={handleRunAiAssistant} isLoading={isAiLoading} size="sm">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Tạo gợi ý AI
            </Button>
          </div>

          <p className="text-slate-500">Để trống chủ đề để dùng tiêu đề hiện tại. Chỉ áp dụng gợi ý sau khi kiểm tra tính chính xác.</p>
          {aiNotice && <p role="status" className="text-primary-900">{aiNotice}</p>}
          {aiError && <p role="alert" className="text-crimson">{aiError}</p>}

          {aiResults && (
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Gợi ý tiêu đề bài báo:
                </span>
                <div className="space-y-1.5">
                  {aiResults.suggestedTitles.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <span className="font-serif font-bold text-slate-900">{t}</span>
                      <Button type="button"
                        disabled={disabled}
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleApplyAiTitle(t)
                        }}
                        className="text-[11px] h-7"
                      >
                        Áp dụng
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 block mb-1.5 uppercase tracking-wider text-[11px]">
                  Gợi ý Sapo mở đầu:
                </span>
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-slate-700 italic flex items-center justify-between gap-3">
                  <p>{aiResults.suggestedSapo}</p>
                  <Button type="button"
                    disabled={disabled}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      handleApplyAiSapo(aiResults.suggestedSapo)
                    }}
                    className="text-[11px] h-7 shrink-0"
                  >
                    Áp dụng
                  </Button>
                </div>
              </div>
              <div>
                <span className="font-bold text-slate-800 block mb-1.5 uppercase tracking-wider text-[11px]">
                  {onApplyTag ? 'Gợi ý thẻ tag — chọn từng thẻ để thêm:' : 'Gợi ý tag: cập nhật tại phần metadata của bài viết.'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {aiResults.suggestedTags.map((tag, index) => (
                    <Button type="button" disabled={disabled || !onApplyTag} key={index} size="sm" variant="outline" onClick={() => handleApplyAiTag(tag)}>
                      + {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={close}>
              Đóng trợ lý
            </Button>
          </div>
        </div>
      </Dialog>

  </>
}
