import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, Plus } from 'lucide-react'
import { mockStore } from '@/mocks/store'
import { formatCurrency } from '@/lib/format'
import { paymentApi } from '@/features/finance/api/payment'

/**
 * Số dư Ví LocalPress + nút "Nạp tiền" trên header (SV4 - Huy).
 * Gắn vào header của các layout bằng 1 dòng <WalletBalanceButton />. Ẩn với Khách vãng lai.
 * Tự cập nhật khi trang thanh toán/nạp tiền phát sự kiện 'localpress-wallet-changed'.
 */
export function WalletBalanceButton() {
  const [currentUser, setCurrentUser] = useState(mockStore.getCurrentUser())
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => mockStore.subscribe(() => setCurrentUser(mockStore.getCurrentUser())), [])

  useEffect(() => {
    if (currentUser.role === 'GUEST') return
    let active = true
    const refresh = () =>
      paymentApi
        .getWallet()
        .then((w) => active && setBalance(w.balance))
        .catch(() => active && setBalance(null))
    refresh()
    window.addEventListener('localpress-wallet-changed', refresh)
    return () => {
      active = false
      window.removeEventListener('localpress-wallet-changed', refresh)
    }
  }, [currentUser.id, currentUser.role])

  if (currentUser.role === 'GUEST') return null

  return (
    <div className="flex h-8 flex-none items-center overflow-hidden rounded-md border border-slate-300 bg-white text-[13px]">
      <Link
        to="/wallet"
        title="Ví LocalPress"
        className="flex h-full items-center gap-1.5 px-2.5 font-semibold text-slate-900 num hover:bg-slate-50"
      >
        <Wallet className="h-3.5 w-3.5 text-slate-500" />
        <span>{balance === null ? '—' : formatCurrency(balance)}</span>
      </Link>
      <Link
        to="/wallet/topup"
        className="flex h-full items-center gap-1 border-l border-slate-300 px-2.5 font-medium text-primary-900 hover:bg-slate-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Nạp tiền
      </Link>
    </div>
  )
}
