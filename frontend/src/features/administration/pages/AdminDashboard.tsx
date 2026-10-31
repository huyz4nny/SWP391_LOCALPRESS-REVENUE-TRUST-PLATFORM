import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api'

export function AdminDashboard() {
  const [data, setData] = useState<{ users: number; logs: number; slots: number; serving: number } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void Promise.all([adminApi.getUsers(), adminApi.getAuditLogs(), adminApi.getAdDeliveryStatus()])
      .then(([users, logs, slots]) => {
        if (active) setData({ users: users.length, logs: logs.length, slots: slots.length, serving: slots.filter(s => s.status === 'SERVING').length })
      }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không tải được dữ liệu quản trị') })
    return () => { active = false }
  }, [])
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Quản trị hệ thống</h1><p className="mt-2 text-sm text-slate-600">Tài khoản, chính sách đọc và trạng thái phân phối quảng cáo.</p></header>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!data && !error && <p role="status">Đang tải dữ liệu...</p>}
    {data && <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-4">
      {[['Tài khoản', data.users], ['Sự kiện gần nhất (tối đa 200)', data.logs], ['Vị trí quảng cáo', data.slots], ['Vị trí đang phục vụ', data.serving]].map(([label, value]) =>
        <div key={label}><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{value}</dd></div>)}
    </dl>}
    <nav className="grid gap-3 sm:grid-cols-2">
      {[['users', 'Tài khoản và phân quyền'], ['paywall', 'Cấu hình Paywall'], ['delivery', 'Giám sát phân phối quảng cáo'], ['audit-logs', 'Nhật ký kiểm toán']].map(([path, label]) =>
        <Link key={path} to={'/backoffice/admin/' + path} className="rounded-lg border border-slate-200 bg-white p-4 font-medium hover:bg-slate-50">{label}</Link>)}
    </nav>
  </div>
}
