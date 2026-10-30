import React, { useState, useEffect, useCallback } from 'react'
import { ReconciliationPeriod, ReconciliationDiscrepancy, DiscrepancyAction } from '../types'
import { financeApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Lock } from 'lucide-react'
import { PageHeader, Panel, KpiStrip, KeyValue, tableCls, LoadingBlock, Notice } from '../components/LedgerUI'

const selectCls =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 hover:border-slate-400 focus:border-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/15'

const TYPE_LABEL: Record<string, string> = {
  BANK_NOT_RECORDED: 'Ngân hàng có, hệ thống chưa ghi',
  RECORDED_WITHOUT_BANK: 'Đã ghi theo khiếu nại, SePay chưa báo',
}

const ACTION_LABEL: Record<DiscrepancyAction, string> = {
  ASSIGN_ORDER: 'Gán vào đơn',
  CREDIT_WALLET: 'Cộng vào ví khách',
  EXPLAINED: 'Giải trình',
}

const currentMonth = () => new Date().toISOString().slice(0, 7)

/**
 * UC054: Đối soát kỳ. "Sao kê" = tiền SePay báo về (webhook + đồng bộ API), "hệ thống" = tiền đã ghi vào đơn / ví.
 * Khoản lệch sinh tự động từ dữ liệu thật; gán đơn / cộng ví đi qua đúng luồng webhook ở backend.
 */
export function ReconciliationPage() {
  const currentUser = mockStore.getCurrentUser()
  const isManager = currentUser.role === 'FINANCE_MANAGER' || currentUser.role === 'SYSTEM_ADMIN'

  const [month, setMonth] = useState(currentMonth())
  const [period, setPeriod] = useState<ReconciliationPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedDisc, setSelectedDisc] = useState<ReconciliationDiscrepancy | null>(null)
  const [action, setAction] = useState<DiscrepancyAction>('EXPLAINED')
  const [orderCode, setOrderCode] = useState('')
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  const [closeOpen, setCloseOpen] = useState(false)
  const [closeNote, setCloseNote] = useState('')
  const [closeError, setCloseError] = useState('')
  const [isClosingPeriod, setIsClosingPeriod] = useState(false)

  const loadReconciliation = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setPeriod(await financeApi.getReconciliation(month))
    } catch (e: any) {
      setError(e?.message || 'Không tải được kỳ đối soát')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    loadReconciliation()
  }, [loadReconciliation])

  const openResolve = (d: ReconciliationDiscrepancy) => {
    setSelectedDisc(d)
    setAction(d.itemType === 'BANK_NOT_RECORDED' && d.orderCode ? 'ASSIGN_ORDER' : 'EXPLAINED')
    setOrderCode(d.orderCode || '')
    setUserId('')
    setAmount('')
    setResolutionNote('')
    setResolveError('')
  }

  const handleResolveDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDisc || !resolutionNote.trim()) return
    setIsResolving(true)
    setResolveError('')
    try {
      const updated = await financeApi.resolveDiscrepancy({
        discrepancyId: selectedDisc.id,
        note: resolutionNote.trim(),
        action,
        orderCode: action !== 'EXPLAINED' && orderCode.trim() ? orderCode.trim() : undefined,
        userId: action === 'CREDIT_WALLET' && userId.trim() ? Number(userId) : undefined,
        amount: amount.trim() ? Number(amount) : undefined,
      })
      setPeriod(updated)
      setSelectedDisc(null)
    } catch (err: any) {
      setResolveError(err?.message || 'Không xử lý được khoản lệch')
    } finally {
      setIsResolving(false)
    }
  }

  const handleClosePeriod = async () => {
    if (!period) return
    setIsClosingPeriod(true)
    setCloseError('')
    try {
      const updated = await financeApi.closeReconciliationPeriod({
        month: period.month,
        acknowledgeUnresolved: (period.unresolvedCount ?? 0) > 0,
        note: closeNote.trim() || undefined,
      })
      setPeriod(updated)
      setCloseOpen(false)
    } catch (err: any) {
      setCloseError(err?.message || 'Không chốt được kỳ')
    } finally {
      setIsClosingPeriod(false)
    }
  }

  if (loading && !period) return <LoadingBlock rows={5} />

  if (!period) {
    return (
      <>
        <PageHeader title="Đối soát kỳ" />
        <Notice tone="error">
          {error || 'Không có dữ liệu kỳ đối soát.'}{' '}
          <button onClick={loadReconciliation} className="font-medium underline cursor-pointer">Thử lại</button>
        </Notice>
      </>
    )
  }

  const isClosed = period.status === 'CLOSED'
  const unresolved = period.unresolvedCount ?? period.discrepancies.filter((d) => d.status === 'UNRESOLVED').length
  const matched = unresolved === 0
  const rawGap = period.totalGatewayRevenue - period.totalSystemRevenue
  const shownMonth = period.month || month
  const months = Array.from(new Set([currentMonth(), ...(period.recentMonths || []), shownMonth])).sort().reverse()
  const needsAmount = selectedDisc?.itemType === 'BANK_NOT_RECORDED' && selectedDisc.gatewayAmount === 0 && action !== 'EXPLAINED'

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {period.periodName}
            {isClosed ? (
              <Badge variant="secondary">Đã chốt kỳ</Badge>
            ) : matched ? (
              <Badge variant="success">Đã khớp, chờ chốt</Badge>
            ) : (
              <Badge variant="warning">Có chênh lệch</Badge>
            )}
          </span>
        }
        sub={
          <span className="num">
            {formatDate(period.startDate)} đến {formatDate(period.endDate)}
            {isClosed
              ? `. Chốt bởi ${period.closedByName} lúc ${formatDateTime(period.closedAt)}.`
              : unresolved > 0
              ? `. Còn ${unresolved} khoản lệch chưa xử lý.`
              : '.'}
          </span>
        }
        actions={
          <>
            <select aria-label="Tháng đối soát" value={shownMonth} onChange={(e) => setMonth(e.target.value)} className={`${selectCls} w-36`}>
              {months.map((m) => (
                <option key={m} value={m}>Tháng {m.slice(5)}/{m.slice(0, 4)}</option>
              ))}
            </select>
            {!isClosed && (
              <Button
                size="sm"
                onClick={() => { setCloseNote(''); setCloseError(''); setCloseOpen(true) }}
                disabled={!isManager}
                title={isManager ? undefined : 'Chỉ Kế toán trưởng được chốt kỳ'}
              >
                <Lock className="h-3.5 w-3.5" />
                Chốt kỳ, khóa sổ
              </Button>
            )}
          </>
        }
      />

      {error && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}

      <div className="space-y-4">
        <KpiStrip
          items={[
            { label: 'Sao kê (SePay báo về)', value: formatCurrency(period.totalGatewayRevenue), note: 'Tiền thực vào tài khoản ngân hàng' },
            { label: 'Hệ thống đã ghi', value: formatCurrency(period.totalSystemRevenue), note: 'Đơn và nạp ví trả qua ngân hàng' },
            {
              label: 'Khoản lệch chưa xử lý',
              value: formatCurrency(period.discrepancyTotal),
              tone: matched ? 'muted' : 'negative',
              // Hai tổng có thể vẫn khác nhau khi mọi khoản lệch đã được giải trình: ghi rõ để số không tự mâu thuẫn
              note: rawGap === 0 ? 'Hai bên khớp nhau' : `Sổ lệch ${formatCurrency(rawGap)}${matched ? ', đã giải trình hết' : ''}`,
            },
          ]}
        />

        {isClosed && period.closeNote && <Notice tone="note">Ghi chú chốt kỳ: {period.closeNote}</Notice>}

        <Panel
          title="Khoản chênh lệch"
          aside={<span className="num">{period.discrepancies.length} khoản</span>}
          bodyClassName="px-0 pb-1"
        >
          {period.discrepancies.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Không có khoản lệch nào trong kỳ.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>Mã GD ngân hàng</th>
                    <th className={tableCls.th}>Đơn</th>
                    <th className={tableCls.th}>Loại và nguyên nhân</th>
                    <th className={tableCls.thNum}>Hệ thống</th>
                    <th className={tableCls.thNum}>Sao kê</th>
                    <th className={tableCls.thNum}>Lệch</th>
                    <th className={tableCls.th}>Trạng thái</th>
                    <th className={tableCls.th}><span className="sr-only">Xử lý</span></th>
                  </tr>
                </thead>
                <tbody>
                  {period.discrepancies.map((d) => (
                    <tr key={d.id} className={tableCls.tr}>
                      <td className={tableCls.td}><span className={tableCls.code}>{d.transactionCode}</span></td>
                      <td className={tableCls.td}><span className="font-mono text-[13px]">{d.orderCode || '-'}</span></td>
                      <td className={`${tableCls.td} max-w-[320px]`}>
                        {d.itemType && <div className="text-xs text-slate-500">{TYPE_LABEL[d.itemType]}</div>}
                        <div className="line-clamp-2">{d.reason}</div>
                        {d.resolutionNote && (
                          <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                            {d.action ? `${ACTION_LABEL[d.action]}${d.actionRef ? ` ${d.actionRef}` : ''}: ` : ''}{d.resolutionNote}
                          </div>
                        )}
                      </td>
                      <td className={tableCls.tdNum}>{formatCurrency(d.systemAmount)}</td>
                      <td className={tableCls.tdNum}>{formatCurrency(d.gatewayAmount)}</td>
                      <td className={`${tableCls.tdNum} font-semibold ${d.status === 'UNRESOLVED' && d.discrepancyAmount !== 0 ? 'text-negative' : ''}`}>
                        {formatCurrency(d.discrepancyAmount)}
                      </td>
                      <td className={tableCls.td}>
                        {d.status === 'RESOLVED' ? <Badge variant="success">Đã xử lý</Badge> : <Badge variant="warning">Chưa xử lý</Badge>}
                      </td>
                      <td className={`${tableCls.td} text-right`}>
                        {d.status === 'UNRESOLVED' && !isClosed ? (
                          <Button size="sm" variant="outline" onClick={() => openResolve(d)}>
                            Xử lý
                          </Button>
                        ) : (
                          <span className="whitespace-nowrap text-xs text-slate-500">{d.resolvedBy ? d.resolvedBy : 'Đã khóa'}</span>
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

      {selectedDisc && (
        <Dialog open={!!selectedDisc} onClose={() => setSelectedDisc(null)} title={`Xử lý khoản lệch ${selectedDisc.transactionCode}`}>
          <form onSubmit={handleResolveDiscrepancy} className="space-y-4">
            <dl className="rounded-md bg-slate-50 px-3.5 py-1">
              {selectedDisc.itemType && <KeyValue label="Loại">{TYPE_LABEL[selectedDisc.itemType]}</KeyValue>}
              <KeyValue label="Đơn"><span className="font-mono">{selectedDisc.orderCode || '-'}</span></KeyValue>
              <KeyValue label="Số tiền lệch" strong><span className="num">{formatCurrency(selectedDisc.discrepancyAmount)}</span></KeyValue>
              <KeyValue label="Nguyên nhân">{selectedDisc.reason}</KeyValue>
            </dl>

            {resolveError && <Notice tone="error">{resolveError}</Notice>}

            <div>
              <Label htmlFor="resAction" required>Cách xử lý</Label>
              <select id="resAction" value={action} onChange={(e) => setAction(e.target.value as DiscrepancyAction)} className={selectCls}>
                {selectedDisc.itemType !== 'RECORDED_WITHOUT_BANK' && <option value="ASSIGN_ORDER">{ACTION_LABEL.ASSIGN_ORDER} (chạy đúng luồng webhook)</option>}
                {selectedDisc.itemType !== 'RECORDED_WITHOUT_BANK' && <option value="CREDIT_WALLET">{ACTION_LABEL.CREDIT_WALLET}</option>}
                <option value="EXPLAINED">{ACTION_LABEL.EXPLAINED} (không ghi tiền)</option>
              </select>
              {selectedDisc.itemType === 'RECORDED_WITHOUT_BANK' && (
                <p className="mt-1 text-xs text-slate-500">Đối chiếu sao kê thật. Nếu tiền không về, lập đề xuất hoàn tiền ở màn hình Hoàn tiền.</p>
              )}
            </div>

            {action !== 'EXPLAINED' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="resOrder" required={action === 'ASSIGN_ORDER'}>Mã đơn</Label>
                  <Input id="resOrder" value={orderCode} onChange={(e) => setOrderCode(e.target.value)} placeholder="LP..." />
                </div>
                {action === 'CREDIT_WALLET' && (
                  <div>
                    <Label htmlFor="resUser">Mã khách hàng</Label>
                    <Input id="resUser" inputMode="numeric" value={userId} onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))} placeholder="Bỏ trống nếu đã có mã đơn" />
                  </div>
                )}
                {needsAmount && (
                  <div>
                    <Label htmlFor="resAmount" required>Số tiền theo sao kê</Label>
                    <Input id="resAmount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} required />
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="resNote" required>Ghi chú đối chiếu</Label>
              <Textarea
                id="resNote"
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Ghi rõ đã đối chiếu sao kê nào, khớp ra sao"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDisc(null)}>
                Đóng
              </Button>
              <Button type="submit" size="sm" isLoading={isResolving}>
                {ACTION_LABEL[action]}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {closeOpen && (
        <Dialog open={closeOpen} onClose={() => setCloseOpen(false)} title={`Chốt ${period.periodName}`}>
          <div className="space-y-4">
            {unresolved > 0 ? (
              <Notice tone="warning">
                Còn {unresolved} khoản lệch chưa xử lý ({formatCurrency(period.discrepancyTotal)}). Chốt kỳ sẽ khóa toàn bộ, không xử lý thêm được.
              </Notice>
            ) : (
              <Notice tone="note">Mọi khoản lệch đã xử lý. Sau khi chốt, số liệu kỳ được lưu lại và khóa sổ.</Notice>
            )}
            {closeError && <Notice tone="error">{closeError}</Notice>}
            <div>
              <Label htmlFor="closeNote">Ghi chú chốt kỳ</Label>
              <Textarea id="closeNote" rows={2} value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCloseOpen(false)}>
                Hủy
              </Button>
              <Button size="sm" onClick={handleClosePeriod} isLoading={isClosingPeriod}>
                Xác nhận chốt kỳ
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
