import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { financeApi } from '../api'
import type { AdvertiserReceivable } from '../types'
import { PageHeader, Panel, KpiStrip, KeyValue, Segmented, Notice, LoadingBlock, tableCls } from '../components/LedgerUI'

type GroupFilter = AdvertiserReceivable['debtGroup'] | undefined

const GROUP_BADGE: Record<AdvertiserReceivable['debtGroup'], { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  PAID_IN_FULL: { label: 'Đã tất toán', variant: 'success' },
  IN_TERM: { label: 'Trong hạn', variant: 'warning' },
  OVERDUE: { label: 'Quá hạn', variant: 'destructive' },
}

/**
 * ==============================================================================
 * CÔNG NỢ QUẢNG CÁO /backoffice/finance/receivables (SV4 - UC053, II.4.10)
 * ==============================================================================
 * Công nợ theo chiến dịch: giá trị báo giá, đã thu (đơn AD), còn nợ, hạn, số ngày quá hạn.
 * "Gửi nhắc nợ": SV4 lưu receivable_reminders và phát ReceivableReminderEvent; SV1 tự báo doanh nghiệp.
 * Mỗi chiến dịch nhắc tối đa 1 lần / 24 giờ.
 */
export function ReceivablesPage() {
  const [items, setItems] = useState<AdvertiserReceivable[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<GroupFilter>(undefined)

  const [target, setTarget] = useState<AdvertiserReceivable | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    setError('')
    financeApi.getReceivables().then(setItems).catch((e) => setError(e?.message || 'Không tải được công nợ'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const summary = useMemo(() => {
    const list = items || []
    const open = list.filter((r) => r.remainingDebt > 0)
    const overdue = list.filter((r) => r.debtGroup === 'OVERDUE')
    return {
      totalDebt: open.reduce((s, r) => s + r.remainingDebt, 0),
      overdueDebt: overdue.reduce((s, r) => s + r.remainingDebt, 0),
      overdueCount: overdue.length,
      paidCount: list.filter((r) => r.debtGroup === 'PAID_IN_FULL').length,
      openCount: open.length,
    }
  }, [items])

  const openReminder = (r: AdvertiserReceivable) => {
    setTarget(r)
    setNote(
      r.debtGroup === 'OVERDUE'
        ? `Chiến dịch "${r.campaignName}" đã quá hạn thanh toán ${r.overdueDays} ngày, còn nợ ${formatCurrency(r.remainingDebt)}. Đề nghị quý doanh nghiệp thanh toán sớm.`
        : `Nhắc thanh toán chiến dịch "${r.campaignName}", còn ${formatCurrency(r.remainingDebt)}, hạn ${formatDate(r.dueDate)}.`
    )
    setSendError('')
  }

  const sendReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!target) return
    setSending(true)
    setSendError('')
    try {
      await financeApi.sendReceivableReminder(target.campaignId, note.trim() || undefined)
      setNotice(`Đã ghi nhận nhắc nợ cho ${target.companyName}, chiến dịch "${target.campaignName}".`)
      setTarget(null)
      load()
    } catch (err: any) {
      setSendError(err?.message || 'Không gửi được nhắc nợ')
    } finally {
      setSending(false)
    }
  }

  if (!items && !error) return <LoadingBlock rows={5} />

  const rows = (items || []).filter((r) => !filter || r.debtGroup === filter)
  const count = (g: AdvertiserReceivable['debtGroup']) => (items || []).filter((r) => r.debtGroup === g).length

  return (
    <div>
      <PageHeader
        title="Công nợ quảng cáo"
        sub="Chiến dịch đã có báo giá: đã thu, còn nợ và hạn thanh toán. Nhắc nợ được lưu lại, phân hệ Quảng cáo gửi thông báo cho doanh nghiệp."
      />

      {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      {notice && <div className="mb-3"><Notice tone="success">{notice}</Notice></div>}

      <div className="space-y-4">
        <KpiStrip
          items={[
            { label: 'Tổng còn phải thu', value: formatCurrency(summary.totalDebt), note: `${summary.openCount} chiến dịch còn nợ`, lead: true },
            {
              label: 'Quá hạn',
              value: formatCurrency(summary.overdueDebt),
              tone: summary.overdueCount > 0 ? 'negative' : 'muted',
              note: `${summary.overdueCount} chiến dịch`,
            },
            { label: 'Đã tất toán', value: <span className="num">{summary.paidCount}</span>, note: 'chiến dịch' },
          ]}
        />

        <Panel
          title="Theo chiến dịch"
          aside={
            <Segmented<GroupFilter>
              label="Lọc nhóm nợ"
              value={filter}
              onChange={setFilter}
              options={[
                { value: undefined, label: 'Tất cả', count: (items || []).length },
                { value: 'OVERDUE', label: 'Quá hạn', count: count('OVERDUE') },
                { value: 'IN_TERM', label: 'Trong hạn', count: count('IN_TERM') },
                { value: 'PAID_IN_FULL', label: 'Đã tất toán', count: count('PAID_IN_FULL') },
              ]}
            />
          }
          bodyClassName="px-0 pb-1"
        >
          {rows.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Không có công nợ nào trong nhóm này.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>Doanh nghiệp</th>
                    <th className={tableCls.th}>Chiến dịch</th>
                    <th className={tableCls.thNum}>Báo giá</th>
                    <th className={tableCls.thNum}>Đã thu</th>
                    <th className={tableCls.thNum}>Còn nợ</th>
                    <th className={tableCls.th}>Hạn</th>
                    <th className={tableCls.th}>Nhóm</th>
                    <th className={tableCls.th}>Nhắc nợ</th>
                    <th className={tableCls.th}><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.campaignId} className={tableCls.tr}>
                      <td className={`${tableCls.td} max-w-[220px]`}>
                        <div className="truncate font-medium text-slate-900">{r.companyName}</div>
                        <div className="truncate text-xs text-slate-500">{[r.taxCode && `MST ${r.taxCode}`, r.email].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className={`${tableCls.td} max-w-[220px]`}>
                        <div className="truncate">{r.campaignName}</div>
                        <div className="font-mono text-xs text-slate-500">#{r.campaignId}{r.contractReference ? ` · ${r.contractReference}` : ''}</div>
                      </td>
                      <td className={tableCls.tdNum}>{formatCurrency(r.contractValue)}</td>
                      <td className={tableCls.tdNum}>{formatCurrency(r.paidAmount)}</td>
                      <td className={`${tableCls.tdNum} font-semibold ${r.debtGroup === 'OVERDUE' ? 'text-negative' : ''}`}>
                        {formatCurrency(r.remainingDebt)}
                      </td>
                      <td className={`${tableCls.td} whitespace-nowrap num`}>
                        {formatDate(r.dueDate)}
                        {r.overdueDays > 0 && <div className="text-xs text-negative">quá {r.overdueDays} ngày</div>}
                      </td>
                      <td className={tableCls.td}>
                        <Badge variant={GROUP_BADGE[r.debtGroup].variant}>{GROUP_BADGE[r.debtGroup].label}</Badge>
                      </td>
                      <td className={`${tableCls.td} whitespace-nowrap text-xs text-slate-500`}>
                        {r.reminderCount > 0 ? (
                          <>
                            <span className="num">{r.reminderCount}</span> lần
                            {r.lastReminderAt && <div className="num">{formatDateTime(r.lastReminderAt)}</div>}
                          </>
                        ) : (
                          'Chưa nhắc'
                        )}
                      </td>
                      <td className={`${tableCls.td} text-right`}>
                        {r.remainingDebt > 0 && (
                          <Button size="sm" variant="outline" onClick={() => openReminder(r)}>
                            Gửi nhắc nợ
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {target && (
        <Dialog open={!!target} onClose={() => setTarget(null)} title={`Nhắc nợ ${target.companyName}`}>
          <form onSubmit={sendReminder} className="space-y-4">
            <dl className="rounded-md bg-slate-50 px-3.5 py-1">
              <KeyValue label="Chiến dịch">{target.campaignName}</KeyValue>
              <KeyValue label="Còn nợ" strong><span className="num">{formatCurrency(target.remainingDebt)}</span></KeyValue>
              <KeyValue label="Hạn thanh toán"><span className="num">{formatDate(target.dueDate)}</span></KeyValue>
              <KeyValue label="Liên hệ">{[target.contactPerson, target.phone].filter(Boolean).join(', ') || '-'}</KeyValue>
            </dl>
            {sendError && <Notice tone="error">{sendError}</Notice>}
            <div>
              <Label htmlFor="remNote">Lời nhắn cho doanh nghiệp</Label>
              <Textarea id="remNote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTarget(null)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" isLoading={sending}>
                Gửi nhắc nợ
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
