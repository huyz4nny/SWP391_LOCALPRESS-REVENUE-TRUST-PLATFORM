import React, { useState, useEffect } from 'react'
import { GeneralLedgerEntry } from '../types'
import { financeApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { BookMarked, ArrowDownRight, ArrowUpRight } from 'lucide-react'

export function GeneralLedgerPage() {
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLedger()
  }, [])

  const loadLedger = async () => {
    try {
      setLoading(true)
      const data = await financeApi.getLedger()
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  const totalCredit = entries.filter((e) => e.entryType === 'CREDIT').reduce((acc, e) => acc + e.amount, 0)
  const totalDebit = entries.filter((e) => e.entryType === 'DEBIT').reduce((acc, e) => acc + e.amount, 0)
  const netBalance = totalCredit - totalDebit

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Sổ Quỹ & Bút Toán Kế Toán (General Ledger)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ghi nhận các bút toán phát sinh: Thu tiền dịch vụ (Credit), Hoàn trả (Debit) và các bút toán điều chỉnh
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Tổng phát sinh Thu (Credit)</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{formatCurrency(totalCredit)}</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Tổng phát sinh Hoàn (Debit)</span>
            <ArrowUpRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-black text-crimson">{formatCurrency(totalDebit)}</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Số dư thực tế ròng (Net Balance)</span>
            <BookMarked className="w-4 h-4 text-primary-900" />
          </div>
          <div className="text-xl font-black text-slate-900">{formatCurrency(netBalance)}</div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Mã bút toán</th>
              <th className="px-4 py-3">Thời gian ghi sổ</th>
              <th className="px-4 py-3">Tham chiếu</th>
              <th className="px-4 py-3">Diễn giải nội dung</th>
              <th className="px-4 py-3 text-right">Phát sinh Thu (Credit)</th>
              <th className="px-4 py-3 text-right">Phát sinh Hoàn (Debit)</th>
              <th className="px-4 py-3">Người ghi nhận</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.entryCode}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(item.timestamp)}</td>
                <td className="px-4 py-3 font-mono text-primary-900 font-semibold">{item.referenceCode}</td>
                <td className="px-4 py-3 font-medium text-slate-800 max-w-sm">{item.description}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700">
                  {item.entryType === 'CREDIT' ? formatCurrency(item.amount) : '—'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-crimson">
                  {item.entryType === 'DEBIT' ? formatCurrency(item.amount) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">{item.createdBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
