import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { mockStore } from '@/mocks/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

export function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!')
      return
    }

    // Create user in mock store
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      phone,
      role: 'READER' as const,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      isActive: true,
    }
    mockStore.getState().users.push(newUser)
    mockStore.setCurrentUser(newUser.id)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Đăng ký thành công!</h2>
        <p className="text-sm text-stone-600 mb-6">
          Chào mừng <strong>{name}</strong> đã gia nhập cộng đồng độc giả LocalPress. Bạn hiện có thể đánh dấu bài viết, bình luận và mua các ấn phẩm đặc biệt.
        </p>
        <Button onClick={() => navigate('/')} className="w-full">
          Bắt đầu đọc báo ngay
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Tạo tài khoản Độc giả</CardTitle>
          <CardDescription>Đồng hành cùng nền tảng báo điện tử địa phương uy tín</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name" required>
                Họ và tên
              </Label>
              <Input
                id="name"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
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
              <Label htmlFor="phone">Số điện thoại (để nhận mã OTP/Hóa đơn)</Label>
              <Input
                id="phone"
                placeholder="0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password" required>
                Mật khẩu (tối thiểu 6 ký tự)
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" required>
                Nhập lại mật khẩu
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full">
              Đăng ký tài khoản
            </Button>
            <div className="text-center text-xs text-stone-500">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary-800 font-semibold hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
