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
    <div className="flex items-center rounded-full border border-amber-300 bg-amber-50 text-xs overflow-hidden">
      <Link
        to="/wallet"
        title="Ví LocalPress"
        className="flex items-center gap-1 pl-2.5 pr-2 py-1 font-semibold text-amber-900 hover:bg-amber-100"
      >
        <Wallet className="w-3.5 h-3.5 text-gold" />
        <span>{balance === null ? '—' : formatCurrency(balance)}</span>
      </Link>
      <Link
        to="/wallet/topup"
        className="flex items-center gap-0.5 bg-gold text-white px-2.5 py-1 font-bold hover:bg-amber-700"
      >
        <Plus className="w-3 h-3" />
        Nạp tiền
      </Link>
    </div>
  )
}
