import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { mockStore } from '@/mocks/store'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { paymentApi } from '../api/payment'
import type { WalletInfo } from '../types'
import { Panel, Notice, tableCls } from '../components/LedgerUI'

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

  const entries = wallet?.entries ?? []
  const credits = entries.filter((e) => e.direction === 'CREDIT').reduce((a, e) => a + e.amount, 0)
  const debits = entries.filter((e) => e.direction !== 'CREDIT').reduce((a, e) => a + e.amount, 0)

  return (
    <div className="mx-auto max-w-[960px] py-6 font-sans text-slate-900">
      <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em]">Ví LocalPress</h1>

      <section className="mt-5 flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[13px] text-slate-500">Số dư</div>
          <div className="mt-1 text-[32px] font-semibold leading-10 tracking-[-0.01em] num">
            {wallet ? formatCurrency(wallet.balance) : <span className="inline-block h-8 w-40 rounded bg-slate-100 align-middle" />}
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            Dùng để mua bài Premium, gói hội viên và thanh toán quảng cáo. Tiền nạp không rút ra ngân hàng.
          </p>
        </div>
        <div className="flex flex-none flex-col items-start gap-2 sm:items-end">
          <Button onClick={() => navigate('/wallet/topup')}>
            <Plus className="h-4 w-4" />
            Nạp tiền
          </Button>
          <Link to="/wallet/complaints" className="text-[13px] text-slate-600 hover:text-slate-900 hover:underline">
            Đã chuyển tiền mà chưa được cộng?
          </Link>
        </div>
      </section>

      {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}

      <Panel
        className="mt-4"
        title="Biến động số dư"
        aside={
          entries.length > 0 && (
            <span className="num">
              Nạp vào <span className="text-positive">+{formatCurrency(credits)}</span>
              {debits > 0 && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  Đã chi <span className="text-slate-900">-{formatCurrency(debits)}</span>
                </>
              )}
            </span>
          )
        }
        bodyClassName="px-0 pb-1"
      >
        {wallet && entries.length === 0 ? (
          <p className="border-t border-slate-100 px-5 py-6 text-sm text-slate-500">
            Chưa có giao dịch ví. Nạp tiền một lần để thanh toán nhanh mà không cần quét QR mỗi lần.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Thời gian</th>
                  <th className={tableCls.th}>Nội dung</th>
                  <th className={tableCls.thNum}>Số tiền</th>
                  <th className={tableCls.thNum}>Số dư sau</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.entryId} className={tableCls.tr}>
                    <td className={`${tableCls.td} whitespace-nowrap num`}>{formatDateTime(e.createdAt)}</td>
                    <td className={`${tableCls.td} text-slate-900`}>{e.reason}</td>
                    <td className={`${tableCls.tdNum} font-semibold ${e.direction === 'CREDIT' ? 'text-positive' : ''}`}>
                      {e.direction === 'CREDIT' ? '+' : '-'}
                      {formatCurrency(e.amount)}
                    </td>
                    <td className={`${tableCls.tdNum} text-slate-600`}>{formatCurrency(e.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
