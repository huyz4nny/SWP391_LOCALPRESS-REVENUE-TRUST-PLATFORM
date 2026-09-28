import React, { useState, useEffect } from 'react'
import { PaywallSettings } from '../types'
import { adminApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Settings, ShieldCheck, Crown, Smartphone, Save } from 'lucide-react'

export function PaywallConfigPage() {
  const [settings, setSettings] = useState<PaywallSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getPaywallSettings()
      setSettings(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    setIsSaving(true)
    try {
      await adminApi.updatePaywallSettings(settings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu cấu hình')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading || !settings) {
    return <div className="py-12 text-center animate-pulse">Đang tải cấu hình Paywall...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Cấu hình Paywall Engine & Giới hạn Thiết bị
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Thiết lập tham số máy chủ kiểm tra quyền truy cập bài viết chuyên sâu và chính sách bảo vệ nội dung
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Crown className="w-4 h-4 mr-1.5 text-amber-600" />
              Tham số Paywall cốt lõi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Kích hoạt Paywall toàn hệ thống</span>
                <span className="text-[11px] text-slate-500">
                  Khi tắt, tất cả độc giả vãng lai đều đọc được toàn văn mà không cần thanh toán
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.paywallEnabled}
                onChange={(e) => setSettings({ ...settings, paywallEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-primary-900 cursor-pointer"
              />
            </div>

            <div>
              <Label htmlFor="wordLimit" required>
                Số từ trích đoạn xem thử miễn phí (Preview Word Limit)
              </Label>
              <Input
                id="wordLimit"
                type="number"
                value={settings.previewWordLimit}
                onChange={(e) => setSettings({ ...settings, previewWordLimit: Number(e.target.value) })}
                min={50}
                max={500}
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Mặc định: 120 từ. Đoạn xem thử được gửi từ server, không giấu bằng CSS ngoài giao diện.
              </p>
            </div>

            <div>
              <Label htmlFor="maxDevices" required>
                Giới hạn số thiết bị đăng nhập đồng thời tối đa
              </Label>
              <Input
                id="maxDevices"
                type="number"
                value={settings.maxDevicesAllowed}
                onChange={(e) => setSettings({ ...settings, maxDevicesAllowed: Number(e.target.value) })}
                min={1}
                max={5}
                required
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Quy định chuẩn của đồ án: <strong>2 thiết bị</strong> (1 máy tính + 1 điện thoại).
              </p>
            </div>

            <div>
              <Label htmlFor="defaultPrice" required>
                Đơn giá mua lẻ bài viết mặc định (VND)
              </Label>
              <Input
                id="defaultPrice"
                type="number"
                value={settings.pricePerArticleDefault}
                onChange={(e) => setSettings({ ...settings, pricePerArticleDefault: Number(e.target.value) })}
                step={1000}
                min={5000}
                required
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Đóng dấu Watermark bản quyền</span>
                <span className="text-[11px] text-slate-500">
                  Chèn mã định danh người mua mờ vào ảnh và bài viết để chống copy trái phép
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.watermarkEnabled}
                onChange={(e) => setSettings({ ...settings, watermarkEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-primary-900 cursor-pointer"
              />
            </div>

            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              Lần cập nhật cuối: {formatDateTime(settings.lastUpdatedAt)} bởi {settings.updatedBy}
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-xs font-semibold text-emerald-600">✓ Đã lưu cấu hình máy chủ!</span>
            ) : <span />}
            <Button type="submit" isLoading={isSaving}>
              <Save className="w-3.5 h-3.5 mr-1" />
              Lưu cấu hình Paywall
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
