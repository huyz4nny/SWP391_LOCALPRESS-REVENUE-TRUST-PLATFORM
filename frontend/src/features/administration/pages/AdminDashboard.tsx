import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../api'
import { mockStore } from '@/mocks/store'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  Users,
  Settings,
  Activity,
  History,
  CheckCircle2,
  Server,
  Cpu,
} from 'lucide-react'

export function AdminDashboard() {
  const [usersCount, setUsersCount] = useState(0)
  const [auditLogsCount, setAuditLogsCount] = useState(0)

  useEffect(() => {
    adminApi.getUsers().then((u) => setUsersCount(u.length))
    adminApi.getAuditLogs().then((l) => setAuditLogsCount(l.length))
  }, [])

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Hệ Thống Quản Trị & Vận Hành Kỹ Thuật (SV5)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý tài khoản, ma trận phân quyền, cấu hình Paywall Engine và giám sát phân phối quảng cáo
        </p>
      </div>

      {/* Services Health */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Tài khoản hệ thống</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{usersCount} accounts</div>
          <div className="text-[11px] text-slate-400 mt-1">8 vai trò phân quyền</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Paywall Engine</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">Đang hoạt động</div>
          <div className="text-[11px] text-slate-400 mt-1">Tối đa 2 thiết bị / độc giả</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Ad Serving Engine</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700">3 Slots Online</div>
          <div className="text-[11px] text-slate-400 mt-1">Chống click fraud tự động</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Nhật ký Audit Logs</span>
            <History className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{auditLogsCount} sự kiện</div>
          <div className="text-[11px] text-slate-400 mt-1">Bất biến (Immutable)</div>
        </div>
      </div>

      {/* Navigation shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
        <Link
          to="/backoffice/admin/users"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:shadow-xs transition-all space-y-2 group"
        >
          <Users className="w-6 h-6 text-purple-700 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-sm text-slate-900">Quản lý Tài khoản & Phân quyền</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Xem danh sách tài khoản, ma trận quyền hạn (RBAC), thay đổi role của phóng viên, kế toán và doanh nghiệp.
          </p>
        </Link>

        <Link
          to="/backoffice/admin/paywall"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all space-y-2 group"
        >
          <Settings className="w-6 h-6 text-amber-600 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-sm text-slate-900">Cấu hình Paywall & Thiết bị</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Điều chỉnh số từ đọc thử miễn phí, giới hạn số thiết bị đăng nhập đồng thời, đơn giá bài lẻ mặc định.
          </p>
        </Link>

        <Link
          to="/backoffice/admin/delivery"
          className="p-5 bg-white rounded-xl border border-slate-200 hover:border-sky-300 hover:shadow-xs transition-all space-y-2 group"
        >
          <Activity className="w-6 h-6 text-sky-700 group-hover:scale-110 transition-transform" />
          <h3 className="font-bold text-sm text-slate-900">Giám sát Ad Delivery Engine</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Theo dõi thời gian thực banner nào đang được phát trên slot nào, tỷ lệ CTR và lượt hiển thị hôm nay.
          </p>
        </Link>
      </div>
    </div>
  )
}
