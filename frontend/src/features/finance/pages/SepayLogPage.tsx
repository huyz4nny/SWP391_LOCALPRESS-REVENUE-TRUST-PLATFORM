import React, { useEffect, useState } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Badge, BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { sepayApi } from '../api/payment'
import type { SepayLog, SepayStatus } from '../types'
import { PageHeader, Panel, KpiStrip, KeyValue, Notice, Segmented, tableCls } from '../components/LedgerUI'

/**
 * ==============================================================================
 * NHẬT KÝ SEPAY /backoffice/finance/sepay (SV4 - UC048, UC049)
 * ==============================================================================
 * Mọi khoản tiền SePay báo về đều có 1 dòng ở đây, kèm payload thô: chứng minh đơn được ghi nhận
 * vì SePay xác nhận (Rule 4), không phải vì trình duyệt báo. Nguồn:
 *  - Webhook: SePay gọi POST /api/v1/finance/webhook/sepay (cần URL công khai).
 *  - Đồng bộ API: LocalPress hỏi API SePay khi chưa nhận được webhook.
 *  - Giả lập: nút demo trên trang thanh toán (chỉ môi trường dev), không phải tiền thật.
 */

const SOURCE_LABEL: Record<SepayLog['source'], string> = {
  WEBHOOK: 'Webhook',
  API_SYNC: 'Đồng bộ API',
  SIMULATION: 'Giả lập',
}

const RESULT: Record<string, [string, NonNullable<BadgeProps['variant']>]> = {
  SUCCESS: ['Đã ghi nhận', 'success'],
  EXCESS: ['Đủ, phần dư vào ví', 'success'],
  ALREADY_PROCESSED: ['Đã ghi nhận trước đó', 'secondary'],
  DUPLICATE_DELIVERY: ['SePay gửi lại, bỏ qua', 'secondary'],
  UNDERPAID_CREDITED_TO_WALLET: ['Chuyển thiếu, vào ví', 'warning'],
  LATE_PAYMENT_CREDITED_TO_WALLET: ['Về muộn, vào ví', 'warning'],
  ORDER_NOT_FOUND: ['Không khớp đơn', 'warning'],
  IGNORED_OUTGOING: ['Tiền ra, bỏ qua', 'secondary'],
  INVALID_SIGNATURE: ['Sai khóa, từ chối', 'destructive'],
  ERROR: ['Lỗi xử lý', 'destructive'],
}

type SourceFilter = SepayLog['source'] | undefined

const FILTERS: { value: SourceFilter; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'WEBHOOK', label: 'Webhook' },
  { value: 'API_SYNC', label: 'Đồng bộ API' },
  { value: 'SIMULATION', label: 'Giả lập' },
]

export function SepayLogPage() {
  const [source, setSource] = useState<SourceFilter>(undefined)
  const [logs, setLogs] = useState<SepayLog[]>([])
  const [status, setStatus] = useState<SepayStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<SepayLog | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [l, s] = await Promise.all([sepayApi.logs(source), sepayApi.status()])
      setLogs(l)
      setStatus(s)
    } catch (e: any) {
      setError(e?.message || 'Không tải được nhật ký SePay')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [source])

  const handleSync = async () => {
    setSyncing(true)
    setError('')
    setNotice('')
    try {
      const r = await sepayApi.sync(24)
      setNotice(`Đã hỏi SePay 24 giờ gần nhất: ${r.fetched} giao dịch, xử lý mới ${r.processed}, đã có trước ${r.skippedDuplicate}.`)
      await load()
    } catch (e: any) {
      setError(e?.message || 'Đồng bộ SePay thất bại')
    } finally {
      setSyncing(false)
    }
  }

  const real = logs.filter((l) => l.source !== 'SIMULATION' && l.authOk)
  const realTotal = real
    .filter((l) => ['SUCCESS', 'EXCESS', 'UNDERPAID_CREDITED_TO_WALLET', 'LATE_PAYMENT_CREDITED_TO_WALLET'].includes(l.resultStatus))
    .reduce((a, l) => a + (l.amount ?? 0), 0)

  return (
    <div>
      <PageHeader
        title="Nhật ký SePay"
        sub="Mỗi khoản tiền SePay báo về có một dòng kèm payload gốc. Đơn chỉ được ghi nhận khi có dòng ở đây, không dựa vào trình duyệt của khách."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} isLoading={loading}>
              {!loading && <RefreshCw className="h-3.5 w-3.5" />}
              Làm mới
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              isLoading={syncing}
              disabled={status?.mock || !status?.apiTokenConfigured}
              title={status?.apiTokenConfigured ? undefined : 'Cần localpress.sepay.api-token trong application-secrets.yml'}
            >
              {!syncing && <Download className="h-3.5 w-3.5" />}
              Đồng bộ từ SePay
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <KpiStrip
          items={[
            {
              label: 'Tiền thật đã ghi nhận',
              value: formatCurrency(realTotal),
              lead: true,
              note: `${real.length} lần SePay báo về (webhook + đồng bộ)`,
            },
            {
              label: 'Webhook',
              value: status?.webhookKeyConfigured ? 'Đã cấu hình' : 'Chưa cấu hình',
              tone: status?.webhookKeyConfigured ? 'default' : 'muted',
              note: status?.lastWebhookAt ? `Lần cuối ${formatDateTime(status.lastWebhookAt)}` : 'Chưa nhận lần nào',
            },
            {
              label: 'Đồng bộ qua API SePay',
              value: status?.apiTokenConfigured ? 'Bật' : 'Chưa có token',
              tone: status?.apiTokenConfigured ? 'default' : 'muted',
              note: `Tài khoản nhận ${status?.accountNumber ?? '—'}`,
            },
          ]}
        />

        {status && !status.mock && !status.lastWebhookAt && (
          <Notice tone="warning">
            Chưa nhận webhook thật nào. Máy local cần URL công khai: chạy <code className="font-mono">backend/scripts/sepay-tunnel.ps1</code>, rồi
            dán <code className="font-mono">https://&lt;địa-chỉ-tunnel&gt;{status.webhookPath}</code> vào my.sepay.vn &gt; Webhooks (chứng thực API Key).
            Trong lúc chưa có tunnel, nút "Đồng bộ từ SePay" vẫn lấy được giao dịch thật nếu đã có token API.
          </Notice>
        )}
        {status?.mock && (
          <Notice tone="note">Đang chạy dữ liệu mock trong trình duyệt: chỉ có log giả lập. Chạy backend thật để thấy webhook SePay.</Notice>
        )}
        {notice && <Notice tone="success">{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}

        <div>
          <Segmented label="Nguồn" value={source} onChange={setSource} options={FILTERS} />
        </div>

        <Panel title={<span className="num">{logs.length} lần nhận</span>} bodyClassName="px-0 pb-1">
          {logs.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Chưa có khoản tiền nào từ nguồn này.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>Nhận lúc</th>
                    <th className={tableCls.th}>Nguồn</th>
                    <th className={tableCls.th}>Nội dung chuyển khoản</th>
                    <th className={tableCls.th}>Kết quả</th>
                    <th className={tableCls.thNum}>Số tiền</th>
                    <th className={tableCls.th}><span className="sr-only">Xem</span></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const [label, variant] = RESULT[l.resultStatus] ?? [l.resultStatus, 'secondary']
                    return (
                      <tr key={l.logId} className={tableCls.tr}>
                        <td className={`${tableCls.td} whitespace-nowrap num`}>{formatDateTime(l.receivedAt)}</td>
                        <td className={`${tableCls.td} whitespace-nowrap`}>
                          <div className="text-slate-900">{SOURCE_LABEL[l.source]}</div>
                          <div className="text-xs text-slate-500">{l.sepayId ? `SePay #${l.sepayId}` : l.remoteIp ?? '—'}</div>
                        </td>
                        <td className={`${tableCls.td} max-w-[340px]`}>
                          <div className="truncate text-slate-900">{l.content || '—'}</div>
                          <div className="text-xs text-slate-500">
                            {l.orderCode ? <>đơn <span className="font-mono">{l.orderCode}</span></> : 'không tìm thấy mã đơn'}
                            {l.referenceCode && <> · <span className="font-mono">{l.referenceCode}</span></>}
                          </div>
                        </td>
                        <td className={tableCls.td}>
                          <Badge variant={variant}>{label}</Badge>
                        </td>
                        <td className={`${tableCls.tdNum} font-semibold ${l.source === 'SIMULATION' ? 'text-slate-500' : ''}`}>
                          {l.amount != null ? formatCurrency(l.amount) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className={`${tableCls.td} text-right`}>
                          <button
                            onClick={() => setSelected(l)}
                            className="text-[13px] font-medium text-primary-900 hover:underline cursor-pointer"
                          >
                            Payload
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {selected && (
        <Dialog open onClose={() => setSelected(null)} title={`Lần nhận #${selected.logId}`} maxWidth="2xl">
          <dl className="rounded-md bg-slate-50 px-3.5 py-1">
            <KeyValue label="Nguồn">{SOURCE_LABEL[selected.source]}{selected.sepayId ? `, SePay #${selected.sepayId}` : ''}</KeyValue>
            <KeyValue label="Xác thực khóa">{selected.authOk ? 'Hợp lệ' : 'Sai khóa, đã từ chối'}</KeyValue>
            <KeyValue label="Ngân hàng / thời gian">{selected.gateway ?? '—'} · {selected.transactionDate ?? '—'}</KeyValue>
            <KeyValue label="Mã đơn tìm được"><span className="font-mono">{selected.orderCode ?? '—'}</span></KeyValue>
            <KeyValue label="Kết quả">{selected.resultMessage ?? selected.resultStatus}</KeyValue>
            <KeyValue label="Từ IP">{selected.remoteIp ?? '—'}</KeyValue>
          </dl>
          <div className="mt-4 text-[13px] font-medium text-slate-700">Payload gốc</div>
          <pre className="mt-1.5 max-h-72 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-5 text-slate-100">
            {formatJson(selected.rawPayload)}
          </pre>
        </Dialog>
      )}
    </div>
  )
}

function formatJson(raw: string | null) {
  if (!raw) return '(trống)'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}
