// Tác dụng: cache list phiên `/reader/devices` — số 0/2 trên menu và bảng `/account/devices`.
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { mockStore } from '@/mocks/store'
import { readerApi, ReaderDevice } from '../api'

// list phien con hieu luc: so 0/2 tren menu va bang o /account/devices
type DeviceSnapshot = {
  userId: string | null
  items: ReaderDevice[]
  loaded: boolean
  error: string | null
}

const EMPTY: DeviceSnapshot = {
  userId: null,
  items: [],
  loaded: false,
  error: null,
}

let snapshot: DeviceSnapshot = EMPTY
let loadingFor: string | null = null
const listeners = new Set<() => void>()

function emit(next: Partial<DeviceSnapshot>) {
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
    const items = await readerApi.listDevices()
    if (loadingFor !== userId) return
    emit({ userId, items, loaded: true, error: null })
  } catch (err) {
    if (loadingFor !== userId) return
    const message = err instanceof Error && err.message ? err.message : 'Không tải được danh sách thiết bị'
    emit({ userId, items: [], loaded: true, error: message })
  }
}

export function useReaderDevices() {
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

  const revoke = useCallback(async (deviceId: string) => {
    await readerApi.revokeDevice(deviceId)
    await load(userId)
  }, [userId])

  return {
    loaded: current.loaded,
    error: current.error,
    items: current.items,
    reload,
    revoke,
  }
}
