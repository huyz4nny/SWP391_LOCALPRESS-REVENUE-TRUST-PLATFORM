import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { mockStore } from '@/mocks/store'
import { readerApi, ReaderSubscription } from '../api'

// gói ACTIVE của độc giả, dùng chung cho header, hồ sơ và trang gói
type SubscriptionSnapshot = {
  userId: string | null
  items: ReaderSubscription[]
  loaded: boolean
  error: string | null
}

const EMPTY: SubscriptionSnapshot = {
  userId: null,
  items: [],
  loaded: false,
  error: null,
}

let snapshot: SubscriptionSnapshot = EMPTY
let loadingFor: string | null = null
const listeners = new Set<() => void>()

function emit(next: Partial<SubscriptionSnapshot>) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function load(userId: string) {
  loadingFor = userId
  try {
    const items = await readerApi.getMySubscriptions()
    if (loadingFor !== userId) return
    emit({ userId, items, loaded: true, error: null })
  } catch (err) {
    if (loadingFor !== userId) return
    const message = err instanceof Error && err.message ? err.message : 'Không tải được gói đang dùng'
    emit({ userId, items: [], loaded: true, error: message })
  }
}

function subscribeStore(listener: () => void) {
  return mockStore.subscribe(listener)
}

export function useReaderSubscription() {
  const userId = useSyncExternalStore(subscribeStore, () => mockStore.getCurrentUser().id)
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'
  const state = useSyncExternalStore(subscribe, () => snapshot)

  useEffect(() => {
    if (snapshot.userId === userId || loadingFor === userId) return
    if (isGuest) {
      loadingFor = userId
      emit({ userId, items: [], loaded: true, error: null })
      return
    }
    void load(userId)
  }, [userId, isGuest])

  const current = state.userId === userId ? state : EMPTY
  const inEffect = current.items.filter((item) => item.inEffect)
  const primary = inEffect[0] ?? null

  const reload = useCallback(() => {
    if (!isGuest) void load(userId)
  }, [isGuest, userId])

  const cancelAutoRenew = useCallback(async (subscriptionId: string) => {
    const updated = await readerApi.cancelAutoRenew(subscriptionId)
    if (snapshot.userId === userId) {
      emit({
        items: snapshot.items.map((item) => item.subscriptionId === updated.subscriptionId ? updated : item),
        error: null,
      })
    }
    return updated
  }, [userId])

  return {
    loaded: current.loaded,
    error: current.error,
    primary,
    others: current.items.filter((item) => item.subscriptionId !== primary?.subscriptionId),
    hasInEffect: primary !== null,
    reload,
    cancelAutoRenew,
  }
}
