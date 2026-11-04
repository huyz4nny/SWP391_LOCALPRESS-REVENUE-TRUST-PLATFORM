import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { trackVisibleAd } from '../components/shared/adViewTracking'

describe('visible ad tracking', () => {
  let image: HTMLImageElement
  let doc: EventTarget & { visibilityState: string }
  let notify: (entries: IntersectionObserverEntry[]) => void
  let disconnect: ReturnType<typeof vi.fn>
  let api: { impression: Mock<() => Promise<{ recorded: boolean }>>; click: Mock<() => Promise<{ recorded: boolean }>> }
  const view = (ratio: number) => notify([{ target: image, intersectionRatio: ratio, isIntersecting: ratio > 0 } as unknown as IntersectionObserverEntry])
  const loaded = () => {
    Object.assign(image, { complete: true, naturalWidth: 100 })
    image.dispatchEvent(new Event('load'))
  }
  beforeEach(() => {
    image = Object.assign(new EventTarget(), { complete: false, naturalWidth: 0 }) as HTMLImageElement
    doc = Object.assign(new EventTarget(), { visibilityState: 'visible' })
    vi.stubGlobal('document', doc)
    disconnect = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof notify) { notify = callback }
      observe() {}
      disconnect = disconnect
    })
    api = { impression: vi.fn().mockResolvedValue({ recorded: true }), click: vi.fn().mockResolvedValue({ recorded: true }) }
  })
  afterEach(() => vi.unstubAllGlobals())
  it('requires image loaded, half visible and a visible tab; counts only once', () => {
    const tracker = trackVisibleAd(image, api)
    loaded(); view(0); view(0.49)
    expect(api.impression).not.toHaveBeenCalled()
    doc.visibilityState = 'hidden'; view(1)
    expect(api.impression).not.toHaveBeenCalled()
    doc.visibilityState = 'visible'; doc.dispatchEvent(new Event('visibilitychange'))
    view(0); view(1); loaded()
    expect(api.impression).toHaveBeenCalledTimes(1)
    tracker.dispose()
  })
  it('does not count broken or still loading images', () => {
    const tracker = trackVisibleAd(image, api)
    view(1)
    Object.assign(image, { complete: true, naturalWidth: 0 })
    image.dispatchEvent(new Event('load'))
    expect(api.impression).not.toHaveBeenCalled()
    tracker.dispose()
  })
  it('queues an early click until impression succeeds, without duplicate clicks', async () => {
    let acknowledge!: (value: { recorded: boolean }) => void
    api.impression.mockReturnValue(new Promise(resolve => { acknowledge = resolve }))
    const tracker = trackVisibleAd(image, api)
    loaded(); view(1); tracker.click(); tracker.click()
    expect(api.click).not.toHaveBeenCalled()
    acknowledge({ recorded: true }); await Promise.resolve()
    expect(api.click).toHaveBeenCalledTimes(1)
    tracker.dispose()
  })
  it.each([false, 'reject'])('does not count clicks after refused/failed impression: %s', async outcome => {
    api.impression.mockImplementation(() => outcome === false ? Promise.resolve({ recorded: false }) : Promise.reject(new Error('network')))
    const tracker = trackVisibleAd(image, api)
    loaded(); view(1); tracker.click()
    await Promise.resolve(); await Promise.resolve()
    expect(api.click).not.toHaveBeenCalled()
    view(0); view(1)
    expect(api.impression).toHaveBeenCalledTimes(1)
    tracker.dispose()
  })
  it('disconnects and ignores events after disposal', () => {
    const tracker = trackVisibleAd(image, api)
    tracker.dispose(); loaded(); view(1); tracker.click()
    expect(api.impression).not.toHaveBeenCalled()
    expect(api.click).not.toHaveBeenCalled()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
