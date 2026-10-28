import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { financeApi } from '../api'
import type { FinanceAlert } from '../types'
import { PageHeader, Panel, Notice, LoadingBlock } from '../components/LedgerUI'

const SEVERITY: Record<string, { label: string; variant: 'destructive' | 'warning' | 'secondary' }> = {
  HIGH: { label: 'Cao', variant: 'destructive' },
  MEDIUM: { label: 'Trung bình', variant: 'warning' },
  LOW: { label: 'Thấp', variant: 'secondary' },
}

const firstDayOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * ==============================================================================
 * CẢNH BÁO & BÁO CÁO /backoffice/finance/reports (SV4 - UC060, UC059, II.4.12)
 * ==============================================================================
 * Cảnh báo cuối kỳ: mỗi cảnh báo dẫn tới đúng hàng chờ xử lý (hoàn tiền, khiếu nại, công nợ, đối soát).
 * Xuất CSV giao dịch theo khoảng ngày; cuối file có khối tổng hợp cùng công thức Dashboard (Rule 16).
 */
export function FinanceReportsPage() {
  const [alerts, setAlerts] = useState<FinanceAlert[] | null>(null)
  const [alertError, setAlertError] = useState('')
  const [fromDate, setFromDate] = useState(firstDayOfMonth())
  const [toDate, setToDate] = useState(today())
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [exported, setExported] = useState('')

  useEffect(() => {
    financeApi.getAlerts().then(setAlerts).catch((e) => setAlertError(e?.message || 'Không tải được cảnh báo'))
  }, [])

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (fromDate && toDate && fromDate > toDate) {
      setExportError('Từ ngày phải trước hoặc bằng đến ngày')
      return
    }
    setExporting(true)
    setExportError('')
    setExported('')
    try {
      const { blob, filename } = await financeApi.exportReport(fromDate || undefined, toDate || undefined)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setExported(filename)
    } catch (err: any) {
      setExportError(err?.message || 'Không xuất được báo cáo')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Cảnh báo và báo cáo" sub="Việc tồn đọng cuối kỳ và file giao dịch cho kế toán trưởng." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Cảnh báo" aside={alerts && <span className="num">{alerts.length} cảnh báo</span>}>
          {alertError ? (
            <Notice tone="error">{alertError}</Notice>
          ) : !alerts ? (
            <LoadingBlock rows={3} />
          ) : alerts.length === 0 ? (
            <p className="text-sm text-slate-500">Không có việc tồn đọng: hoàn tiền, khiếu nại, công nợ và đối soát đều đã xử lý.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <li key={a.type} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-slate-900">{a.title}</span>
                      <Badge variant={(SEVERITY[a.severity] || SEVERITY.LOW).variant}>{(SEVERITY[a.severity] || SEVERITY.LOW).label}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{a.message}</p>
                  </div>
                  <Link
                    to={a.actionUrl}
                    className="inline-flex h-8 flex-none items-center rounded-md border border-slate-300 px-3 text-[13px] font-medium text-slate-900 hover:bg-slate-50"
                  >
                    Mở hàng chờ
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Xuất báo cáo giao dịch">
          <form onSubmit={handleExport} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fromDate">Từ ngày</Label>
                <Input id="fromDate" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="toDate">Đến ngày</Label>
                <Input id="toDate" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Bỏ trống cả hai ngày để xuất toàn bộ (số tổng khớp Dashboard). File CSV UTF-8, mở được bằng Excel.
            </p>
            {exportError && <Notice tone="error">{exportError}</Notice>}
            {exported && <Notice tone="success">Đã tải {exported}</Notice>}
            <Button type="submit" size="sm" isLoading={exporting}>
              {!exporting && <Download className="h-3.5 w-3.5" />}
              Tải CSV
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  )
}
