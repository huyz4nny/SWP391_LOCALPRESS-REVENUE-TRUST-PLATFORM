import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { CheckCircle2, ArrowLeft } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Khôi phục mật khẩu</CardTitle>
          <CardDescription>
            Nhập email tài khoản của bạn để nhận liên kết đặt lại mật khẩu
          </CardDescription>
        </CardHeader>
        {sent ? (
          <CardContent className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm text-stone-700 font-medium mb-1">
              Liên kết khôi phục đã được gửi tới:
            </p>
            <p className="text-xs text-stone-500 font-mono mb-4">{email}</p>
            <p className="text-xs text-stone-400">
              Vui lòng kiểm tra hộp thư đến hoặc thư mục Spam. Liên kết có hiệu lực trong 15 phút.
            </p>
            <div className="mt-6">
              <Link to="/login" className="inline-flex items-center text-xs text-primary-800 font-semibold hover:underline">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Quay lại màn hình đăng nhập
              </Link>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email" required>
                  Email đăng ký
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
            </CardContent>
            <CardFooter className="flex flex-col space-y-3">
              <Button type="submit" className="w-full">
                Gửi hướng dẫn khôi phục
              </Button>
              <div className="text-center text-xs text-stone-500">
                <Link to="/login" className="text-stone-600 hover:text-stone-900">
                  Nhớ mật khẩu rồi? Đăng nhập
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
