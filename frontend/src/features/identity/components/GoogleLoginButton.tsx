// Tác dụng: nút Google trên `/login` — lấy nonce, nhận idToken, giao cho LoginPage.
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AppApiError } from '@/lib/http/errors'
import { authApi } from '../api'
import { loadGoogleIdentity } from '../googleIdentity'

interface Props {
  onCredential: (idToken: string) => Promise<void>
  disabled: boolean
}

export function GoogleLoginButton({ onCredential, disabled }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onCredential)
  const busy = useRef(disabled)
  const inFlight = useRef(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => { callback.current = onCredential }, [onCredential])
  useEffect(() => { busy.current = disabled }, [disabled])

  useEffect(() => {
    let active = true
    const node = container.current
    async function initialize() {
      try {
        const google = await loadGoogleIdentity()
        if (!active) return
        const { nonce } = await authApi.getGoogleNonce()
        if (!active || !node) return
        google.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          nonce,
          auto_select: false,
          callback: (response) => {
            if (!active || busy.current || inFlight.current) return
            inFlight.current = true
            void callback.current(response.credential).catch((cause: unknown) => {
              if (active) {
                setReady(false)
                node.replaceChildren()
                setError(cause instanceof AppApiError ? cause.message : 'Không thể đăng nhập Google. Vui lòng thử lại.')
              }
            }).finally(() => { inFlight.current = false })
          },
        })
        node.replaceChildren()
        google.renderButton(node, {
          type: 'standard', theme: 'outline', size: 'large', text: 'signin_with',
          width: Math.min(400, Math.floor(node.getBoundingClientRect().width) || 300), locale: 'vi',
        })
        setReady(true)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được Google')
      }
    }
    void initialize()
    return () => { active = false; node?.replaceChildren() }
  }, [attempt])

  return (
    <div className="space-y-2">
      <div ref={container} aria-label="Đăng nhập bằng Google"
        className={disabled ? 'pointer-events-none opacity-50' : ''} />
      {!ready && !error && <p role="status" className="text-xs text-stone-500">Đang tải đăng nhập Google…</p>}
      {error && <>
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => {
          setReady(false)
          setError('')
          setAttempt(value => value + 1)
        }}>
          Thử lại Google
        </Button>
      </>}
    </div>
  )
}
