import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { User } from '@/types'
import { AdSlot, AdBooking, AdCampaign, AdCreative, AdvertiserProfile, AdvertiserProfileInput, AdvertiserProfileChange, SlotAvailability } from '../types'

/** Đọc kích thước thật của ảnh ở trình duyệt (chỉ để báo lỗi sớm và cho mock; server kiểm tra lại). */
export async function readImageSize(file: File) {
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

export const advertisingApi = {
  getMe: () => httpClient.get<User>('/advertiser/me'),
  getProfile: () => httpClient.get<AdvertiserProfile>('/advertiser/profile'),
  getProfileHistory: () => httpClient.get<AdvertiserProfileChange[]>('/advertiser/profile/history'),
  saveProfile: (profile: AdvertiserProfileInput) =>
    httpClient.put<AdvertiserProfile>('/advertiser/profile', profile),

  getSlots: () => {
    return httpClient.get<AdSlot[]>('/ad-slots')
  },

  getAvailability: (slotId: string, startDate: string, endDate: string) =>
    httpClient.get<SlotAvailability>(`/advertiser/slots/${slotId}/availability`, { params: { startDate, endDate } }),

  getMyBookings: () => {
    return httpClient.get<AdBooking[]>('/advertiser/bookings')
  },

  getBookingById: (id: string) => {
    return httpClient.get<AdBooking>(`/advertiser/bookings/${id}`)
  },

  /** requestKey sinh một lần cho mỗi form: bấm gửi lại/mạng chập chờn không tạo booking trùng. */
  createBooking: (data: {
    requestKey: string
    campaignName: string
    slotId: string
    startDate: string
    endDate: string
    contactPerson: string
    contactPhone: string
    contactEmail: string
  }) => {
    return httpClient.post<AdBooking>('/advertiser/bookings', data)
  },

  acceptQuotation: (bookingId: string, quoteVersion: number) => {
    return httpClient.post<AdBooking>(`/advertiser/bookings/${bookingId}/accept-quote`, { quoteVersion, termsAccepted: true })
  },

  /** Backend lấy số tiền từ báo giá đã chốt và dùng lại đơn còn hạn; trả về đơn của trang thanh toán chung SV4. */
  createPayment: (campaignId: string) => {
    return httpClient.post<{ orderCode: string }>(`/advertiser/campaigns/${campaignId}/payment`)
  },

  getCampaignById: (id: string) => {
    return httpClient.get<AdCampaign>(`/advertiser/campaigns/${id}`)
  },

  uploadCreative: async (campaignId: string, data: { title: string; targetUrl: string; file: File }) => {
    if (APP_CONFIG.useMockApi) {
      const { width, height } = await readImageSize(data.file)
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Không đọc được file ảnh'))
        reader.readAsDataURL(data.file)
      })
      return httpClient.post<AdCreative>(`/advertiser/campaigns/${campaignId}/creatives`, {
        title: data.title, targetUrl: data.targetUrl, imageUrl, width, height,
        fileSizeKb: Math.ceil(data.file.size / 1024),
      })
    }
    const form = new FormData()
    form.append('file', data.file)
    form.append('title', data.title)
    form.append('targetUrl', data.targetUrl)
    return httpClient.postFormData<AdCreative>(`/advertiser/campaigns/${campaignId}/creatives`, form)
  },
}
