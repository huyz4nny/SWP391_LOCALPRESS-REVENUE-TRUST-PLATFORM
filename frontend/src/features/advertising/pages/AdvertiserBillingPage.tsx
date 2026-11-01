import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Receipt } from 'lucide-react'
import { advertisingApi } from '../api'
import { AdPaymentOrder } from '../types'

const METHOD_LABEL: Record<string, string> = { WALLET: 'Ví LocalPress', SEPAY: 'Chuyển khoản QR' }

export function AdvertiserBillingPage() {
  const [orders, setOrders] = useState<AdPaymentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    advertisingApi
      .getMyAdOrders()
      .then(setOrders)
      .catch((e: Error) => setError(e.message || 'Không tải được lịch sử thanh toán'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hóa đơn & Thanh toán B2B</h1>
        <p className="text-xs text-slate-500 mt-1">Lịch sử đơn thanh toán quảng cáo của doanh nghiệp</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Đang tải...</p>
      ) : error ? (
        <p className="text-sm text-crimson">{error}</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
          title="Chưa có đơn thanh toán nào"
          description="Đơn thanh toán các chiến dịch quảng cáo sẽ được lưu tại đây."
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Mã đơn</th>
                <th className="px-4 py-3">Chiến dịch</th>
                <th className="px-4 py-3 text-right">Số tiền</th>
                <th className="px-4 py-3">Phương thức</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.transactionId} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.orderCode}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {o.targetId ? (
                      <Link to={`/advertiser/bookings/${o.targetId}`} className="hover:underline">
                        {o.description || `Chiến dịch #${o.targetId}`}
                      </Link>
                    ) : (
                      o.description
                    )}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-900 text-right tabular-nums">{formatCurrency(o.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {(o.paymentMethod && METHOD_LABEL[o.paymentMethod]) || o.paymentMethod || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(o.paidAt || o.createdAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge type="payment" status={o.status === 'PENDING' && o.expired ? 'EXPIRED' : o.status} />
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
