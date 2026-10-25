import React, { useState, useEffect } from 'react'
import { GeneralLedgerEntry } from '../types'
import { financeApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { PageHeader, Panel, KpiStrip, tableCls, LoadingBlock, Notice } from '../components/LedgerUI'

export function GeneralLedgerPage() {
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadLedger()
  }, [])

  const loadLedger = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await financeApi.getLedger()
      setEntries(data)
    } catch (e: any) {
      setError(e?.message || 'Không tải được sổ quỹ')
    } finally {
      setLoading(false)
    }
  }

  const totalCredit = entries.filter((e) => e.entryType === 'CREDIT').reduce((acc, e) => acc + e.amount, 0)
  const totalDebit = entries.filter((e) => e.entryType === 'DEBIT').reduce((acc, e) => acc + e.amount, 0)
  const netBalance = totalCredit - totalDebit

  if (loading && entries.length === 0) return <LoadingBlock rows={8} />

  return (
    <div>
      <PageHeader
        title="Sổ quỹ"
        sub="Bút toán phát sinh: thu tiền dịch vụ ghi Có, hoàn tiền ghi Nợ. Số dư ròng tính từ chính các dòng bên dưới."
      />

      {error && <div className="mb-4"><Notice tone="error">{error} <button onClick={loadLedger} className="font-medium underline cursor-pointer">Thử lại</button></Notice></div>}

      <div className="space-y-4">
        <KpiStrip
          items={[
            { label: 'Số dư ròng', value: formatCurrency(netBalance), lead: true, note: `${entries.length} bút toán` },
            { label: 'Phát sinh thu (Có)', value: formatCurrency(totalCredit), note: `${entries.filter((e) => e.entryType === 'CREDIT').length} bút toán` },
            { label: 'Phát sinh hoàn (Nợ)', value: formatCurrency(totalDebit), note: `${entries.filter((e) => e.entryType === 'DEBIT').length} bút toán` },
          ]}
        />

        <Panel title="Bút toán" aside={<span className="num">{entries.length} dòng</span>} bodyClassName="px-0 pb-1">
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
