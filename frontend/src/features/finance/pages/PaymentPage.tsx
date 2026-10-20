import React, { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Zap,
} from 'lucide-react'
import { APP_CONFIG } from '@/app/config'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { paymentApi } from '../api/payment'
import type { IpnResult, PaymentOrderView } from '../types'

/**
 * ==============================================================================
 * TRANG THANH TOÁN CHUNG /payment/:orderCode (SV4 - UC047..UC050)
 * ==============================================================================
 * Điểm bắt đầu luồng SV4. Mọi module (mua bài lẻ, gói hội viên, booking quảng cáo, nạp ví)
 * tạo đơn xong đều chuyển sang đây. Khách chọn:
 *  - Ví LocalPress: trả bằng số dư, thiếu thì nạp thêm.
 *  - QR SePay: quét mã, trang tự polling trạng thái 3 giây/lần cho đến khi webhook xác nhận.
 * Trang KHÔNG tự cấp quyền khi khách bấm "Tôi đã chuyển khoản" (Rule 4): chỉ kiểm tra lại trạng thái.
 */

const POLL_INTERVAL_MS = 3000

const ORDER_TYPE_LABELS: Record<PaymentOrderView['orderType'], string> = {
  ARTICLE: 'Mua bài viết Premium',
  SUBSCRIPTION: 'Gói hội viên',
  AD: 'Booking quảng cáo',
  TOPUP: 'Nạp tiền vào Ví LocalPress',
}

const DEFAULT_RETURN: Record<PaymentOrderView['orderType'], { to: string; label: string }> = {
  ARTICLE: { to: '/account/library', label: 'Mở tủ sách của tôi' },
  SUBSCRIPTION: { to: '/account/subscription', label: 'Xem gói hội viên' },
  AD: { to: '/advertiser/bookings', label: 'Về danh sách booking' },
  TOPUP: { to: '/wallet', label: 'Xem Ví LocalPress' },
}

const IPN_MESSAGES: Record<string, string> = {
  SUCCESS: 'SePay xác nhận đã nhận đủ tiền.',
  ALREADY_PROCESSED: 'Webhook lặp lại: hệ thống bỏ qua, không cộng trùng (Rule 5).',
  UNDERPAID_CREDITED_TO_WALLET: 'Chuyển thiếu: số tiền đã nhận được cộng vào ví, đơn vẫn chờ thanh toán.',
  LATE_PAYMENT_CREDITED_TO_WALLET: 'Tiền về sau khi đơn hết hiệu lực: tiền được cộng vào ví (Rule 6).',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn, chờ Kế toán đối soát.',
}

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!expiresAt) return null
  const left = Math.max(0, Date.parse(expiresAt) - now)
  const m = Math.floor(left / 60000)
  const s = Math.floor((left % 60000) / 1000)
  return { left, text: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
}

function notifyWalletChanged() {
  window.dispatchEvent(new Event('localpress-wallet-changed'))
}

export function PaymentPage() {
  const { orderCode = '' } = useParams<{ orderCode: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const returnUrl: string | undefined = (location.state as any)?.returnUrl

  const [order, setOrder] = useState<PaymentOrderView | null>(null)
  const [balance, setBalance] = useState(0)
  const [method, setMethod] = useState<'QR' | 'WALLET'>('QR')
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [ipnResult, setIpnResult] = useState<IpnResult | null>(null)
  const countdown = useCountdown(order?.expiresAt)
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'

  const load = useCallback(async () => {
    try {
      const [o, w] = await Promise.all([paymentApi.getOrder(orderCode), paymentApi.getWallet().catch(() => null)])
      setOrder(o)
      if (w) setBalance(w.balance)
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Không tải được đơn hàng')
    }
  }, [orderCode])

  useEffect(() => {
    if (isGuest) {
      navigate('/login', { replace: true, state: { from: { pathname: `/payment/${orderCode}` } } })
      return
    }
    load()
  }, [isGuest, load, navigate, orderCode])

  // UC050: polling trạng thái khi đơn còn chờ thanh toán
  useEffect(() => {
    if (!order || order.status !== 'PENDING' || order.expired) return
    const t = setInterval(async () => {
      try {
        const s = await paymentApi.getStatus(orderCode)
        if (s.isPaid || s.status !== order.status || s.expired !== order.expired) {
          await load()
          if (s.isPaid) notifyWalletChanged()
        }
      } catch {
        /* mạng chập chờn thì lần sau thử lại, không bắt khách trả tiền lại */
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [order, orderCode, load])

  const handleCheckAgain = async () => {
    setChecking(true)
    await load()
    setChecking(false)
  }

  const handlePayWithWallet = async () => {
    setBusy(true)
    setActionError('')
    try {
      await paymentApi.payWithWallet(orderCode)
      notifyWalletChanged()
      await load()
    } catch (e: any) {
      setActionError(e?.message || 'Thanh toán bằng ví thất bại')
    } finally {
      setBusy(false)
    }
  }

  const handleSimulate = async (amount?: number, referenceCode?: string) => {
    setBusy(true)
    setActionError('')
    try {
      setIpnResult(await paymentApi.simulateIpn(orderCode, amount, referenceCode))
      notifyWalletChanged()
      await load()
    } catch (e: any) {
      setActionError(e?.message || 'Giả lập webhook thất bại')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-crimson mx-auto mb-3" />
        <h2 className="text-lg font-bold text-stone-900 mb-1">Không mở được trang thanh toán</h2>
        <p className="text-sm text-stone-500 mb-5">{error}</p>
        <Button onClick={() => navigate('/')}>Về trang chủ</Button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-pulse">
        <div className="h-72 bg-stone-200 rounded-xl" />
      </div>
    )
  }

  const back = returnUrl ? { to: returnUrl, label: 'Quay lại nội dung' } : DEFAULT_RETURN[order.orderType]
  const isTopUp = order.orderType === 'TOPUP'
  const shortfall = Math.max(0, order.amount - balance)
  const isDemo = APP_CONFIG.useMockApi || import.meta.env.DEV

  // ----- Đã thanh toán -----
  if (order.isPaid) {
    return (
      <div className="max-w-lg mx-auto py-14 px-4">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8 space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" />
            <h1 className="font-serif text-2xl font-bold text-stone-900">Thanh toán thành công</h1>
            <p className="text-sm text-stone-600">
              {ORDER_TYPE_LABELS[order.orderType]}
              {order.description && order.description !== ORDER_TYPE_LABELS[order.orderType] ? `: ${order.description}` : ''}
            </p>
            <div className="text-2xl font-bold text-primary-900">{formatCurrency(order.amount)}</div>
            <div className="text-xs text-stone-500 space-y-0.5">
              <div>Mã đơn: <span className="font-mono font-semibold">{order.orderCode}</span></div>
              <div>Phương thức: {order.paymentMethod === 'WALLET' ? 'Ví LocalPress' : 'Chuyển khoản QR SePay'}</div>
              <div>Thời gian: {formatDateTime(order.paidAt)}</div>
            </div>
            <div className="pt-3 flex justify-center gap-2">
              <Button onClick={() => navigate(back.to)}>{back.label}</Button>
              {!isTopUp && (
                <Button variant="outline" onClick={() => navigate('/wallet')}>Xem ví</Button>
              )}
            </div>
            {isDemo && order.paymentMethod !== 'WALLET' && (
              <div className="mt-4 rounded-lg border border-dashed border-sky-300 bg-sky-50 p-3 text-left space-y-2">
                <div className="flex items-center text-xs font-bold uppercase text-sky-800">
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  Demo Rule 5: SePay gửi lại webhook
                </div>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(order.amount, `DEMO-${order.orderCode}`)}>
                  Bắn lại webhook (cùng mã giao dịch)
                </Button>
                {ipnResult && (
                  <div className="text-xs text-sky-900">
                    Kết quả: <span className="font-mono font-bold">{ipnResult.status}</span>.{' '}
                    {IPN_MESSAGES[ipnResult.status] || ipnResult.message}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ----- Đơn đã đóng / hết hạn -----
  if (order.status !== 'PENDING' || order.expired) {
    return (
      <div className="max-w-lg mx-auto py-14 px-4 text-center space-y-3">
        <Clock className="w-12 h-12 text-stone-400 mx-auto" />
        <h1 className="font-serif text-xl font-bold text-stone-900">
          {order.expired ? 'Mã thanh toán đã hết hạn' : 'Đơn hàng không còn hiệu lực'}
        </h1>
        <p className="text-sm text-stone-500">
          Nếu bạn đã chuyển khoản sau thời điểm này, tiền sẽ được cộng vào Ví LocalPress, không bị mất.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          {isTopUp ? (
            <Button onClick={() => navigate(`/wallet/topup?amount=${order.amount}`)}>Tạo mã nạp mới</Button>
          ) : (
            <Button onClick={() => navigate(back.to)}>Quay lại tạo đơn mới</Button>
          )}
          <Button variant="outline" onClick={() => navigate('/wallet')}>Kiểm tra ví</Button>
        </div>
        <Link
          to={`/wallet/complaints?orderCode=${order.orderCode}&amount=${order.amount}`}
          className="inline-block text-xs text-stone-500 hover:text-crimson underline"
        >
          Đã chuyển tiền nhưng chưa được ghi nhận? Gửi khiếu nại
        </Link>
      </div>
    )
  }

  // ----- Chờ thanh toán -----
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">Thanh toán đơn hàng</h1>
        <p className="text-xs text-stone-500 mt-1">
          Mã đơn <span className="font-mono font-semibold text-stone-800">{order.orderCode}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Tóm tắt đơn */}
        <Card className="md:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Thông tin đơn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-stone-500">Loại</div>
              <div className="font-semibold text-stone-900">{ORDER_TYPE_LABELS[order.orderType]}</div>
            </div>
            {order.description && order.description !== ORDER_TYPE_LABELS[order.orderType] && (
              <div>
                <div className="text-xs text-stone-500">Nội dung</div>
                <div className="font-serif text-stone-900">{order.description}</div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500">Trạng thái</span>
              <StatusBadge type="payment" status={order.status} />
            </div>
            <div className="border-t border-stone-200 pt-3 flex items-baseline justify-between">
              <span className="text-xs text-stone-500">Tổng thanh toán</span>
              <span className="text-xl font-bold text-primary-900">{formatCurrency(order.amount)}</span>
            </div>
            {countdown && (
              <div className={`flex items-center text-xs ${countdown.left < 120000 ? 'text-crimson' : 'text-stone-500'}`}>
                <Clock className="w-3.5 h-3.5 mr-1" />
                Mã thanh toán hết hạn sau <span className="font-mono font-bold ml-1">{countdown.text}</span>
              </div>
            )}
            <div className="flex items-start text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded p-2">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 mt-0.5 text-emerald-600 shrink-0" />
              Quyền lợi chỉ được kích hoạt khi máy chủ nhận xác nhận từ SePay, không phụ thuộc trình duyệt.
            </div>
          </CardContent>
        </Card>

        {/* Phương thức */}
        <div className="md:col-span-8 space-y-4">
          {!isTopUp && (
            <div className="grid grid-cols-2 gap-3">
              <MethodTab
                active={method === 'QR'}
                onClick={() => setMethod('QR')}
                icon={<QrCode className="w-5 h-5" />}
                title="Quét mã QR SePay"
                sub="Mọi ứng dụng ngân hàng, xác nhận tự động"
              />
              <MethodTab
                active={method === 'WALLET'}
                onClick={() => setMethod('WALLET')}
                icon={<Wallet className="w-5 h-5" />}
                title="Ví LocalPress"
                sub={`Số dư ${formatCurrency(balance)}`}
              />
            </div>
          )}

          {actionError && (
            <div className="flex items-center text-sm text-crimson bg-red-50 border border-red-200 rounded p-3">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
              {actionError}
            </div>
          )}

          {method === 'WALLET' && !isTopUp ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded border border-stone-200 p-3">
                    <div className="text-xs text-stone-500">Số dư hiện tại</div>
                    <div className="font-bold text-stone-900">{formatCurrency(balance)}</div>
                  </div>
                  <div className="rounded border border-stone-200 p-3">
                    <div className="text-xs text-stone-500">Cần thanh toán</div>
                    <div className="font-bold text-primary-900">{formatCurrency(order.amount)}</div>
                  </div>
                  <div className="rounded border border-stone-200 p-3">
                    <div className="text-xs text-stone-500">Còn lại sau thanh toán</div>
                    <div className={`font-bold ${shortfall > 0 ? 'text-crimson' : 'text-emerald-700'}`}>
                      {shortfall > 0 ? `Thiếu ${formatCurrency(shortfall)}` : formatCurrency(balance - order.amount)}
                    </div>
                  </div>
                </div>
                {shortfall > 0 ? (
                  <Button
                    className="w-full bg-gold hover:bg-amber-700 text-white"
                    onClick={() =>
                      navigate(
                        `/wallet/topup?amount=${Math.max(10000, Math.ceil(shortfall / 10000) * 10000)}&returnTo=${encodeURIComponent(`/payment/${order.orderCode}`)}`
                      )
                    }
                  >
                    Nạp thêm để thanh toán
                  </Button>
                ) : (
                  <Button className="w-full" disabled={busy} onClick={handlePayWithWallet}>
                    {busy ? 'Đang xử lý...' : `Thanh toán ${formatCurrency(order.amount)} bằng ví`}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div className="text-center">
                    {order.qrCodeUrl ? (
                      <img
                        src={order.qrCodeUrl}
                        alt={`Mã QR thanh toán ${order.orderCode}`}
                        className="w-60 h-60 mx-auto rounded-lg border border-stone-200 bg-white object-contain"
                      />
                    ) : (
                      <div className="w-60 h-60 mx-auto rounded-lg bg-stone-100" />
                    )}
                    <div className="flex items-center justify-center text-xs text-stone-500 mt-2">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Đang chờ xác nhận từ ngân hàng...
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <CopyRow label="Ngân hàng" value={order.bankCode || ''} />
                    <CopyRow label="Số tài khoản" value={order.accountNumber || ''} />
                    <CopyRow label="Chủ tài khoản" value={order.accountName || ''} />
                    <CopyRow label="Số tiền" value={String(order.amount)} display={formatCurrency(order.amount)} />
                    <CopyRow label="Nội dung CK" value={order.transferContent} highlight />
                    <p className="text-[11px] text-stone-500">
                      Giữ nguyên nội dung chuyển khoản để hệ thống tự khớp đơn. Chuyển thiếu hoặc thừa, phần chênh lệch sẽ vào ví.
                    </p>
                    <Button variant="outline" className="w-full" disabled={checking} onClick={handleCheckAgain}>
                      {checking ? 'Đang kiểm tra...' : 'Tôi đã chuyển khoản, kiểm tra lại'}
                    </Button>
                    <Link
                      to={`/wallet/complaints?orderCode=${order.orderCode}&amount=${order.amount}`}
                      className="block text-center text-[11px] text-stone-500 hover:text-crimson underline"
                    >
                      Đã chuyển hơn 15 phút mà chưa được ghi nhận? Gửi khiếu nại
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isDemo && (method === 'QR' || isTopUp) && (
            <div className="rounded-lg border border-dashed border-sky-300 bg-sky-50 p-4 space-y-2">
              <div className="flex items-center text-xs font-bold uppercase text-sky-800">
                <Zap className="w-3.5 h-3.5 mr-1" />
                Demo: giả lập SePay bắn webhook (chỉ có ở môi trường dev)
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => handleSimulate(order.amount, `DEMO-${order.orderCode}`)}>
                  Chuyển đủ tiền
                </Button>
                {!isTopUp && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(Math.floor(order.amount / 2))}>
                    Chuyển thiếu 50%
                  </Button>
                )}
              </div>
              {ipnResult && (
                <div className="text-xs text-sky-900">
                  Kết quả webhook: <span className="font-mono font-bold">{ipnResult.status}</span>.{' '}
                  {IPN_MESSAGES[ipnResult.status] || ipnResult.message}
                </div>
              )}
            </div>
          )}

          <div className="text-center text-xs text-stone-500">
            <Link to={back.to} className="hover:text-stone-800 underline">Hủy và quay lại</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function MethodTab(props: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`text-left p-3.5 rounded-lg border-2 flex items-center gap-3 transition-all cursor-pointer ${
        props.active ? 'border-primary-900 bg-primary-50/40' : 'border-stone-200 hover:border-stone-300 bg-white'
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-900 flex items-center justify-center shrink-0">
        {props.icon}
      </div>
      <div>
        <div className="text-sm font-bold text-stone-900">{props.title}</div>
        <div className="text-xs text-stone-500">{props.sub}</div>
      </div>
    </button>
  )
}

function CopyRow(props: { label: string; value: string; display?: string; highlight?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className={`flex items-center justify-between rounded px-2.5 py-1.5 ${props.highlight ? 'bg-amber-50 border border-amber-300' : 'bg-stone-50'}`}>
      <div>
        <div className="text-[11px] text-stone-500">{props.label}</div>
        <div className={`font-semibold ${props.highlight ? 'font-mono text-amber-900' : 'text-stone-900'}`}>
          {props.display ?? props.value}
        </div>
      </div>
      <button
        type="button"
        title="Sao chép"
        className="text-stone-400 hover:text-stone-800 cursor-pointer"
        onClick={() => {
          navigator.clipboard?.writeText(props.value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  )
}
