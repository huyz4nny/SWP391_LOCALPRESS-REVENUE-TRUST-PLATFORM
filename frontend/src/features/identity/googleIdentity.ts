interface GoogleIdentityApi {
  initialize(options: {
    client_id: string
    nonce: string
    callback: (response: { credential: string }) => void
    auto_select: boolean
  }): void
  renderButton(element: HTMLElement, options: {
    type: 'standard'
    theme: 'outline'
    size: 'large'
    text: 'signin_with'
    width: number
    locale: string
  }): void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentityApi } }
  }
}

let loading: Promise<GoogleIdentityApi> | undefined

export function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => fail(), 15000)
    const fail = () => {
      window.clearTimeout(timer)
      script.remove()
      loading = undefined
      reject(new Error('Không tải được Google. Vui lòng kiểm tra kết nối và thử lại.'))
    }
    script.src = 'https://accounts.google.com/gsi/client?hl=vi'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.clearTimeout(timer)
      if (window.google?.accounts.id) resolve(window.google.accounts.id)
      else fail()
    }
    script.onerror = fail
    document.head.appendChild(script)
  })
  return loading
}
