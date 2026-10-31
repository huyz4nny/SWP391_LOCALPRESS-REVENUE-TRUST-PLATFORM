// Tác dụng: trang `/account/devices` (UC043) — list tối đa 2 phiên, nút thu hồi. Login chưa ghi phiên thì danh sách trống.
import React, { useState } from 'react'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { logout } from '@/features/identity/authSession'
import { useNavigate } from 'react-router-dom'
import { useReaderDevices } from '../hooks/useReaderDevices'
import { ReaderDevice } from '../api'

function typeLabel(deviceType: string) {
  if (deviceType === 'MOBILE') return 'Điện thoại'
  if (deviceType === 'TABLET') return 'Máy tính bảng'
  return 'Máy tính'
}

// trang /account/devices: list phien + nut Thu hoi, toi da 2
export function ReaderDevicesPage() {
  const devices = useReaderDevices()
  const navigate = useNavigate()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const target = devices.items.find((item) => item.deviceId === confirmId) ?? null

  const revoke = async () => {
    if (!target) return
    setSaving(true)
    setActionError('')
    const wasCurrent = target.current
    try {
      await devices.revoke(target.deviceId)
      setConfirmId(null)
      if (wasCurrent) {
        logout()
        navigate('/login')
      }
    } catch (err) {
      setActionError(err instanceof Error && err.message ? err.message : 'Không thu hồi được phiên')
    } finally {
      setSaving(false)
    }
  }

  if (!devices.loaded) {
    return <p className="text-sm text-slate-500">Đang tải thiết bị đăng nhập...</p>
  }

  if (devices.error) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-crimson">{devices.error}</p>
        <Button variant="outline" size="sm" onClick={devices.reload}>Tải lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* tieu de + so phien dang mo / 2 */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Thiết bị đăng nhập</h2>
          <p className="mt-1 text-sm text-slate-500">
            Mỗi tài khoản tối đa 2 phiên còn hiệu lực. Đăng nhập thiết bị thứ ba bị từ chối cho đến khi bạn thu hồi một phiên.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-700 num">{devices.items.length} / 2 phiên</p>
      </div>

      {actionError && <p className="text-sm text-crimson">{actionError}</p>}

      {devices.items.length === 0 ? (
        <EmptyState
          title="Chưa có phiên đang hiệu lực"
          description="Phiên xuất hiện sau khi đăng nhập được ghi nhận. Phiên đã thu hồi hoặc hết hạn không còn trong danh sách."
        />
      ) : (
        <div className="space-y-3">
          {/* vong lap ve tung dong thiet bi */}
          {devices.items.map((device) => (
            <DeviceRow key={device.deviceId} device={device} onRevoke={() => setConfirmId(device.deviceId)} />
          ))}
        </div>
      )}

      {/* hop xac nhan thu hoi phien */}
      <ConfirmDialog
        open={target !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={revoke}
        title={target?.current ? 'Đăng xuất thiết bị này?' : 'Thu hồi phiên này?'}
        message={target?.current
          ? 'Phiên hiện tại sẽ dừng. Bạn cần đăng nhập lại trên thiết bị này.'
          : 'Thiết bị đó sẽ phải đăng nhập lại. Bạn vẫn dùng được phiên đang mở.'}
        confirmText="Thu hồi"
        isDestructive
        isLoading={saving}
      />
    </div>
  )
}

// 1 dong: ten may, nhan Thiet bi nay, nut Thu hoi
function DeviceRow({ device, onRevoke }: { device: ReaderDevice; onRevoke: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{device.deviceName}</h3>
          {device.current && (
            <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
              Thiết bị này
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {typeLabel(device.deviceType)}
          {' · '}
          {device.ipAddress || '—'}
          {' · '}
          {formatDateTime(device.lastActiveAt)}
        </p>
      </div>
      {/* nut Thu hoi phien nay */}
      <Button variant="outline" size="sm" onClick={onRevoke}>
        Thu hồi
      </Button>
    </div>
  )
}
