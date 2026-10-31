// Tác dụng: cache bookmark / follow / lịch sử / tủ sách — số trên sidebar đổi ngay khi bấm lưu bài.
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { AppApiError } from '@/lib/http/errors'
import { readerApi } from '../api'

// so dem menu tai khoan: bai da luu, follow, ls doc, tu sach
// bam bookmark o trang chu thi so o sidebar doi ngay, khong reload trang
type LibrarySnapshot = {
  userId: string | null
  savedIds: string[]
  followedCategoryIds: string[]
  historyCount: number
  purchasedCount: number
  loaded: boolean
}

const EMPTY: LibrarySnapshot = {
  userId: null,
  savedIds: [],
  followedCategoryIds: [],
  historyCount: 0,
  purchasedCount: 0,
  loaded: false,
}

let snapshot: LibrarySnapshot = EMPTY
let loadingFor: string | null = null
const listeners = new Set<() => void>()

function emit(next: Partial<LibrarySnapshot>) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((listener) => listener())
}

function subscribeLibrary(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function subscribeUser(listener: () => void) {
  return mockStore.subscribe(listener)
}

async function load(userId: string) {
  loadingFor = userId
  try {
    const [savedIds, followed, historyCount, purchased] = await Promise.all([
      readerApi.getSavedArticleIds(),
      readerApi.getFollowedCategories(),
      readerApi.getReadingHistoryCount(),
      readerApi.getPurchasedArticlesPage(0, 1),
    ])
    // user đã đổi trong lúc chờ thì bỏ kết quả cũ
    if (loadingFor !== userId) return
    emit({
      userId,
      savedIds,
      followedCategoryIds: followed.map((c) => c.id),
      historyCount,
      purchasedCount: purchased.total,
      loaded: true,
    })
  } catch {
    if (loadingFor !== userId) return
    emit({ userId, savedIds: [], followedCategoryIds: [], historyCount: 0, purchasedCount: 0, loaded: true })
  }
}

function isLoginRequired(err: unknown) {
  return err instanceof AppApiError && err.status === 401
}

function errorMessage(err: unknown) {
  return err instanceof Error && err.message ? err.message : 'Không thực hiện được, vui lòng thử lại'
}

export function useReaderLibrary() {
  const navigate = useNavigate()
  const location = useLocation()
  const userId = useSyncExternalStore(subscribeUser, () => mockStore.getCurrentUser().id)
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'
  const state = useSyncExternalStore(subscribeLibrary, () => snapshot)

  useEffect(() => {
    if (snapshot.userId === userId || loadingFor === userId) return
    if (isGuest) {
      loadingFor = userId
      emit({ userId, savedIds: [], followedCategoryIds: [], historyCount: 0, purchasedCount: 0, loaded: true })
      return
    }
    void load(userId)
  }, [userId, isGuest])

  // trạng thái của user khác (đang chờ tải user mới) thì coi như rỗng
  const current = state.userId === userId ? state : EMPTY

  const goLogin = useCallback(() => {
    navigate('/login', { state: { from: { pathname: location.pathname } } })
  }, [navigate, location.pathname])

  // trả về null nếu thành công, chuỗi lỗi nếu thất bại, khách chưa đăng nhập thì chuyển sang trang đăng nhập
  const toggleSaved = useCallback(async (articleId: string): Promise<string | null> => {
    if (isGuest) {
      goLogin()
      return null
    }
    const wantSaved = !snapshot.savedIds.includes(articleId)
    try {
      const saved = await readerApi.setBookmark(articleId, wantSaved)
      if (snapshot.userId === userId) {
        const others = snapshot.savedIds.filter((id) => id !== articleId)
        emit({ savedIds: saved ? [articleId, ...others] : others })
      }
      return null
    } catch (err) {
      if (isLoginRequired(err)) {
        goLogin()
        return null
      }
      return errorMessage(err)
    }
  }, [isGuest, userId, goLogin])

  const toggleFollow = useCallback(async (categoryId: string): Promise<string | null> => {
    if (isGuest) {
      goLogin()
      return null
    }
    const wantFollow = !snapshot.followedCategoryIds.includes(categoryId)
    try {
      const following = await readerApi.setCategoryFollow(categoryId, wantFollow)
      if (snapshot.userId === userId) {
        const others = snapshot.followedCategoryIds.filter((id) => id !== categoryId)
        emit({ followedCategoryIds: following ? [categoryId, ...others] : others })
      }
      return null
    } catch (err) {
      if (isLoginRequired(err)) {
        goLogin()
        return null
      }
      return errorMessage(err)
    }
  }, [isGuest, userId, goLogin])

  const refresh = useCallback(() => {
    if (!isGuest) void load(userId)
  }, [isGuest, userId])

  return {
    loaded: current.loaded,
    savedIds: current.savedIds,
    followedCategoryIds: current.followedCategoryIds,
    historyCount: current.historyCount,
    purchasedCount: current.purchasedCount,
    isSaved: (articleId: string) => current.savedIds.includes(articleId),
    isFollowing: (categoryId: string) => current.followedCategoryIds.includes(categoryId),
    toggleSaved,
    toggleFollow,
    refresh,
  }
}
