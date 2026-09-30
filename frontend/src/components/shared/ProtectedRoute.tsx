import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { UserRole, ROLE_LABELS, PERMISSION_CHECKERS } from '@/app/config'
import { ShieldAlert, ArrowLeft, ArrowRight, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
  subsystemName: string
  suggestedUserId?: string
  children: React.ReactNode
}

export function ProtectedRoute({
  allowedRoles,
  subsystemName,
  suggestedUserId,
  children,
}: ProtectedRouteProps) {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = mockStore.subscribe(() => {
      setCurrentUser(mockStore.getCurrentUser())
    })
    return unsub
  }, [])

  const hasPermission = allowedRoles.includes(currentUser.role)

  if (hasPermission) {
    return <>{children}</>
  }

  // Find demo account suggestions that match allowed roles
  const users = mockStore.getState().users
  const recommendedUsers = users.filter((u) => allowedRoles.includes(u.role))
  const userAllowedHome = PERMISSION_CHECKERS.getDefaultBackofficeRoute(currentUser.role)

  return (
    <div className="max-w-xl mx-auto py-12 px-4 text-center">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2.5 py-1 rounded-full mb-3">
          403 Forbidden — Phân quyền truy cập
        </span>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Không có quyền truy cập {subsystemName}
        </h2>

        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Tài khoản hiện tại của bạn là <strong className="text-slate-900">{currentUser.name}</strong> với vai trò{' '}
          <strong className="text-primary-700">[{ROLE_LABELS[currentUser.role]}]</strong>. Khu vực này được bảo vệ nghiêm ngặt và chỉ cho phép các vai trò:{' '}
          <span className="font-semibold text-slate-900">
            {allowedRoles.map((r) => ROLE_LABELS[r]).join(', ')}
          </span>.
        </p>

        {/* Quick Demo Switcher if mock store has matching users */}
        {recommendedUsers.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
            <div className="text-[11px] font-bold uppercase text-slate-500 mb-2.5 flex items-center">
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
              Chuyển nhanh tài khoản demo có thẩm quyền:
            </div>
            <div className="space-y-1.5">
              {recommendedUsers.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  onClick={() => mockStore.setCurrentUser(u.id)}
                  className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-sky-500 hover:bg-sky-50/50 transition-colors text-slate-700 hover:text-sky-900 cursor-pointer shadow-sm"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold">{u.name}</span>
                    <span className="text-[10px] text-slate-500">({ROLE_LABELS[u.role]})</span>
                  </div>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                    Đăng nhập
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(userAllowedHome)}
            className="w-full sm:w-auto text-xs border-slate-300"
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Về phân hệ của bạn
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Về Trang báo công khai
          </Button>
        </div>
      </div>
    </div>
  )
}
