import React, { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Badge, BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { sepayApi } from '../api/payment'
import type { SepayLog, SepayLogResult, SepayStatus } from '../types'
import { PageHeader, Panel, KpiStrip, KeyValue, Notice, Segmented, tableCls, Pager } from '../components/LedgerUI'

/**
 * ==============================================================================
 * NHẬT KÝ SEPAY /backoffice/finance/sepay (SV4 - UC048, UC049)
 * ==============================================================================
 * Mọi khoản tiền SePay báo về đều có 1 dòng ở đây, kèm payload thô: chứng minh đơn được ghi nhận
 * vì SePay xác nhận (Rule 4), không phải vì trình duyệt báo. Nguồn:
 *  - Webhook: SePay gọi POST /api/v1/finance/webhook/sepay (cần URL công khai).
 *  - Đồng bộ API: đã bỏ (16/11/2026), chỉ còn dòng cũ; tiền chỉ vào qua webhook.
 *  - Giả lập: nút demo trên trang thanh toán (chỉ môi trường dev), không phải tiền thật.
 */

const SOURCE_LABEL: Record<SepayLog['source'], string> = {
  WEBHOOK: 'Webhook',
  API_SYNC: 'Đồng bộ API',
  SIMULATION: 'Giả lập',
}

const RESULT: Record<string, [string, NonNullable<BadgeProps['variant']>]> = {
  SUCCESS: ['Đã ghi nhận', 'success'],
  ALREADY_PROCESSED: ['Đã ghi nhận trước đó', 'secondary'],
  DUPLICATE_DELIVERY: ['SePay gửi lại, bỏ qua', 'secondary'],
  AMOUNT_MISMATCH: ['Sai số tiền, chờ khiếu nại', 'warning'],
  LATE_PAYMENT: ['Về muộn, chờ trả lại', 'warning'],
  AMOUNT_MISSING: ['Thiếu số tiền', 'warning'],
  ORDER_NOT_FOUND: ['Không khớp đơn', 'warning'],
  RECORDED_BY_COMPLAINT: ['Đã ghi qua khiếu nại', 'secondary'],
  IGNORED_OUTGOING: ['Tiền ra, bỏ qua', 'secondary'],
  INVALID_SIGNATURE: ['Sai khóa, từ chối', 'destructive'],
  ERROR: ['Lỗi xử lý', 'destructive'],
}

type SourceFilter = SepayLog['source'] | undefined

const FILTERS: { value: SourceFilter; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'WEBHOOK', label: 'Webhook' },
  { value: 'SIMULATION', label: 'Giả lập' },
]

/** Mỗi lần chỉ tải một trang, không tải cả bảng */
const PAGE_SIZE = 50

const EMPTY_RESULT: SepayLogResult = { items: [], total: 0, page: 0, size: PAGE_SIZE, totalPages: 0 }

export function SepayLogPage() {
  const [source, setSource] = useState<SourceFilter>(undefined)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [result, setResult] = useState<SepayLogResult>(EMPTY_RESULT)
  const [status, setStatus] = useState<SepayStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<SepayLog | null>(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [r, s] = await Promise.all([ //gọi đồng thời cả 2
        sepayApi.logs({ source, from: from || undefined, to: to || undefined, page, size: PAGE_SIZE }),
        sepayApi.status(),
      ])
      setResult(r)
      setStatus(s)
    } catch (e: any) {
      setError(e?.message || 'Không tải được nhật ký SePay')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [source, from, to, page])

  // Đổi bộ lọc thì quay về trang đầu
  const changeSource = (v: SourceFilter) => { setSource(v); setPage(0) } // cập nhật source
  const changeFrom = (v: string) => { setFrom(v); setPage(0) }
  const changeTo = (v: string) => { setTo(v); setPage(0) }

 // Tổng tiền, số lần do server tính trên toàn bảng; firstRow/lastRow là số thứ tự dòng của trang đang xem
 const realTotal = status?.realTotal ?? 0 // tổng tiền SUCCESS của toàn bảng (bỏ giả lập, sai khóa)
const realCount = status?.realCount ?? 0 // số lần SePay thật báo về của toàn bảng
const logs = result.items // các dòng của trang đang xem
const firstRow = result.total === 0 ? 0 : result.page * result.size + 1 // số thứ tự dòng đầu trang
const lastRow = result.page * result.size + logs.length // số thứ tự dòng cuối trang

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
              note: `${realCount} lần SePay báo về qua webhook`,
            },
            {
              label: 'Webhook',
              value: status?.webhookKeyConfigured ? 'Đã cấu hình' : 'Chưa cấu hình',
              tone: status?.webhookKeyConfigured ? 'default' : 'muted',
              note: status?.lastWebhookAt ? `Lần cuối ${formatDateTime(status.lastWebhookAt)}` : 'Chưa nhận lần nào',
            },
            {
              label: 'Tài khoản nhận',
              value: status?.accountNumber ?? '—',
              note: 'Tiền chỉ được ghi khi SePay gọi webhook',
            },
          ]}
        />

        {status && !status.mock && !status.lastWebhookAt && (
          <Notice tone="warning">
            Chưa nhận webhook thật nào. Máy local cần URL công khai: chạy <code className="font-mono">backend/scripts/sepay-tunnel.ps1</code>, rồi
            dán <code className="font-mono">https://&lt;địa-chỉ-tunnel&gt;{status.webhookPath}</code> vào my.sepay.vn &gt; Webhooks (chứng thực API Key).
          </Notice>
        )}
        {status?.mock && (
          <Notice tone="note">Đang chạy dữ liệu mock trong trình duyệt: chỉ có log giả lập. Chạy backend thật để thấy webhook SePay.</Notice>
        )}
        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-wrap items-end gap-4">
          <Segmented label="Nguồn" value={source} onChange={changeSource} options={FILTERS} />
          <div>
            <Label htmlFor="sepay-from">Từ ngày</Label>
            <Input id="sepay-from" type="date" value={from} max={to || undefined} onChange={(e) => changeFrom(e.target.value)} className="h-9 w-[160px]" />
          </div>
          <div>
            <Label htmlFor="sepay-to">Đến ngày</Label>
            <Input id="sepay-to" type="date" value={to} min={from || undefined} onChange={(e) => changeTo(e.target.value)} className="h-9 w-[160px]" />
          </div>
          {(from || to) && (
            <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setPage(0) }}>
              Bỏ lọc ngày
            </Button>
          )}
        </div>

        <Panel
          title={<span className="num">{result.total} lần nhận</span>}
          aside={result.total > 0 ? <span className="num text-[13px] text-slate-500">Dòng {firstRow}-{lastRow}</span> : undefined}
          bodyClassName="px-0 pb-1"
        >
          <Pager className="pb-3" page={result.page} totalPages={result.totalPages} loading={loading} onChange={setPage} />
          {logs.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Không có khoản tiền nào khớp bộ lọc.</p>
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
          <Pager className="border-t border-slate-100 pt-3 pb-2" page={result.page} totalPages={result.totalPages} loading={loading} onChange={setPage} />
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
