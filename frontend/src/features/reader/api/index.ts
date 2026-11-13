// Tác dụng: client API reader — page gọi readerApi; mock hoặc backend thật theo APP_CONFIG.useMockApi.
// luồng đi là page gọi readerApi -> httpClient gọi /api/v1 -> map đổi dữ liệu -> trả về cho page hiển thị
// mỗi file bên dưới phụ trách một nhóm UC của SV3:
//   articles.ts      UC029-UC032 trang chủ, tìm kiếm, chuyên mục, chi tiết bài
//   purchase.ts      UC034-UC035 gói đọc, mua bài lẻ, mua gói
//   library.ts       UC037-UC040 bài đã mua, đã lưu, lịch sử đọc, theo dõi chuyên mục
//   comments.ts      UC041-UC042 bình luận và báo cáo
//   devices.ts       UC043 thiết bị và phiên đăng nhập
//   subscription.ts  UC044 gói đang dùng, tắt gia hạn
import { articlesApi } from './articles'
import { commentsApi } from './comments'
import { devicesApi } from './devices'
import { libraryApi } from './library'
import { purchaseApi } from './purchase'
import { subscriptionApi } from './subscription'

export type { ArticlePage } from './shared'
export type { PendingOrderTarget } from './purchase'
export type { ReaderSubscription } from './subscription'
export type { FollowedCategory, ReadingHistoryItem } from './library'
export type { ReaderDevice } from './devices'

// các page và hook chỉ cần import readerApi như trước
export const readerApi = {
  ...articlesApi,
  ...purchaseApi,
  ...subscriptionApi,
  ...libraryApi,
  ...commentsApi,
  ...devicesApi,
}
