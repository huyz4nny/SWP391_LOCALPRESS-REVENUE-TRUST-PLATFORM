import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { paymentApi } from '../api/payment'
import type { WalletInfo } from '../types'

/**
 * ==============================================================================
 * VÍ LOCALPRESS /wallet (SV4): số dư + lịch sử biến động (nạp, chi, tiền về muộn, hoàn về ví)
 * ==============================================================================
 */
export function WalletPage() {
  const navigate = useNavigate()
  const [wallet, setWallet] = useState<WalletInfo | null>(null)
  const [error, setError] = useState('')
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'

  useEffect(() => {
    if (isGuest) {
      navigate('/login', { replace: true, state: { from: { pathname: '/wallet' } } })
      return
    }
    const load = () => paymentApi.getWallet().then(setWallet).catch((e) => setError(e?.message || 'Không tải được ví'))
    load()
    window.addEventListener('localpress-wallet-changed', load)
    return () => window.removeEventListener('localpress-wallet-changed', load)
  }, [isGuest, navigate])

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Card className="bg-gradient-to-br from-primary-900 to-primary-950 text-white">
        <CardContent className="pt-6 pb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center text-xs uppercase tracking-wide text-primary-100">
              <Wallet className="w-4 h-4 mr-1.5" />
              Ví LocalPress
            </div>
            <div className="text-3xl font-bold mt-1">{wallet ? formatCurrency(wallet.balance) : '—'}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button className="bg-gold hover:bg-amber-700 text-white" onClick={() => navigate('/wallet/topup')}>
              Nạp tiền
            </Button>
            <button
              type="button"
              className="text-[11px] text-primary-100 hover:text-white underline cursor-pointer"
              onClick={() => navigate('/wallet/complaints')}
            >
              Đã nạp nhưng chưa được cộng? Khiếu nại
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lịch sử biến động</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-crimson">{error}</p>}
          {wallet && wallet.entries.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch ví"
              description="Nạp tiền để thanh toán nhanh bài viết, gói hội viên và quảng cáo."
              actionLabel="Nạp tiền ngay"
              onAction={() => navigate('/wallet/topup')}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                  <th className="py-2">Thời gian</th>
                  <th className="py-2">Nội dung</th>
                  <th className="py-2 text-right">Số tiền</th>
                  <th className="py-2 text-right">Số dư sau</th>
                </tr>
              </thead>
              <tbody>
                {wallet?.entries.map((e) => (
                  <tr key={e.entryId} className="border-b border-stone-100">
                    <td className="py-2 text-xs text-stone-500 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                    <td className="py-2">
                      <div className="flex items-center">
                        {e.direction === 'CREDIT' ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 mr-1.5 text-crimson shrink-0" />
                        )}
                        {e.reason}
                      </div>
                    </td>
                    <td className={`py-2 text-right font-semibold ${e.direction === 'CREDIT' ? 'text-emerald-700' : 'text-crimson'}`}>
                      {e.direction === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-2 text-right text-stone-700">{formatCurrency(e.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
