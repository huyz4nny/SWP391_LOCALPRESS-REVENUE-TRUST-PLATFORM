import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { ROLE_LABELS, PERMISSION_CHECKERS } from '@/app/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { ShieldCheck, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import { APP_CONFIG } from '@/app/config'
import { advertisingApi } from '@/features/advertising/api'
import { httpClient } from '@/lib/http/client'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const users = mockStore.getState().users

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')
    if (!APP_CONFIG.useMockApi) {
      try {
        httpClient.setBasicAuth(email, password)
        const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

        if (matched && PERMISSION_CHECKERS.canAccessFinance(matched.role)) {
          // Xác thực tài khoản kế toán với backend Spring Boot thật
          await httpClient.get('/finance/dashboard')
          mockStore.setCurrentUser(matched.id)
          navigate(PERMISSION_CHECKERS.getDefaultBackofficeRoute(matched.role), { replace: true })
        } else {
          // Xác thực tài khoản Doanh nghiệp hoặc role khác
          try {
            const user = await advertisingApi.getMe()
            mockStore.setRealAdvertiser({ ...user, createdAt: new Date().toISOString() })
            navigate(
              PERMISSION_CHECKERS.canAccessBackoffice(user.role)
                ? PERMISSION_CHECKERS.getDefaultBackofficeRoute(user.role)
                : user.role === 'ADVERTISER'
                ? '/advertiser/profile'
                : '/',
              { replace: true }
            )
          } catch (advError) {
            if (matched) {
              mockStore.setCurrentUser(matched.id)
              navigate(
                PERMISSION_CHECKERS.canAccessBackoffice(matched.role)
                  ? PERMISSION_CHECKERS.getDefaultBackofficeRoute(matched.role)
                  : from === '/login'
                  ? '/'
                  : from,
                { replace: true }
              )
            } else {
              throw advError
            }
          }
        }
      } catch (error) {
        httpClient.clearBasicAuth()
        setLoginError(error instanceof Error ? error.message : 'Tài khoản hoặc mật khẩu không chính xác')
      } finally {
        setIsLoading(false)
      }
      return
    }
    setTimeout(() => {
      // Find matching user or fallback to reader-free
      const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
      if (matched) {
        mockStore.setCurrentUser(matched.id)
      } else {
        mockStore.setCurrentUser('user-reader-free')
      }
      setIsLoading(false)
      navigate(from, { replace: true })
    }, 400)
  }

  const handleQuickLogin = (userId: string) => {
    mockStore.setCurrentUser(userId)
    const user = users.find((u) => u.id === userId)
    if (user?.role === 'ADVERTISER') {
      navigate('/advertiser', { replace: true })
    } else if (user && PERMISSION_CHECKERS.canAccessBackoffice(user.role)) {
      navigate(PERMISSION_CHECKERS.getDefaultBackofficeRoute(user.role), { replace: true })
    } else {
      navigate(from === '/login' ? '/' : from, { replace: true })
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="text-center mb-8">
        <Link to="/" className="inline-block">
          <h1 className="font-serif text-3xl font-black text-primary-950 uppercase tracking-tight">
            Local<span className="text-crimson">Press</span>
          </h1>
        </Link>
        <p className="text-sm text-stone-500 mt-1">Đăng nhập tài khoản Báo điện tử LocalPress</p>
      </div>

      <div className={`grid grid-cols-1 gap-8 items-start ${APP_CONFIG.useMockApi ? 'md:grid-cols-2' : 'max-w-md mx-auto'}`}>
        {/* Left: Standard Form */}
        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập tài khoản</CardTitle>
            <CardDescription>Nhập thông tin email và mật khẩu của bạn</CardDescription>
          </CardHeader>
          <form onSubmit={handleCustomLogin}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" required>
                  Địa chỉ Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vidu@domain.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password" required>
                    Mật khẩu
                  </Label>
                  <Link to="/forgot-password" className="text-xs text-primary-800 hover:underline">
                    Quên mật khẩu?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              {loginError && <p role="alert" className="text-sm text-red-700">{loginError}</p>}
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Đăng nhập
              </Button>
              <div className="text-center text-xs text-stone-500">
                Chưa có tài khoản?{' '}
                <Link to="/register" className="text-primary-800 font-semibold hover:underline">
                  Đăng ký miễn phí
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Right: Quick Demo Persona Selector */}
        {APP_CONFIG.useMockApi && <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xl border border-slate-700">
          <div className="flex items-center space-x-2 text-amber-400 mb-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Chọn nhanh vai trò Demo (Mock)</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Bấm chọn để kiểm thử trực tiếp quyền hạn và giao diện của từng phân hệ:
          </p>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {users
              .filter((u) => u.role !== 'GUEST')
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.id)}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <img
                      src={u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0"
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                        {u.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{ROLE_LABELS[u.role]}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0 ml-2" />
                </button>
              ))}
          </div>
        </div>}
      </div>
    </div>
  )
}
