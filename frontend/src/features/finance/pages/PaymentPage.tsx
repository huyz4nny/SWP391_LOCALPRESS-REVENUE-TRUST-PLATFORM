import React, { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Copy, RefreshCw, Zap } from 'lucide-react'
import { APP_CONFIG } from '@/app/config'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { paymentApi } from '../api/payment'
import type { IpnResult, PaymentOrderView } from '../types'
import { KeyValue, Notice } from '../components/LedgerUI'

/**
 * ==============================================================================
 * TRANG THANH TOÁN CHUNG /payment/:orderCode (SV4 - UC047..UC050)
 * ==============================================================================
 * Điểm bắt đầu luồng SV4. Mọi module (mua bài lẻ, gói hội viên, booking quảng cáo) tạo đơn xong
 * đều chuyển sang đây. LocalPress KHÔNG giữ tiền khách (không ví): khách quét QR SePay đã điền sẵn
 * đúng mã đơn + đúng số tiền, trang hỏi trạng thái 3 giây/lần cho đến khi webhook xác nhận.
 * Trang KHÔNG tự cấp quyền khi khách bấm "Tôi đã chuyển khoản" (Rule 4): chỉ kiểm tra lại trạng thái.
 * Chuyển sai số tiền / về muộn: đơn không được ghi nhận, khách gửi khiếu nại để kế toán chuyển trả.
 */

const POLL_INTERVAL_MS = 3000

export const PAYMENT_COMPLAINT_PATH = '/payment-complaints'

const ORDER_TYPE_LABELS: Record<PaymentOrderView['orderType'], string> = {
  ARTICLE: 'Mua bài viết Premium',
  SUBSCRIPTION: 'Gói hội viên',
  AD: 'Booking quảng cáo',
}

const DEFAULT_RETURN: Record<PaymentOrderView['orderType'], { to: string; label: string }> = {
  ARTICLE: { to: '/account/library', label: 'Mở tủ sách của tôi' },
  SUBSCRIPTION: { to: '/account/subscription', label: 'Xem gói hội viên' },
  AD: { to: '/advertiser/bookings', label: 'Về danh sách booking' },
}

const IPN_MESSAGES: Record<string, string> = {
  SUCCESS: 'SePay xác nhận đã nhận đúng số tiền, đơn đã thanh toán.',
  ALREADY_PROCESSED: 'Webhook lặp lại: hệ thống bỏ qua, không ghi nhận trùng (Rule 5).',
  AMOUNT_MISMATCH: 'Sai số tiền: đơn không được ghi nhận, khách gửi khiếu nại để kế toán chuyển trả.',
  LATE_PAYMENT: 'Tiền về sau khi đơn hết hiệu lực: không cấp quyền, kế toán chuyển trả (Rule 6).',
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

function complaintLink(order: PaymentOrderView) {
  return `${PAYMENT_COMPLAINT_PATH}?orderCode=${order.orderCode}&amount=${order.amount}`
}

export function PaymentPage() {
  const { orderCode = '' } = useParams<{ orderCode: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const returnUrl: string | undefined = (location.state as any)?.returnUrl

  const [order, setOrder] = useState<PaymentOrderView | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [ipnResult, setIpnResult] = useState<IpnResult | null>(null)
  // Lần giả lập gần nhất, để demo "SePay gửi lại" sau khi đơn đã thanh toán
  const [lastSim, setLastSim] = useState<{ amount: number; ref: string } | null>(null)
  const countdown = useCountdown(order?.expiresAt)
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'

  const load = useCallback(async () => {
    try {
      setOrder(await paymentApi.getOrder(orderCode))
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

  // UC050: hỏi trạng thái 3 giây/lần cho đến khi webhook xác nhận
  useEffect(() => {
    if (!order || order.status !== 'PENDING' || order.expired) return
    const t = setInterval(async () => {
      try {
        const s = await paymentApi.getStatus(orderCode)
        if (s.isPaid || s.status !== order.status || s.expired !== order.expired) await load()
      } catch {
        /* mạng chập chờn thì lần sau thử lại, không bắt khách trả tiền lại */
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [order, orderCode, load])

  // Hỏi thẳng API SePay cho đơn này rồi đọc lại. Không tự cấp quyền (Rule 4).
  const handleCheckAgain = async () => {
    setChecking(true)
    setActionError('')
    try {
      const r = await paymentApi.checkWithSepay(orderCode)
      if (r.checked && !r.found) {
        setActionError('SePay chưa thấy khoản chuyển nào có mã này. Ngân hàng có thể chậm vài phút, hãy kiểm tra lại sau.')
      }
    } catch (e: any) {
      setActionError(e?.message || 'Không kiểm tra được với SePay')
    }
    await load()
    setChecking(false)
  }

  /** Chỉ môi trường dev: giả lập SePay báo tiền về cho đơn này. */
  const handleSimulate = async (amount: number, referenceCode?: string) => {
    setBusy(true)
    setActionError('')
    try {
      const ref = referenceCode ?? `SIM${Date.now()}`
      setIpnResult(await paymentApi.simulateIpn(orderCode, amount, ref))
      setLastSim({ amount, ref })
      await load()
    } catch (e: any) {
      setActionError(e?.message || 'Giả lập webhook thất bại')
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 font-sans text-slate-900">
        <h1 className="text-xl font-semibold">Không mở được trang thanh toán</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
        <div className="mt-5 flex gap-2">
          <Button onClick={() => load()}>Thử lại</Button>
          <Button variant="outline" onClick={() => navigate('/')}>Về trang chủ</Button>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-[1040px] py-6" aria-busy="true">
        <div className="h-8 w-56 rounded bg-slate-200" />
        <div className="mt-5 h-80 rounded-lg border border-slate-200 bg-white" />
      </div>
    )
  }

  const back = returnUrl ? { to: returnUrl, label: 'Quay lại nội dung' } : DEFAULT_RETURN[order.orderType]
  const isDemo = APP_CONFIG.useMockApi || import.meta.env.DEV
  const detail = order.description && order.description !== ORDER_TYPE_LABELS[order.orderType] ? order.description : null

  // ----- Đã thanh toán -----
  if (order.isPaid) {
    return (
      <div className="mx-auto max-w-[560px] py-10 font-sans text-slate-900">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-positive">
            <CheckCircle2 className="h-4 w-4" />
            Đã thanh toán
          </div>
          <h1 className="mt-2 text-2xl font-semibold leading-8">{ORDER_TYPE_LABELS[order.orderType]}</h1>
          {detail && <p className="mt-1 font-serif text-base text-slate-700">{detail}</p>}
          <div className="mt-4 text-[32px] font-semibold leading-10 tracking-[-0.01em] num">{formatCurrency(order.amount)}</div>
          <dl className="mt-4">
            <KeyValue label="Mã đơn"><span className="font-mono">{order.orderCode}</span></KeyValue>
            <KeyValue label="Phương thức">Chuyển khoản QR SePay</KeyValue>
            <KeyValue label="Thời gian"><span className="num">{formatDateTime(order.paidAt)}</span></KeyValue>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => navigate(back.to)}>{back.label}</Button>
          </div>
        </section>

        {isDemo && lastSim && (
          <DemoBox title="Demo Rule 5: SePay gửi lại webhook">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(lastSim.amount, lastSim.ref)}>
              Bắn lại webhook cùng mã giao dịch
            </Button>
            {ipnResult && <IpnLine result={ipnResult} />}
          </DemoBox>
        )}
      </div>
    )
  }

  // ----- Đơn đã đóng / hết hạn -----
  if (order.status !== 'PENDING' || order.expired) {
    return (
      <div className="mx-auto max-w-[560px] py-10 font-sans text-slate-900">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold leading-8">
            {order.expired ? 'Đơn đã hết hạn thanh toán' : 'Đơn không còn hiệu lực'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Đơn <span className="font-mono text-slate-900">{order.orderCode}</span>, {formatCurrency(order.amount)}.
            Nếu bạn đã chuyển tiền cho đơn này, hãy gửi khiếu nại kèm mã giao dịch ngân hàng: kế toán sẽ đối chiếu
            sao kê và chuyển trả lại tài khoản của bạn.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => navigate(back.to)}>Tạo đơn mới</Button>
            <Button variant="outline" onClick={() => navigate(complaintLink(order))}>Gửi khiếu nại</Button>
          </div>
        </section>
        {isDemo && ipnResult && (
          <DemoBox title="Kết quả giả lập gần nhất">
            <IpnLine result={ipnResult} />
          </DemoBox>
        )}
      </div>
    )
  }

  // ----- Chờ thanh toán -----
  const urgent = countdown && countdown.left < 120000
  const wrongAmount = order.amount >= 2000 ? Math.floor(order.amount / 2 / 1000) * 1000 : null

  return (
    <div className="mx-auto max-w-[1040px] py-6 font-sans text-slate-900">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em]">Thanh toán đơn hàng</h1>
          <p className="mt-1 text-sm text-slate-600">
            {ORDER_TYPE_LABELS[order.orderType]} · mã đơn <span className="font-mono text-slate-900">{order.orderCode}</span>
          </p>
        </div>
        <Link to={back.to} className="text-[13px] text-slate-600 hover:text-slate-900 hover:underline">Hủy và quay lại</Link>
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Đơn hàng</h2>
          {detail && <p className="mt-2 font-serif text-[15px] leading-6 text-slate-900">{detail}</p>}
          <dl className="mt-3">
            <KeyValue label="Loại">{ORDER_TYPE_LABELS[order.orderType]}</KeyValue>
            <KeyValue label="Trạng thái"><StatusBadge type="payment" status={order.status} /></KeyValue>
            {/* Rule 6: chỉ booking quảng cáo giữ chỗ có hạn; bài / gói còn chờ là còn trả được */}
            {countdown && order.orderType === 'AD' && (
              <KeyValue label="Giữ chỗ trong">
                <span className={`font-semibold num ${urgent ? 'text-negative' : ''}`}>{countdown.text}</span>
              </KeyValue>
            )}
          </dl>
          <div className="mt-2 border-t border-slate-200 pt-3">
            <div className="text-[13px] text-slate-500">Tổng thanh toán</div>
            <div className="text-[30px] font-semibold leading-9 tracking-[-0.01em] num">{formatCurrency(order.amount)}</div>
          </div>
          <p className="mt-3 text-[13px] leading-5 text-slate-500">
            Đơn chỉ được ghi nhận khi máy chủ nhận xác nhận từ SePay, không phụ thuộc trình duyệt.
            LocalPress không giữ tiền của bạn: tiền đi thẳng vào thanh toán đơn này.
          </p>
        </section>

        <div className="space-y-4">
          {actionError && <Notice tone="error">{actionError}</Notice>}

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold">Quét mã QR để thanh toán</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Mã QR đã điền sẵn số tiền và nội dung. Không sửa số tiền hay nội dung khi chuyển, nếu không đơn sẽ không được ghi nhận tự động.
            </p>
            <div className="mt-4 grid grid-cols-1 items-start gap-6 sm:grid-cols-[240px_minmax(0,1fr)]">
              <div>
                {order.qrCodeUrl ? (
                  <img
                    src={order.qrCodeUrl}
                    alt={`Mã QR thanh toán ${formatCurrency(order.amount)}, nội dung ${order.transferContent}`}
                    className="mx-auto h-60 w-60 rounded-md border border-slate-200 bg-white object-contain"
                  />
                ) : (
                  <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-md border border-dashed border-slate-300 text-[13px] text-slate-500">
                    Chưa có mã QR
                  </div>
                )}
                <div className="mt-2 flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Đang chờ ngân hàng xác nhận
                </div>
              </div>
              <div>
                <dl className="rounded-md bg-slate-50 px-3.5 py-1">
                  <CopyRow label="Ngân hàng" value={order.bankCode || ''} />
                  <CopyRow label="Số tài khoản" value={order.accountNumber || ''} mono />
                  <CopyRow label="Chủ tài khoản" value={order.accountName || ''} />
                  <CopyRow label="Số tiền" value={String(order.amount)} display={formatCurrency(order.amount)} />
                  <CopyRow label="Nội dung" value={order.transferContent} mono strong />
                </dl>
                <Button variant="outline" className="mt-3 w-full" isLoading={checking} onClick={handleCheckAgain}>
                  Tôi đã chuyển khoản, kiểm tra lại
                </Button>
                <Link
                  to={complaintLink(order)}
                  className="mt-2 block text-center text-[13px] text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Chuyển hơn 15 phút mà chưa được ghi nhận? Gửi khiếu nại
                </Link>
              </div>
            </div>
          </section>

          {isDemo && (
            <DemoBox title="Demo: giả lập SePay báo tiền về (chỉ có ở môi trường dev)">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(order.amount, `DEMO-${order.orderCode}`)}>
                  Chuyển đúng {formatCurrency(order.amount)}
                </Button>
                {wrongAmount && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(wrongAmount)}>
                    Chuyển sai số tiền ({formatCurrency(wrongAmount)})
                  </Button>
                )}
              </div>
              {ipnResult && <IpnLine result={ipnResult} />}
            </DemoBox>
          )}
        </div>
      </div>
    </div>
  )
}

function DemoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 space-y-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
        <Zap className="h-3.5 w-3.5 text-slate-500" />
        {title}
      </div>
      {children}
    </section>
  )
}

function IpnLine({ result }: { result: IpnResult }) {
  return (
    <div className="text-[13px] text-slate-700">
      Kết quả: <span className="font-mono font-medium text-slate-900">{result.status}</span>. {IPN_MESSAGES[result.status] || result.message}
    </div>
  )
}

function CopyRow(props: { label: string; value: string; display?: string; mono?: boolean; strong?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 py-2 last:border-b-0">
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{props.label}</dt>
        <dd className={`truncate text-sm text-slate-900 ${props.mono ? 'font-mono' : 'num'} ${props.strong ? 'font-semibold' : ''}`}>
          {props.display ?? (props.value || '—')}
        </dd>
      </div>
      <button
        type="button"
        title={`Sao chép ${props.label.toLowerCase()}`}
        className="flex h-8 flex-none items-center gap-1 rounded-md px-2 text-xs text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer"
        onClick={() => {
          navigator.clipboard?.writeText(props.value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Đã chép' : 'Chép'}
      </button>
    </div>
  )
}
