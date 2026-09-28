import React, { useState, useEffect } from 'react'
import { SystemAuditLog } from '../types'
import { adminApi } from '../api'
import { formatDateTime } from '@/lib/format'
import { History, Shield, Filter } from 'lucide-react'

export function AuditLogsPage() {
  const [logs, setLogs] = useState<SystemAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [moduleFilter, setModuleFilter] = useState('ALL')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getAuditLogs()
      setLogs(data)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((l) => {
    if (moduleFilter !== 'ALL' && l.module !== moduleFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Nhật ký Kiểm toán Hệ thống (Audit Trail)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ghi nhận bất biến (Append-only) mọi hành động trọng yếu: Thay đổi phân quyền, Phê duyệt xuất bản, Hoàn tiền và Cấu hình máy chủ
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center space-x-2 text-xs">
        <span className="font-semibold text-slate-500 flex items-center">
          <Filter className="w-3.5 h-3.5 mr-1" /> Phân hệ:
        </span>
        {['ALL', 'EDITORIAL', 'ADVERTISING', 'FINANCE', 'SECURITY', 'PAYWALL'].map((m) => (
          <button
            key={m}
            onClick={() => setModuleFilter(m)}
            className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              moduleFilter === m
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {m === 'ALL' && 'Tất cả'}
            {m === 'EDITORIAL' && 'Tòa soạn'}
            {m === 'ADVERTISING' && 'Quảng cáo'}
            {m === 'FINANCE' && 'Tài chính'}
            {m === 'SECURITY' && 'Bảo mật'}
            {m === 'PAYWALL' && 'Paywall'}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3">Mã log</th>
              <th className="px-4 py-3">Thời gian (Asia/Ho_Chi_Minh)</th>
              <th className="px-4 py-3">Người thực hiện</th>
              <th className="px-4 py-3">Phân hệ</th>
              <th className="px-4 py-3">Hành động</th>
              <th className="px-4 py-3">Chi tiết diễn giải</th>
              <th className="px-4 py-3">Địa chỉ IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{log.id}</td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(log.timestamp)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {log.userName}{' '}
                  <span className="text-[10px] text-slate-400">({log.userRole})</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {log.module}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-primary-950">{log.action}</td>
                <td className="px-4 py-3 text-slate-600 max-w-sm">{log.description}</td>
                <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">{log.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
