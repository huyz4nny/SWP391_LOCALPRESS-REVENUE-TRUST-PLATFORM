// Tác dụng: cache thông báo của độc giả — số chưa đọc trên menu tài khoản và trang `/account/notifications`.
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { mockStore } from '@/mocks/store'
import { readerApi, ReaderNotification } from '../api'

type NotificationSnapshot = {
  userId: string | null
  items: ReaderNotification[]
  loaded: boolean
  error: string | null
}

const EMPTY: NotificationSnapshot = { userId: null, items: [], loaded: false, error: null }

let snapshot: NotificationSnapshot = EMPTY
let loadingFor: string | null = null
const listeners = new Set<() => void>()

function emit(next: Partial<NotificationSnapshot>) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

async function load(userId: string) {
  loadingFor = userId
  try {
    const items = await readerApi.getNotifications()
    if (loadingFor !== userId) return
    emit({ userId, items, loaded: true, error: null })
  } catch (err) {
    if (loadingFor !== userId) return
    const message = err instanceof Error && err.message ? err.message : 'Không tải được thông báo'
    emit({ userId, items: [], loaded: true, error: message })
  }
}

export function useReaderNotifications() {
  const userId = useSyncExternalStore(
    (listener) => mockStore.subscribe(listener),
    () => mockStore.getCurrentUser().id,
  )
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

  const reload = useCallback(() => {
    if (!isGuest) void load(userId)
  }, [isGuest, userId])

  const markRead = useCallback(async (notificationId: string) => {
    await readerApi.markNotificationRead(notificationId)
    if (snapshot.userId === userId) {
      emit({ items: snapshot.items.map((item) => (item.id === notificationId ? { ...item, read: true } : item)) })
    }
  }, [userId])

  const markAllRead = useCallback(async () => {
    await readerApi.markAllNotificationsRead()
    if (snapshot.userId === userId) {
      emit({ items: snapshot.items.map((item) => ({ ...item, read: true })) })
    }
  }, [userId])

  return {
    loaded: current.loaded,
    error: current.error,
    items: current.items,
    unreadCount: current.items.filter((item) => !item.read).length,
    reload,
    markRead,
    markAllRead,
  }
}
