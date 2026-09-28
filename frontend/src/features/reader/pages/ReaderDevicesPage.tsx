import React, { useState } from 'react'
import { mockStore } from '@/mocks/store'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Smartphone, Laptop, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react'

export function ReaderDevicesPage() {
  const currentUser = mockStore.getCurrentUser()
  const entitlement = mockStore.getEntitlements(currentUser.id)
  const [devices, setDevices] = useState(entitlement.activeDevices)

  const handleRevokeDevice = (deviceId: string) => {
    if (window.confirm('Đăng xuất phiên đăng nhập trên thiết bị này?')) {
      const updated = devices.filter((d) => d.id !== deviceId)
      entitlement.activeDevices = updated
      setDevices([...updated])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Quản lý phiên thiết bị</h2>
          <p className="text-xs text-stone-500 mt-1">
            Quy định tòa soạn: Mỗi tài khoản độc giả được đăng nhập tối đa <strong>2 thiết bị cá nhân</strong> đồng thời
          </p>
        </div>
        <div className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-semibold text-stone-700 w-fit">
          Đang sử dụng: {devices.length} / 2 thiết bị
        </div>
      </div>

      {devices.length >= 2 && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Đã đạt giới hạn 2 thiết bị tối đa:</strong> Nếu bạn đăng nhập trên thiết bị thứ 3, hệ thống Paywall sẽ yêu cầu đăng xuất một trong hai thiết bị dưới đây để bảo vệ bản quyền nội dung.
          </div>
        </div>
      )}

      <div className="space-y-3">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
              dev.isCurrent
                ? 'bg-blue-50/40 border-blue-200'
                : 'bg-white border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  dev.isCurrent ? 'bg-primary-900 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {dev.deviceName.toLowerCase().includes('phone') || dev.deviceName.toLowerCase().includes('ios') ? (
                  <Smartphone className="w-5 h-5" />
                ) : (
                  <Laptop className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-stone-900">{dev.deviceName}</h4>
                  {dev.isCurrent && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-300">
                      Thiết bị này
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-0.5 space-x-2">
                  <span>Trình duyệt: {dev.browser}</span>
                  <span>•</span>
                  <span>IP: {dev.ipAddress}</span>
                  <span>•</span>
                  <span>Hoạt động: {formatDateTime(dev.lastActive)}</span>
                </div>
              </div>
            </div>

            {!dev.isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevokeDevice(dev.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Đăng xuất
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
