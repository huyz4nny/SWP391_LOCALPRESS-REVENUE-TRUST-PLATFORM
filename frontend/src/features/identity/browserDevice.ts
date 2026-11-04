export interface BrowserDevice {
  deviceName: string
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET'
}

export function currentBrowserDevice(): BrowserDevice {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
  if (/iPad|Tablet/i.test(ua)) return { deviceName: 'Máy tính bảng', deviceType: 'TABLET' }
  if (/Mobi|Android/i.test(ua)) return { deviceName: 'Điện thoại', deviceType: 'MOBILE' }
  return { deviceName: 'Máy tính', deviceType: 'DESKTOP' }
}
