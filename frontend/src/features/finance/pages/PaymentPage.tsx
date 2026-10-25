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
  SUCCESS: 'SePay xác nhận tiền đã về ví.',
  ALREADY_PROCESSED: 'Webhook lặp lại: hệ thống bỏ qua, không cộng trùng (Rule 5).',
  UNDERPAID_CREDITED_TO_WALLET: 'Chuyển thiếu: số tiền đã nhận được cộng vào ví, đơn vẫn chờ thanh toán.',
  LATE_PAYMENT_CREDITED_TO_WALLET: 'Tiền về sau khi đơn hết hiệu lực: tiền được cộng vào ví (Rule 6).',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn, chờ Kế toán đối soát.',
}

const AUTO_PAY_MESSAGES: Record<string, string> = {
  PAID: 'Đã trừ ví trả đơn.',
  ALREADY_PAID: 'Đơn đã thanh toán trước đó, tiền giữ trong ví.',
  ORDER_EXPIRED: 'Đơn đã hết hạn, tiền giữ trong ví.',
  INSUFFICIENT: 'Ví vẫn chưa đủ, trang sẽ hiện mã nạp bù cho phần còn lại.',
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
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [ipnResult, setIpnResult] = useState<IpnResult | null>(null)
  // Mã nạp bù (đơn TOPUP gắn với đơn này) khi ví không đủ tiền
  const [topup, setTopup] = useState<PaymentOrderView | null>(null)
  const [topupError, setTopupError] = useState('')
  // Lần giả lập gần nhất, để demo "SePay gửi lại" sau khi đơn đã thanh toán
  const [lastSim, setLastSim] = useState<{ code: string; amount: number; ref: string } | null>(null)
  const countdown = useCountdown(order?.expiresAt)
  const topupCountdown = useCountdown(topup?.expiresAt)
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

  // Mọi đơn mua đều trả bằng ví. Ví thiếu -> cần nạp bù đúng phần còn thiếu.
  const payable = !!order && order.orderType !== 'TOPUP' && order.status === 'PENDING' && !order.expired && !order.isPaid
  const shortfall = order ? Math.max(0, order.amount - balance) : 0
  const needsTopUp = payable && shortfall > 0
  const topupExpired = !!topupCountdown && topupCountdown.left === 0

  // Lấy (hoặc tạo) mã nạp bù; tạo lại khi số tiền thiếu đổi hoặc mã cũ hết hạn
  useEffect(() => {
    if (!needsTopUp) {
      setTopup(null)
      return
    }
    if (topup && topup.amount === shortfall && !topupExpired) return
    let active = true
    paymentApi
      .createShortfallTopUp(orderCode)
      .then((t) => {
        if (!active) return
        setTopup(t)
        setTopupError('')
      })
      .catch((e) => active && setTopupError(e?.message || 'Không tạo được mã nạp bù'))
    return () => {
      active = false
    }
  }, [needsTopUp, shortfall, topupExpired, orderCode])

  // UC050: hỏi trạng thái 3 giây/lần. Đang chờ nạp bù thì hỏi thêm số dư: tiền về là backend tự trả đơn.
  useEffect(() => {
    if (!order || order.status !== 'PENDING' || order.expired) return
    const t = setInterval(async () => {
      try {
        const s = await paymentApi.getStatus(orderCode)
        if (s.isPaid || s.status !== order.status || s.expired !== order.expired) {
          await load()
          if (s.isPaid) notifyWalletChanged()
          return
        }
        if (topup) {
          const w = await paymentApi.getWallet()
          if (w.balance !== balance) {
            setBalance(w.balance)
            notifyWalletChanged()
          }
        }
      } catch {
        /* mạng chập chờn thì lần sau thử lại, không bắt khách trả tiền lại */
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(t)
  }, [order, orderCode, load, topup, balance])

  // Hỏi thẳng API SePay cho mã đang chờ (mã nạp bù, hoặc chính đơn nạp ví), rồi đọc lại. Không tự cấp quyền (Rule 4).
  const handleCheckAgain = async () => {
    setChecking(true)
    setActionError('')
    try {
      const r = await paymentApi.checkWithSepay(topup?.orderCode ?? orderCode)
      if (r.checked && !r.found) {
        setActionError('SePay chưa thấy khoản chuyển nào có mã này. Ngân hàng có thể chậm vài phút, hãy kiểm tra lại sau.')
      }
      if (r.found) notifyWalletChanged()
    } catch (e: any) {
      setActionError(e?.message || 'Không kiểm tra được với SePay')
    }
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

  /** Chỉ môi trường dev: giả lập SePay báo tiền về cho mã {code}. */
  const handleSimulate = async (code: string, amount: number, referenceCode?: string) => {
    setBusy(true)
    setActionError('')
    try {
      const ref = referenceCode ?? `SIM${Date.now()}`
      setIpnResult(await paymentApi.simulateIpn(code, amount, ref))
      setLastSim({ code, amount, ref })
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
  const isTopUp = order.orderType === 'TOPUP'
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
            <KeyValue label="Phương thức">{isTopUp ? 'Chuyển khoản QR SePay vào ví' : 'Trừ Ví LocalPress'}</KeyValue>
            <KeyValue label="Thời gian"><span className="num">{formatDateTime(order.paidAt)}</span></KeyValue>
            <KeyValue label="Số dư ví còn lại"><span className="num">{formatCurrency(balance)}</span></KeyValue>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => navigate(back.to)}>{back.label}</Button>
            {!isTopUp && (
              <Button variant="outline" onClick={() => navigate('/wallet')}>Xem ví</Button>
            )}
          </div>
        </section>

        {isDemo && lastSim && (
          <DemoBox title="Demo Rule 5: SePay gửi lại webhook">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(lastSim.code, lastSim.amount, lastSim.ref)}>
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
            Tiền đã nạp vẫn nằm trong Ví LocalPress, không bị mất; tạo đơn mới để thanh toán bằng số dư.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {isTopUp ? (
              <Button onClick={() => navigate(`/wallet/topup?amount=${order.amount}`)}>Tạo mã nạp mới</Button>
            ) : (
              <Button onClick={() => navigate(back.to)}>Tạo đơn mới</Button>
            )}
            <Button variant="outline" onClick={() => navigate('/wallet')}>Kiểm tra ví</Button>
          </div>
          <Link
            to={`/wallet/complaints?orderCode=${order.orderCode}&amount=${order.amount}`}
            className="mt-4 inline-block text-[13px] text-slate-600 hover:text-slate-900 hover:underline"
          >
            Đã chuyển tiền nhưng chưa được ghi nhận? Gửi khiếu nại
          </Link>
        </section>
      </div>
    )
  }

  // ----- Chờ thanh toán -----
  const urgent = countdown && countdown.left < 120000
  // Mã đang chờ chuyển khoản: mã nạp bù (đơn mua) hoặc chính đơn nạp ví
  const qrOrder = isTopUp ? order : topup
  const qrCountdown = isTopUp ? countdown : topupCountdown

  const qrBlock = qrOrder && (
    <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[240px_minmax(0,1fr)]">
      <div>
        {qrOrder.qrCodeUrl ? (
          <img
            src={qrOrder.qrCodeUrl}
            alt={`Mã QR nạp ${formatCurrency(qrOrder.amount)}, nội dung ${qrOrder.transferContent}`}
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
          <CopyRow label="Ngân hàng" value={qrOrder.bankCode || ''} />
          <CopyRow label="Số tài khoản" value={qrOrder.accountNumber || ''} mono />
          <CopyRow label="Chủ tài khoản" value={qrOrder.accountName || ''} />
          <CopyRow label="Số tiền" value={String(qrOrder.amount)} display={formatCurrency(qrOrder.amount)} />
          <CopyRow label="Nội dung" value={qrOrder.transferContent} mono strong />
        </dl>
        {qrCountdown && (
          <p className="mt-2 text-[13px] text-slate-500">
            Mã QR hết hạn sau <span className="font-semibold text-slate-900 num">{qrCountdown.text}</span>, hết hạn thì trang tự tạo mã mới.
          </p>
        )}
        <Button variant="outline" className="mt-3 w-full" isLoading={checking} onClick={handleCheckAgain}>
          Tôi đã chuyển khoản, kiểm tra lại
        </Button>
        <Link
          to={`/wallet/complaints?orderCode=${qrOrder.orderCode}&amount=${qrOrder.amount}`}
          className="mt-2 block text-center text-[13px] text-slate-600 hover:text-slate-900 hover:underline"
        >
          Chuyển hơn 15 phút mà chưa được ghi nhận? Gửi khiếu nại
        </Link>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1040px] py-6 font-sans text-slate-900">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em]">
            {isTopUp ? 'Nạp tiền vào ví' : 'Thanh toán đơn hàng'}
          </h1>
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
            {countdown && (
              <KeyValue label={isTopUp ? 'Mã QR hết hạn sau' : 'Giữ đơn trong'}>
                <span className={`font-semibold num ${urgent ? 'text-negative' : ''}`}>{countdown.text}</span>
              </KeyValue>
            )}
          </dl>
          <div className="mt-2 border-t border-slate-200 pt-3">
            <div className="text-[13px] text-slate-500">{isTopUp ? 'Số tiền nạp' : 'Tổng thanh toán'}</div>
            <div className="text-[30px] font-semibold leading-9 tracking-[-0.01em] num">{formatCurrency(order.amount)}</div>
          </div>
          <p className="mt-3 text-[13px] leading-5 text-slate-500">
            {isTopUp
              ? 'Tiền chỉ được cộng vào ví khi máy chủ nhận xác nhận từ SePay, không phụ thuộc trình duyệt.'
              : 'Mọi đơn đều trả bằng Ví LocalPress. Tiền nạp chỉ được cộng khi máy chủ nhận xác nhận từ SePay.'}
          </p>
        </section>

        <div className="space-y-4">
          {actionError && <Notice tone="error">{actionError}</Notice>}

          {isTopUp ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              {order.topupForOrder && (
                <div className="mb-4">
                  <Notice tone="note">
                    Đây là mã nạp bù cho đơn <span className="font-mono">{order.topupForOrder}</span>. Tiền về ví là hệ thống tự thanh toán đơn đó.
                  </Notice>
                </div>
              )}
              {qrBlock}
            </section>
          ) : (
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-base font-semibold">Thanh toán bằng Ví LocalPress</h2>
              <dl className="mt-2">
                <KeyValue label="Số dư ví"><span className="num">{formatCurrency(balance)}</span></KeyValue>
                <KeyValue label="Cần thanh toán"><span className="num">-{formatCurrency(order.amount)}</span></KeyValue>
              </dl>
              <div className="mt-1 flex items-baseline justify-between border-t border-slate-200 pt-3">
                <span className="text-sm font-medium">{needsTopUp ? 'Còn thiếu' : 'Số dư sau thanh toán'}</span>
                <span className={`text-xl font-semibold num ${needsTopUp ? 'text-negative' : ''}`}>
                  {needsTopUp ? formatCurrency(shortfall) : formatCurrency(balance - order.amount)}
                </span>
              </div>

              {!needsTopUp ? (
                <Button size="lg" className="mt-5 w-full" isLoading={busy} onClick={handlePayWithWallet}>
                  Thanh toán {formatCurrency(order.amount)} bằng ví
                </Button>
              ) : (
                <div className="mt-5 border-t border-slate-200 pt-5">
                  <h3 className="text-base font-semibold">Quét QR nạp bù {formatCurrency(shortfall)}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Chuyển đúng số tiền và nội dung bên dưới. Tiền vào ví là hệ thống tự thanh toán đơn này, bạn không cần bấm thêm.
                  </p>
                  <div className="mt-4">
                    {topupError ? <Notice tone="error">{topupError}</Notice> : qrBlock ?? <div className="h-60 rounded-md bg-slate-100" aria-busy="true" />}
                  </div>
                </div>
              )}
            </section>
          )}

          {isDemo && qrOrder && (
            <DemoBox title="Demo: giả lập SePay báo tiền nạp về (chỉ có ở môi trường dev)">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(qrOrder.orderCode, qrOrder.amount, `DEMO-${qrOrder.orderCode}`)}>
                  Chuyển đủ {formatCurrency(qrOrder.amount)}
                </Button>
                {!isTopUp && qrOrder.amount >= 2000 && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => handleSimulate(qrOrder.orderCode, Math.floor(qrOrder.amount / 2 / 1000) * 1000)}>
                    Chuyển thiếu một nửa
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
      {result.autoPay && (
        <>
          {' '}Tự thanh toán đơn <span className="font-mono">{result.paidOrder}</span>:{' '}
          <span className="font-mono font-medium text-slate-900">{result.autoPay}</span>. {AUTO_PAY_MESSAGES[result.autoPay] ?? ''}
        </>
      )}
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
