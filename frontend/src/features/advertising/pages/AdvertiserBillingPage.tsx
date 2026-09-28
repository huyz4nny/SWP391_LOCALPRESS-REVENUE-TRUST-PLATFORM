import React, { useState, useEffect } from 'react'
import { mockStore } from '@/mocks/store'
import { Order } from '@/features/finance/types'
import { httpClient } from '@/lib/http/client'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Receipt, FileText } from 'lucide-react'

export function AdvertiserBillingPage() {
  const currentUser = mockStore.getCurrentUser()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBilling()
  }, [currentUser.id])

  const loadBilling = async () => {
    try {
      setLoading(true)
      const data = await httpClient.get<Order[]>('/finance/orders')
      setOrders(data.filter((o) => o.orderType === 'AD_CAMPAIGN'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hóa đơn & Thanh toán B2B</h1>
        <p className="text-xs text-slate-500 mt-1">
          Hồ sơ thanh toán, biên lai chuyển khoản và hóa đơn GTGT điện tử của Doanh nghiệp
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
          title="Chưa có hóa đơn nào"
          description="Các hóa đơn hợp đồng quảng cáo sẽ được lưu tại đây."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Hợp đồng quảng cáo</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Phương thức</th>
                <th className="px-4 py-3">Hóa đơn VAT</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.orderCode}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{o.targetTitle}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(o.finalAmount)}</td>
                  <td className="px-4 py-3 text-slate-500">{o.paymentMethod || 'Chuyển khoản'}</td>
                  <td className="px-4 py-3 font-mono text-primary-900">{o.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge type="payment" status={o.paymentStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
