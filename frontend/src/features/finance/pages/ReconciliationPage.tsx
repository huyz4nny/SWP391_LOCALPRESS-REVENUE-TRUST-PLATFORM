import React, { useState, useEffect } from 'react'
import { ReconciliationPeriod, ReconciliationDiscrepancy } from '../types'
import { financeApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Lock } from 'lucide-react'
import { PageHeader, Panel, KpiStrip, KeyValue, tableCls, LoadingBlock, Notice } from '../components/LedgerUI'

export function ReconciliationPage() {
  const currentUser = mockStore.getCurrentUser()
  const isManager = currentUser.role === 'FINANCE_MANAGER' || currentUser.role === 'SYSTEM_ADMIN'

  const [period, setPeriod] = useState<ReconciliationPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedDisc, setSelectedDisc] = useState<ReconciliationDiscrepancy | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [isClosingPeriod, setIsClosingPeriod] = useState(false)

  useEffect(() => {
    loadReconciliation()
  }, [])

  const loadReconciliation = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await financeApi.getReconciliation()
      setPeriod(data)
    } catch (e: any) {
      setError(e?.message || 'Không tải được kỳ đối soát')
    } finally {
      setLoading(false)
    }
  }

  const handleResolveDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDisc || !resolutionNote.trim()) return

    setIsResolving(true)
    try {
      await financeApi.resolveDiscrepancy(selectedDisc.id, resolutionNote)
      setSelectedDisc(null)
      setResolutionNote('')
      loadReconciliation()
      alert('Đã xử lý chênh lệch thành công!')
    } finally {
      setIsResolving(false)
    }
  }

  const handleClosePeriod = async () => {
    if (!isManager) {
      alert('Chỉ Kế toán trưởng (Finance Manager) mới có quyền đóng kỳ đối soát!')
      return
    }

    if (period?.discrepancyTotal !== 0) {
      if (!window.confirm('Vẫn còn chênh lệch chưa giải quyết. Bạn có chắc chắn muốn đóng kỳ đối soát này?')) {
        return
      }
    } else {
      if (!window.confirm('Xác nhận đóng kỳ đối soát? Sau khi đóng, dữ liệu kỳ này sẽ bị khóa và không thể chỉnh sửa.')) {
        return
      }
    }

    setIsClosingPeriod(true)
    try {
      await financeApi.closeReconciliationPeriod()
      loadReconciliation()
      alert('Kỳ đối soát đã được đóng và lưu vào kho lưu trữ tài chính.')
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
  const matched = period.discrepancyTotal === 0
  const unresolved = period.discrepancies.filter((d) => d.status === 'UNRESOLVED').length
  const rawGap = period.totalGatewayRevenue - period.totalSystemRevenue

  return (
    <div>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {period.periodName}
            {isClosed ? (
              <Badge variant="secondary">Đã đóng kỳ</Badge>
            ) : matched ? (
              <Badge variant="success">Đã khớp</Badge>
            ) : (
              <Badge variant="warning">Có chênh lệch</Badge>
            )}
          </span>
        }
        sub={
          <span className="num">
            {formatDate(period.startDate)} đến {formatDate(period.endDate)}
            {isClosed
              ? `. Đóng bởi ${period.closedByName} lúc ${formatDateTime(period.closedAt)}.`
              : unresolved > 0
              ? `. Còn ${unresolved} khoản lệch chưa xử lý.`
              : '.'}
          </span>
        }
        actions={
          !isClosed && (
            <Button
              size="sm"
              onClick={handleClosePeriod}
              isLoading={isClosingPeriod}
              title={isManager ? undefined : 'Chỉ Kế toán trưởng được đóng kỳ'}
            >
              {!isClosingPeriod && <Lock className="h-3.5 w-3.5" />}
              Đóng kỳ, khóa sổ
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <KpiStrip
          items={[
            { label: 'Hệ thống ghi nhận', value: formatCurrency(period.totalSystemRevenue), note: 'Tổng đơn đã thanh toán trên LocalPress' },
            { label: 'Sao kê ngân hàng và cổng', value: formatCurrency(period.totalGatewayRevenue), note: 'Tiền thực về tài khoản' },
            {
              label: 'Chênh lệch chưa xử lý',
              value: formatCurrency(period.discrepancyTotal),
              tone: matched ? 'muted' : 'negative',
              // Hai tổng có thể vẫn khác nhau khi mọi khoản lệch đã được giải trình: ghi rõ để số không tự mâu thuẫn
              note:
                rawGap === 0
                  ? 'Hai bên khớp nhau'
                  : matched
                  ? `Sổ lệch ${formatCurrency(rawGap)}, đã giải trình hết`
                  : `Sổ lệch ${formatCurrency(rawGap)}`,
            },
          ]}
        />

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
                    <th className={tableCls.th}>Mã giao dịch</th>
                    <th className={tableCls.th}>Đơn</th>
                    <th className={tableCls.th}>Nguyên nhân</th>
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
                      <td className={tableCls.td}><span className="font-mono text-[13px]">{d.orderCode}</span></td>
                      <td className={`${tableCls.td} max-w-[280px]`}>
                        <div className="line-clamp-2">{d.reason}</div>
                        {d.resolutionNote && <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{d.resolutionNote}</div>}
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDisc(d)
                              setResolutionNote('Đã liên hệ hỗ trợ kỹ thuật cổng MoMo; xác nhận đối soát bù vào đợt kế tiếp.')
                            }}
                          >
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
        <Dialog open={!!selectedDisc} onClose={() => setSelectedDisc(null)} title={`Xử lý chênh lệch ${selectedDisc.transactionCode}`}>
          <form onSubmit={handleResolveDiscrepancy} className="space-y-4">
            <dl className="rounded-md bg-slate-50 px-3.5 py-1">
              <KeyValue label="Đơn"><span className="font-mono">{selectedDisc.orderCode}</span></KeyValue>
              <KeyValue label="Số tiền lệch" strong><span className="num">{formatCurrency(selectedDisc.discrepancyAmount)}</span></KeyValue>
              <KeyValue label="Nguyên nhân ghi nhận">{selectedDisc.reason}</KeyValue>
            </dl>

            <div>
              <Label htmlFor="resNote" required>Biện pháp xử lý và bút toán điều chỉnh</Label>
              <Textarea
                id="resNote"
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Ghi rõ đã đối chiếu gì và điều chỉnh ra sao"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDisc(null)}>
                Đóng
              </Button>
              <Button type="submit" size="sm" isLoading={isResolving}>
                Đánh dấu đã xử lý
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
