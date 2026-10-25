import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { UserRole, ROLE_LABELS, PERMISSION_CHECKERS } from '@/app/config'
import { ArrowLeft, ArrowRight } from 'lucide-react'
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
    <div className="max-w-xl mx-auto py-12 px-4">
      <div className="bg-white rounded-lg border border-slate-200 p-6 text-slate-800">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Không có quyền truy cập {subsystemName}
        </h2>

        <p className="text-sm text-slate-600 mb-5 leading-6">
          Tài khoản hiện tại của bạn là <strong className="text-slate-900">{currentUser.name}</strong> với vai trò{' '}
          <strong className="text-slate-900">{ROLE_LABELS[currentUser.role]}</strong>. Khu vực này được bảo vệ nghiêm ngặt và chỉ cho phép các vai trò:{' '}
          <span className="font-semibold text-slate-900">
            {allowedRoles.map((r) => ROLE_LABELS[r]).join(', ')}
          </span>.
        </p>

        {/* Quick Demo Switcher if mock store has matching users */}
        {recommendedUsers.length > 0 && (
          <div className="bg-slate-50 rounded-md p-4 mb-5">
            <div className="text-[13px] font-medium text-slate-700 mb-2.5">
              Chuyển nhanh sang tài khoản demo có quyền
            </div>
            <div className="space-y-1.5">
              {recommendedUsers.slice(0, 3).map((u) => (
                <button
                  key={u.id}
                  onClick={() => mockStore.setCurrentUser(u.id)}
                  className="w-full flex items-center justify-between text-[13px] px-3 py-2 rounded-md bg-white border border-slate-200 hover:border-slate-400 transition-colors text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                                        <span className="font-semibold">{u.name}</span>
                    <span className="text-xs text-slate-500">({ROLE_LABELS[u.role]})</span>
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
