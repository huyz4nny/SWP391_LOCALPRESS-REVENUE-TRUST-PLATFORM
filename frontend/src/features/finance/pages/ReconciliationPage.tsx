import React, { useState, useEffect } from 'react'
import { ReconciliationPeriod, ReconciliationDiscrepancy } from '../types'
import { financeApi } from '../api'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { Scale, CheckCircle2, AlertTriangle, Lock, FileCheck } from 'lucide-react'

export function ReconciliationPage() {
  const currentUser = mockStore.getCurrentUser()
  const isManager = currentUser.role === 'FINANCE_MANAGER' || currentUser.role === 'SYSTEM_ADMIN'

  const [period, setPeriod] = useState<ReconciliationPeriod | null>(null)
  const [loading, setLoading] = useState(true)

  // Discrepancy resolve modal
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
      const data = await financeApi.getReconciliation()
      setPeriod(data)
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
      if (!window.confirm('Xác nhận đóng kỳ đối soát Tháng 09/2026? Sau khi đóng, dữ liệu kỳ này sẽ bị khóa và không thể chỉnh sửa.')) {
        return
      }
    }

    setIsClosingPeriod(true)
    try {
      await financeApi.closeReconciliationPeriod()
      loadReconciliation()
      alert('Kỳ đối soát đã được ĐÓNG THÀNH CÔNG và lưu vào kho lưu trữ tài chính!')
    } finally {
      setIsClosingPeriod(false)
    }
  }

  if (loading || !period) {
    return <div className="py-12 text-center animate-pulse">Đang tải kỳ đối soát...</div>
  }

  const isClosed = period.status === 'CLOSED'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{period.periodName}</h1>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isClosed
                  ? 'bg-slate-800 text-white'
                  : period.discrepancyTotal === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isClosed ? 'ĐÃ ĐÓNG KỲ (KHÓA)' : period.discrepancyTotal === 0 ? 'ĐÃ KHỚP SỐ LIỆU' : 'CÓ CHÊNH LỆCH'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thời hạn kỳ: {formatDate(period.startDate)} → {formatDate(period.endDate)}
            {isClosed && ` • Đã đóng bởi: ${period.closedByName} lúc ${formatDateTime(period.closedAt)}`}
          </p>
        </div>

        <div>
          {!isClosed && (
            <Button
              onClick={handleClosePeriod}
              isLoading={isClosingPeriod}
              className="text-xs font-bold bg-slate-900 hover:bg-slate-800"
            >
              <Lock className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Đóng kỳ đối soát (Khóa sổ)
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">1. Doanh thu hệ thống ghi nhận</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(period.totalSystemRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Dữ liệu từ đơn hàng LocalPress</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">2. Số dư sao kê Ngân hàng / Cổng</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(period.totalGatewayRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Vietcombank + BIDV + MoMo</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">3. Chênh lệch đối soát</span>
          <div
            className={`text-xl font-black mt-1 ${
              period.discrepancyTotal === 0 ? 'text-emerald-600' : 'text-crimson'
            }`}
          >
            {formatCurrency(period.discrepancyTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {period.discrepancyTotal === 0 ? '✓ Số liệu khớp 100%' : 'Cần kế toán đối chiếu và xử lý'}
          </div>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center">
            <Scale className="w-4 h-4 mr-1.5 text-primary-900" />
            Bảng chi tiết chênh lệch giao dịch đối soát
          </h3>
          <span className="text-xs text-slate-500">{period.discrepancies.length} khoản mục</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã GD</th>
                <th className="px-4 py-3">Đơn hàng</th>
                <th className="px-4 py-3">Số tiền hệ thống</th>
                <th className="px-4 py-3">Số tiền cổng/NH</th>
                <th className="px-4 py-3">Chênh lệch</th>
                <th className="px-4 py-3">Nguyên nhân</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {period.discrepancies.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{d.transactionCode}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{d.orderCode}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(d.systemAmount)}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{formatCurrency(d.gatewayAmount)}</td>
                  <td className="px-4 py-3 font-bold text-crimson">{formatCurrency(d.discrepancyAmount)}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs">{d.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        d.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {d.status === 'RESOLVED' ? 'Đã xử lý' : 'Chưa xử lý'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.status === 'UNRESOLVED' && !isClosed ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDisc(d)
                          setResolutionNote(
                            'Đã liên hệ hỗ trợ kỹ thuật cổng MoMo; xác nhận đối soát bù vào đợt kế tiếp.'
                          )
                        }}
                        className="text-xs font-bold"
                      >
                        Xử lý lệch
                      </Button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        {d.resolvedBy ? `Xử lý bởi: ${d.resolvedBy}` : 'Đã khóa'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discrepancy Modal */}
      {selectedDisc && (
        <Dialog
          open={!!selectedDisc}
          onClose={() => setSelectedDisc(null)}
          title={`Xử Lý Chênh Lệch Giao Dịch: ${selectedDisc.transactionCode}`}
        >
          <form onSubmit={handleResolveDiscrepancy} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <div>Đơn hàng: <strong>{selectedDisc.orderCode}</strong></div>
              <div>Số tiền chênh lệch: <strong className="text-crimson">{formatCurrency(selectedDisc.discrepancyAmount)}</strong></div>
              <div>Lý do ghi nhận ban đầu: {selectedDisc.reason}</div>
            </div>

            <div>
              <Label htmlFor="resNote" required>Ghi chú biện pháp xử lý & Bút toán điều chỉnh</Label>
              <Textarea
                id="resNote"
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Nhập ghi chú xử lý đối soát..."
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDisc(null)}>
                Đóng
              </Button>
              <Button type="submit" size="sm" isLoading={isResolving} className="bg-emerald-700 hover:bg-emerald-800">
                Xác nhận đã xử lý xong chênh lệch
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  )
}
