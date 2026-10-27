import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingSchema, getBookingDays, getBookingToday } from '../features/advertising/schemas/booking'
import { mockStore } from '../mocks/store'

const booking = {
  requestKey: 'test-request-key', campaignName: 'Chiến dịch A',
  slotId: 'slot-top-leaderboard', startDate: '2026-10-13', endDate: '2026-10-15',
  contactPerson: 'Tester', contactPhone: '0901234567', contactEmail: 'test@example.com',
}
// Seed đã có booking leaderboard 15-25/10, nên các ca tạo booking dùng lịch tháng 11 còn trống.
const free = { ...booking, startDate: '2026-11-02', endDate: '2026-11-04' }

describe('Booking validation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'))
    mockStore.resetToDefaults()
    mockStore.setCurrentUser('user-adv-1')
  })
  afterEach(() => vi.useRealTimers())

  it('uses the Vietnamese calendar date and counts both the start and end dates', () => {
    expect(getBookingToday()).toBe('2026-10-13')
    expect(getBookingDays(booking.startDate, booking.endDate)).toBe(3)
    expect(getBookingDays(booking.startDate, booking.startDate)).toBe(1)
    vi.setSystemTime(new Date('2026-10-13T17:01:00Z'))
    expect(getBookingToday()).toBe('2026-10-14')
    expect(bookingSchema.safeParse(booking).success).toBe(false)
  })

  it('rejects missing, impossible, past or reversed dates and invalid contact details', () => {
    for (const invalid of [
      { startDate: '' }, { endDate: '' }, { startDate: '2026-02-30' },
      { endDate: '2027-02-29' }, { startDate: '2026-10-12' }, { endDate: '2026-10-12' },
      { contactPhone: 'abc' }, { contactPhone: '09012345678' }, { contactEmail: 'invalid' }, { campaignName: '  ' },
    ]) expect(bookingSchema.safeParse({ ...booking, ...invalid }).success).toBe(false)
    expect(getBookingDays('2026-10-15', '2026-10-13')).toBe(0)
    expect(getBookingDays('', '')).toBe(0)
    expect(bookingSchema.safeParse({ ...booking, startDate: '2028-02-29', endDate: '2028-02-29' }).success).toBe(true)
  })

  it('also validates direct mock submissions and derives the price from the dates', () => {
    expect(() => mockStore.createBooking({ ...free, contactEmail: 'invalid' })).toThrow('Email')
    expect(() => mockStore.createBooking({ ...free, endDate: '2026-10-12' })).toThrow('Ngày kết thúc')
    const result = mockStore.createBooking(free)
    expect(result.daysCount).toBe(3)
    expect(result.campaignName).toBe('Chiến dịch A')
    expect(result.standardPrice).toBe(mockStore.getState().adSlots[0].pricePerDay * 3)
  })

  it('blocks overlapping bookings on an exclusive slot, including a shared last day and seeded ISO dates', () => {
    expect(() => mockStore.createBooking(booking)).toThrow('giữ chỗ')
    mockStore.createBooking(free)
    expect(() => mockStore.createBooking({ ...free, startDate: '2026-11-04', endDate: '2026-11-05' })).toThrow('giữ chỗ')
    expect(mockStore.createBooking({ ...free, startDate: '2026-11-05', endDate: '2026-11-05' }).daysCount).toBe(1)
  })

  it('accepts only the quotation version the advertiser saw', () => {
    const created = mockStore.createBooking(free)
    mockStore.sendQuotation(created.id, 4_000_000, 10, 'Điều khoản A')
    mockStore.sendQuotation(created.id, 3_800_000, 15, 'Điều khoản B')
    expect(() => mockStore.acceptQuotation(created.id, 1)).toThrow('cập nhật')
    expect(mockStore.acceptQuotation(created.id, 2).bookingStatus).toBe('CONFIRMED')
  })
})
