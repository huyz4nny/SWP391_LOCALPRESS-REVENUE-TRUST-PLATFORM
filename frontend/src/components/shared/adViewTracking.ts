/** One tracker per served token. Loading alone never counts a view. */
export function trackVisibleAd(image: HTMLImageElement, api: {
  impression: () => Promise<{ recorded: boolean }>
  click: () => Promise<{ recorded: boolean }>
}) {
  let active = true
  let visible = false
  let impressionRequest: Promise<{ recorded: boolean }> | undefined
  let clickRequest: Promise<unknown> | undefined
  const canView = () => active && visible && document.visibilityState === 'visible'
    && image.complete && image.naturalWidth > 0
  const impression = () => {
    if (!impressionRequest && canView()) {
      // Keep even a rejected request: do not flood retries on scroll/visibility events.
      impressionRequest = api.impression()
    }
    return impressionRequest
  }
  const check = () => { void impression()?.catch(() => {}) }
  const observer = new IntersectionObserver(entries => {
    const entry = entries.find(item => item.target === image)
    if (entry) visible = entry.isIntersecting && entry.intersectionRatio >= 0.5
    check()
  }, { threshold: [0, 0.5] })
  observer.observe(image)
  image.addEventListener('load', check)
  document.addEventListener('visibilitychange', check)
  return {
    click() {
      if (!canView() || clickRequest) return
      // Wait for the impression acknowledgement before recording even an early click.
      clickRequest = impression()?.then(result => result.recorded ? api.click() : undefined)
      void clickRequest?.catch(() => {})
    },
    dispose() {
      active = false
      observer.disconnect()
      image.removeEventListener('load', check)
      document.removeEventListener('visibilitychange', check)
    },
  }
}
