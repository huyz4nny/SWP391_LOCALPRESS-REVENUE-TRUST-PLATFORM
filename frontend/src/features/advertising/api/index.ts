import { httpClient } from '@/lib/http/client'
import { AdSlot, AdBooking, AdCampaign, AdCreative } from '../types'

export const advertisingApi = {
  getSlots: () => {
    return httpClient.get<AdSlot[]>('/ad-slots')
  },

  getMyBookings: () => {
    return httpClient.get<AdBooking[]>('/advertiser/bookings')
  },

  getBookingById: (id: string) => {
    return httpClient.get<AdBooking>(`/advertiser/bookings/${id}`)
  },

  createBooking: (data: {
    slotId: string
    startDate: string
    endDate: string
    daysCount: number
    companyName: string
    contactPerson: string
    contactPhone: string
    contactEmail: string
  }) => {
    return httpClient.post<AdBooking>('/advertiser/bookings', data)
  },

  acceptQuotation: (bookingId: string) => {
    return httpClient.post<AdBooking>(`/advertiser/bookings/${bookingId}/accept-quote`)
  },

  getCampaignById: (id: string) => {
    return httpClient.get<AdCampaign>(`/advertiser/campaigns/${id}`)
  },

  uploadCreative: (campaignId: string, data: {
    title: string
    imageUrl: string
    targetUrl: string
    width: number
    height: number
    fileSizeKb: number
  }) => {
    return httpClient.post<AdCreative>(`/advertiser/campaigns/${campaignId}/creatives`, data)
  },
}
