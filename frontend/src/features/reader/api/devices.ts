// Tác dụng: UC043 — phiên đăng nhập / thiết bị của độc giả (tối đa 2) và thu hồi phiên.
import { httpClient } from '@/lib/http/client'
import { idSegment } from './shared'

export type ReaderDevice = {
  deviceId: string
  deviceName: string
  deviceType: string
  ipAddress: string | null
  lastActiveAt: string
  createdAt: string
  current: boolean
}

function mapDevice(dto: Partial<ReaderDevice> | null | undefined): ReaderDevice {
  return {
    deviceId: String(dto?.deviceId ?? ''),
    deviceName: dto?.deviceName ?? '',
    deviceType: dto?.deviceType ?? 'DESKTOP',
    ipAddress: dto?.ipAddress ?? null,
    lastActiveAt: dto?.lastActiveAt ?? '',
    createdAt: dto?.createdAt ?? '',
    current: Boolean(dto?.current),
  }
}

export const devicesApi = {
  // UC043 phiên còn hiệu lực của user đang đăng nhập
  listDevices: async (): Promise<ReaderDevice[]> => {
    const data = await httpClient.get<Array<Partial<ReaderDevice>>>('/reader/devices')
    return (data ?? []).map(mapDevice)
  },

  revokeDevice: (deviceId: string) => {
    return httpClient.delete<void>(`/reader/devices/${idSegment(deviceId)}`)
  },
}
