import React, { useState, useEffect } from 'react'
import { GeneralLedgerEntry, LedgerSummary } from '../types'
import { financeApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { PageHeader, Panel, KpiStrip, tableCls, LoadingBlock, Notice } from '../components/LedgerUI'

export function GeneralLedgerPage() {
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>([])
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadLedger()
  }, [])

  const loadLedger = async () => {
    try {
      setLoading(true)
      setError('')
      const [data, totals] = await Promise.all([financeApi.getLedger(), financeApi.getLedgerSummary()])
      setEntries(data)
      setSummary(totals)
    } catch (e: any) {
      setError(e?.message || 'Không tải được sổ quỹ')
    } finally {
      setLoading(false)
    }
  }

  const credits = entries.filter((e) => e.entryType === 'CREDIT')
  const debits = entries.filter((e) => e.entryType === 'DEBIT')
  // Số tổng lấy từ cả sổ (cùng công thức dashboard); bảng chỉ tải các bút toán mới nhất nên không cộng từ bảng
  const totalCredit = summary ? summary.grossRevenue : credits.reduce((acc, e) => acc + e.amount, 0)
  const totalDebit = summary ? summary.refundedAmount : debits.reduce((acc, e) => acc + e.amount, 0)
  const netBalance = summary ? summary.netRevenue : totalCredit - totalDebit

  if (loading && entries.length === 0) return <LoadingBlock rows={8} />

  return (
    <div>
      <PageHeader
        title="Sổ quỹ"
        sub="Bút toán phát sinh: thu tiền dịch vụ ghi Có, hoàn tiền ghi Nợ. Số tổng tính trên toàn bộ sổ, khớp dashboard; bảng hiện các bút toán mới nhất."
      />

      {error && <div className="mb-4"><Notice tone="error">{error} <button onClick={loadLedger} className="font-medium underline cursor-pointer">Thử lại</button></Notice></div>}

      <div className="space-y-4">
        <KpiStrip
          items={[
            { label: 'Số dư ròng', value: formatCurrency(netBalance), lead: true, note: summary ? 'toàn bộ sổ, khớp dashboard' : `${entries.length} bút toán` },
            { label: 'Phát sinh thu (Có)', value: formatCurrency(totalCredit), note: summary ? 'toàn bộ sổ' : `${credits.length} bút toán` },
            { label: 'Phát sinh hoàn (Nợ)', value: formatCurrency(totalDebit), note: summary ? 'toàn bộ sổ' : `${debits.length} bút toán` },
          ]}
        />

        <Panel title="Bút toán" aside={<span className="num">{entries.length} bút toán mới nhất</span>} bodyClassName="px-0 pb-1">
          {entries.length === 0 ? (
            <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">Chưa có bút toán nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>Mã bút toán</th>
                    <th className={tableCls.th}>Ghi sổ lúc</th>
                    <th className={tableCls.th}>Diễn giải</th>
                    <th className={tableCls.th}>Người ghi</th>
                    <th className={tableCls.thNum}>Thu (Có)</th>
                    <th className={tableCls.thNum}>Hoàn (Nợ)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((item) => (
                    <tr key={item.id} className={tableCls.tr}>
                      <td className={tableCls.td}>
                        <div className={tableCls.code}>{item.entryCode}</div>
                        <div className="font-mono text-xs text-slate-500">{item.referenceCode}</div>
                      </td>
                      <td className={`${tableCls.td} whitespace-nowrap num`}>{formatDateTime(item.timestamp)}</td>
                      <td className={`${tableCls.td} max-w-[360px]`}>
                        <div className="line-clamp-2 text-slate-900">{item.description}</div>
                      </td>
                      <td className={`${tableCls.td} whitespace-nowrap`}>{item.createdBy}</td>
                      <td className={`${tableCls.tdNum} ${item.entryType === 'CREDIT' ? 'font-semibold text-positive' : ''}`}>
                        {item.entryType === 'CREDIT' ? `+${formatCurrency(item.amount)}` : <span className="text-slate-400">—</span>}
                      </td>
                      <td className={`${tableCls.tdNum} ${item.entryType === 'DEBIT' ? 'font-semibold' : ''}`}>
                        {item.entryType === 'DEBIT' ? `-${formatCurrency(item.amount)}` : <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 text-sm">
                    <td colSpan={4} className="h-12 pl-5 pr-3 font-medium text-slate-900">Cộng phát sinh</td>
                    <td className="h-12 px-3 text-right font-semibold text-positive num">+{formatCurrency(totalCredit)}</td>
                    <td className="h-12 pl-3 pr-5 text-right font-semibold text-slate-900 num">-{formatCurrency(totalDebit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
