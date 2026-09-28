import React, { useState, useEffect } from 'react'
import { User } from '@/types'
import { UserRole, ROLE_LABELS } from '@/app/config'
import { adminApi } from '../api'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Users, Edit, ShieldCheck, Check, X } from 'lucide-react'

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Edit Role Modal
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>('READER')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getUsers()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEdit = (user: User) => {
    setEditingUser(user)
    setSelectedRole(user.role)
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsUpdating(true)
    try {
      await adminApi.updateUserRole(editingUser.id, selectedRole)
      setEditingUser(null)
      loadUsers()
      alert('Đã cập nhật vai trò người dùng thành công!')
    } finally {
      setIsUpdating(false)
    }
  }

  // Permission Matrix Definition
  const permissionsMatrix = [
    { module: 'Đọc tin tức công khai', guest: true, reader: true, adv: true, editor: true, reviewer: true, finStaff: true, finMgr: true, admin: true },
    { module: 'Lưu bookmark & Bình luận', guest: false, reader: true, adv: false, editor: true, reviewer: true, finStaff: false, finMgr: false, admin: true },
    { module: 'Mua lẻ / Gói VIP Premium', guest: false, reader: true, adv: false, editor: false, reviewer: false, finStaff: false, finMgr: false, admin: true },
    { module: 'Đặt chỗ quảng cáo (Booking)', guest: false, reader: false, adv: true, editor: false, reviewer: false, finStaff: false, finMgr: false, admin: true },
    { module: 'Tải banner quảng cáo (Creative)', guest: false, reader: false, adv: true, editor: false, reviewer: false, finStaff: false, finMgr: false, admin: true },
    { module: 'Soạn bài & Lưu bản nháp', guest: false, reader: false, adv: false, editor: true, reviewer: true, finStaff: false, finMgr: false, admin: true },
    { module: 'Phê duyệt & Xuất bản bài viết', guest: false, reader: false, adv: false, editor: false, reviewer: true, finStaff: false, finMgr: false, admin: true },
    { module: 'Gửi báo giá quảng cáo', guest: false, reader: false, adv: false, editor: false, reviewer: true, finStaff: true, finMgr: false, admin: true },
    { module: 'Duyệt banner quảng cáo', guest: false, reader: false, adv: false, editor: false, reviewer: true, finStaff: false, finMgr: false, admin: true },
    { module: 'Xác nhận chuyển khoản ngân hàng', guest: false, reader: false, adv: false, editor: false, reviewer: false, finStaff: true, finMgr: true, admin: true },
    { module: 'Lập đề xuất hoàn tiền', guest: false, reader: false, adv: false, editor: false, reviewer: false, finStaff: true, finMgr: false, admin: false },
    { module: 'Phê duyệt hoàn tiền (Four-Eyes)', guest: false, reader: false, adv: false, editor: false, reviewer: false, finStaff: false, finMgr: true, admin: false },
    { module: 'Đóng kỳ đối soát tài chính', guest: false, reader: false, adv: false, editor: false, reviewer: false, finStaff: false, finMgr: true, admin: false },
    { module: 'Cấu hình Paywall & Hệ thống', guest: false, reader: false, adv: false, editor: false, reviewer: false, finStaff: false, finMgr: false, admin: true },
  ]

  return (
    <div className="space-y-8">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Quản trị Tài khoản & Phân quyền (RBAC)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quản lý tài khoản người dùng, phân tách trách nhiệm nghiệp vụ và ma trận kiểm soát truy cập
        </p>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Danh sách người dùng ({users.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò (Role)</th>
                <th className="px-4 py-3">Doanh nghiệp (nếu có)</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 flex items-center space-x-2.5">
                    <img
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-slate-200"
                    />
                    <span className="font-bold text-slate-900">{u.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{u.companyName || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(u)}
                      className="text-xs h-7"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Đổi Role
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role / Permission Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-900">
            Ma trận Phân quyền Chức năng (Role & Permission Matrix)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Quy định phân định quyền hạn rõ ràng, tránh xung đột lợi ích giữa Kế toán, Tòa soạn và Doanh nghiệp
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-2.5">Quyền hạn / Nghiệp vụ</th>
                <th className="px-2 py-2.5 text-center">Khách</th>
                <th className="px-2 py-2.5 text-center">Độc giả</th>
                <th className="px-2 py-2.5 text-center">Quảng cáo</th>
                <th className="px-2 py-2.5 text-center">Editor</th>
                <th className="px-2 py-2.5 text-center">Reviewer</th>
                <th className="px-2 py-2.5 text-center">KT Viên</th>
                <th className="px-2 py-2.5 text-center">KT Trưởng</th>
                <th className="px-2 py-2.5 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {permissionsMatrix.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2 font-medium text-slate-800">{p.module}</td>
                  <td className="px-2 py-2 text-center">{p.guest ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="px-2 py-2 text-center">{p.reader ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="px-2 py-2 text-center">{p.adv ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="px-2 py-2 text-center">{p.editor ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="px-2 py-2 text-center">{p.reviewer ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="px-2 py-2 text-center">{p.finStaff ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="px-2 py-2 text-center">{p.finMgr ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                  <td className="px-2 py-2 text-center">{p.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Dialog */}
      {editingUser && (
        <Dialog
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          title={`Phân quyền tài khoản: ${editingUser.name}`}
        >
          <form onSubmit={handleUpdateRole} className="space-y-4 text-xs">
            <div>
              <Label htmlFor="roleSel" required>Chọn vai trò (Role)</Label>
              <select
                id="roleSel"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-xs font-semibold focus:ring-2 focus:ring-primary-900"
              >
                {Object.entries(ROLE_LABELS).map(([rKey, rLabel]) => (
                  <option key={rKey} value={rKey}>
                    {rLabel} ({rKey})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                Hủy bỏ
              </Button>
              <Button type="submit" size="sm" isLoading={isUpdating}>
                Lưu quyền hạn
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
