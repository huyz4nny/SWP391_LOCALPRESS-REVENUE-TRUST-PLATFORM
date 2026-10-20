import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'
import type {
  CreateComplaintInput,
  IpnResult,
  PaymentComplaint,
  PaymentOrderView,
  PaymentStatusView,
  WalletInfo,
} from '../types'

/**
 * ==============================================================================
 * API TRANG THANH TOÁN CHUNG & VÍ LOCALPRESS (SV4 - HUY)
 * ==============================================================================
 * Mọi module muốn thu tiền: tạo đơn qua POST /finance/orders (hoặc /finance/checkout),
 * rồi navigate(paymentPath(response)) để sang trang /payment/:orderCode của SV4.
 *
 * Dual-mode: API thật gọi Spring Boot; mock mode giữ ví + đơn nạp trong localStorage riêng
 * của finance, đơn mua bài/gói/quảng cáo đọc từ mockStore dùng chung (không sửa mockStore).
 */

/** Đường dẫn trang thanh toán từ response tạo đơn (API thật bọc trong ApiResponse.data, mock trả thẳng). */
export function paymentPath(createOrderResponse: any): string {
  const code = createOrderResponse?.data?.orderCode ?? createOrderResponse?.orderCode
  return `/payment/${code}`
}

const unwrap = <T,>(res: any): T => (res && res.data !== undefined && res.success !== undefined ? res.data : res)

function toView(raw: any): PaymentOrderView {
  return {
    transactionId: String(raw.transactionId ?? ''),
    orderCode: raw.orderCode,
    orderType: raw.orderType,
    targetId: raw.targetId != null ? String(raw.targetId) : undefined,
    description: raw.description ?? undefined,
    amount: Number(raw.amount || 0),
    status: raw.status,
    isPaid: Boolean(raw.isPaid ?? raw.paid),
    expired: Boolean(raw.expired),
    paymentMethod: raw.paymentMethod,
    qrCodeUrl: raw.qrCodeUrl ?? undefined,
    bankCode: raw.bankCode,
    accountNumber: raw.accountNumber,
    accountName: raw.accountName,
    transferContent: raw.transferContent ?? raw.orderCode,
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
    paidAt: raw.paidAt,
  }
}

function toStatus(raw: any): PaymentStatusView {
  return {
    orderCode: raw.orderCode,
    status: raw.status,
    isPaid: Boolean(raw.isPaid ?? raw.paid),
    expired: Boolean(raw.expired),
    paymentMethod: raw.paymentMethod,
  }
}

export const paymentApi = {
  getOrder: async (orderCode: string): Promise<PaymentOrderView> => {
    if (APP_CONFIG.useMockApi) return mock.getOrder(orderCode)
    return toView(unwrap(await httpClient.get<any>(`/finance/orders/code/${orderCode}`)))
  },

  getStatus: async (orderCode: string): Promise<PaymentStatusView> => {
    if (APP_CONFIG.useMockApi) return toStatus(mock.getOrder(orderCode))
    return toStatus(unwrap(await httpClient.get<any>(`/finance/orders/code/${orderCode}/status`)))
  },

  payWithWallet: async (orderCode: string): Promise<PaymentStatusView> => {
    if (APP_CONFIG.useMockApi) return toStatus(mock.payWithWallet(orderCode))
    return toStatus(unwrap(await httpClient.post<any>(`/finance/orders/code/${orderCode}/pay-with-wallet`)))
  },

  /** Chỉ dùng khi demo ở máy local (backend profile dev): giả lập SePay bắn webhook. */
  simulateIpn: async (orderCode: string, amount?: number, referenceCode?: string): Promise<IpnResult> => {
    if (APP_CONFIG.useMockApi) return mock.simulateIpn(orderCode, amount, referenceCode)
    return httpClient.post<IpnResult>(`/finance/orders/code/${orderCode}/simulate-ipn`, { amount, referenceCode })
  },

  getWallet: async (): Promise<WalletInfo> => {
    if (APP_CONFIG.useMockApi) return mock.getWallet()
    const raw = unwrap<any>(await httpClient.get<any>('/finance/wallet/me'))
    return {
      balance: Number(raw?.balance || 0),
      entries: (raw?.entries || []).map((e: any) => ({
        entryId: String(e.entryId),
        transactionId: String(e.transactionId),
        direction: e.direction,
        amount: Number(e.amount || 0),
        balanceAfter: Number(e.balanceAfter || 0),
        reason: e.reason,
        createdAt: e.createdAt,
      })),
    }
  },

  createTopUp: async (amount: number): Promise<PaymentOrderView> => {
    if (APP_CONFIG.useMockApi) return mock.createTopUp(amount)
    return toView(unwrap(await httpClient.post<any>('/finance/wallet/topups', { amount })))
  },
}

/**
 * Khiếu nại "đã chuyển tiền nhưng chưa được ghi nhận" (UC051).
 * Khách gửi/xem của mình; kế toán đối chiếu sao kê rồi ghi nhận (vào đơn hoặc vào ví) hoặc từ chối có lý do.
 */
export const complaintApi = {
  create: async (input: CreateComplaintInput): Promise<PaymentComplaint> => {
    if (APP_CONFIG.useMockApi) return mock.createComplaint(input)
    return toComplaint(unwrap(await httpClient.post<any>('/finance/complaints', input)))
  },

  listMine: async (): Promise<PaymentComplaint[]> => {
    if (APP_CONFIG.useMockApi) return mock.complaints().filter((c) => c.userId === mockStore.getCurrentUser().id)
    return (unwrap<any[]>(await httpClient.get<any>('/finance/complaints/me')) || []).map(toComplaint)
  },

  listForAccountant: async (status?: PaymentComplaint['status']): Promise<PaymentComplaint[]> => {
    if (APP_CONFIG.useMockApi) return mock.complaints().filter((c) => !status || c.status === status)
    return (unwrap<any[]>(await httpClient.get<any>('/finance/complaints', { params: { status } })) || []).map(toComplaint)
  },

  resolve: async (id: string, target: 'ORDER' | 'WALLET', note?: string): Promise<PaymentComplaint> => {
    if (APP_CONFIG.useMockApi) return mock.resolveComplaint(id, target, note)
    return toComplaint(unwrap(await httpClient.post<any>(`/finance/complaints/${id}/resolve`, { note }, { params: { target } })))
  },

  reject: async (id: string, reason: string): Promise<PaymentComplaint> => {
    if (APP_CONFIG.useMockApi) return mock.rejectComplaint(id, reason)
    return toComplaint(unwrap(await httpClient.post<any>(`/finance/complaints/${id}/reject`, { note: reason })))
  },
}

function toComplaint(raw: any): PaymentComplaint {
  return {
    complaintId: String(raw.complaintId),
    userId: String(raw.userId),
    orderCode: raw.orderCode ?? undefined,
    amount: Number(raw.amount || 0),
    transferredAt: raw.transferredAt,
    bankReference: raw.bankReference,
    note: raw.note ?? undefined,
    status: raw.status,
    resolution: raw.resolution ?? undefined,
    resolutionNote: raw.resolutionNote ?? undefined,
    resolvedAt: raw.resolvedAt ?? undefined,
    createdAt: raw.createdAt,
  }
}

// =============================================================================
// MOCK MODE (chỉ chạy khi VITE_USE_MOCK_API != 'false')
// =============================================================================

const MOCK_KEY = 'localpress_finance_wallet_mock_v1'
const ORDER_TTL_MS = 15 * 60 * 1000

interface MockWalletState {
  wallets: Record<string, WalletInfo>
  topups: Record<string, PaymentOrderView & { userId: string }>
  processedRefs: string[]
  complaints?: PaymentComplaint[]
}

const mock = {
  load(): MockWalletState {
    try {
      const raw = window.localStorage.getItem(MOCK_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* dữ liệu hỏng thì khởi tạo lại */
    }
    return { wallets: {}, topups: {}, processedRefs: [] }
  },

  save(state: MockWalletState) {
    window.localStorage.setItem(MOCK_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event('localpress-wallet-changed'))
  },

  wallet(state: MockWalletState, userId: string): WalletInfo {
    state.wallets[userId] ??= { balance: 0, entries: [] }
    return state.wallets[userId]
  },

  move(state: MockWalletState, userId: string, txCode: string, direction: 'CREDIT' | 'DEBIT', amount: number, reason: string) {
    const w = mock.wallet(state, userId)
    if (direction === 'DEBIT' && w.balance < amount) {
      throw new Error(`Số dư ví không đủ (Hiện có: ${w.balance.toLocaleString('vi-VN')} VND)`)
    }
    w.balance += direction === 'CREDIT' ? amount : -amount
    w.entries.unshift({
      entryId: `WE-${Date.now()}`,
      transactionId: txCode,
      direction,
      amount,
      balanceAfter: w.balance,
      reason,
      createdAt: new Date().toISOString(),
    })
  },

  qr(orderCode: string, amount: number) {
    return `https://img.vietqr.io/image/vietcombank-9981-compact2.png?amount=${amount}&addInfo=${orderCode}&accountName=LOCALPRESS`
  },

  /** Đơn mua bài/gói/quảng cáo do module khác tạo nằm trong mockStore dùng chung. */
  sharedOrder(orderCode: string) {
    return mockStore.getState().orders.find((o) => o.orderCode === orderCode || o.id === orderCode)
  },

  /** ownerId: chỉ truyền khi kế toán xử lý thay cho khách (bỏ kiểm tra chủ đơn). */
  getOrder(orderCode: string, ownerId?: string): PaymentOrderView {
    const state = mock.load()
    const userId = ownerId ?? mockStore.getCurrentUser().id
    const topup = state.topups[orderCode]
    if (topup) {
      if (topup.userId !== userId) throw new Error('Bạn không có quyền truy cập đơn hàng này')
      const expired = topup.status === 'PENDING' && !!topup.expiresAt && Date.now() > Date.parse(topup.expiresAt)
      return { ...topup, expired, qrCodeUrl: topup.status === 'PENDING' && !expired ? topup.qrCodeUrl : undefined }
    }

    const o = mock.sharedOrder(orderCode)
    if (!o) throw new Error('Không tìm thấy đơn hàng')
    if (o.userId !== userId) throw new Error('Bạn không có quyền truy cập đơn hàng này')
    const paid = o.paymentStatus === 'PAID'
    const expiresAt = new Date(Date.parse(o.createdAt) + ORDER_TTL_MS).toISOString()
    const expired = !paid && Date.now() > Date.parse(expiresAt)
    const paidByWallet = mock
      .wallet(state, userId)
      .entries.some((e) => e.direction === 'DEBIT' && e.transactionId === o.orderCode)
    const typeMap: Record<string, PaymentOrderView['orderType']> = {
      SUBSCRIPTION: 'SUBSCRIPTION',
      ARTICLE_PURCHASE: 'ARTICLE',
      AD_CAMPAIGN: 'AD',
    }
    return {
      transactionId: o.id,
      orderCode: o.orderCode,
      orderType: typeMap[o.orderType] ?? 'ARTICLE',
      targetId: o.targetId,
      description: o.targetTitle,
      amount: o.finalAmount,
      status: paid ? 'SUCCESS' : o.paymentStatus === 'FAILED' ? 'FAILED' : 'PENDING',
      isPaid: paid,
      expired,
      paymentMethod: paidByWallet ? 'WALLET' : o.paymentMethod,
      paidAt: paid ? o.updatedAt : undefined,
      qrCodeUrl: !paid && !expired ? mock.qr(o.orderCode, o.finalAmount) : undefined,
      bankCode: 'VCB',
      accountNumber: '9981',
      accountName: 'LOCALPRESS',
      transferContent: o.orderCode,
      createdAt: o.createdAt,
      expiresAt,
    }
  },

  createTopUp(amount: number): PaymentOrderView {
    if (!Number.isInteger(amount) || amount < 10000 || amount > 50000000) {
      throw new Error('Số tiền nạp phải từ 10.000 đến 50.000.000 VND')
    }
    const state = mock.load()
    const now = new Date()
    const orderCode = `LP${now.getTime().toString().slice(-10)}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const view: PaymentOrderView & { userId: string } = {
      userId: mockStore.getCurrentUser().id,
      transactionId: orderCode,
      orderCode,
      orderType: 'TOPUP',
      description: 'Nạp tiền vào Ví LocalPress',
      amount,
      status: 'PENDING',
      isPaid: false,
      expired: false,
      paymentMethod: 'SEPAY',
      qrCodeUrl: mock.qr(orderCode, amount),
      bankCode: 'VCB',
      accountNumber: '9981',
      accountName: 'LOCALPRESS',
      transferContent: orderCode,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ORDER_TTL_MS).toISOString(),
    }
    state.topups[orderCode] = view
    mock.save(state)
    return view
  },

  payWithWallet(orderCode: string): PaymentOrderView {
    const view = mock.getOrder(orderCode)
    if (view.orderType === 'TOPUP') throw new Error('Đơn nạp ví không thể thanh toán bằng chính số dư ví')
    if (view.isPaid) return view
    if (view.expired) throw new Error('Đơn hàng đã hết hạn, vui lòng tạo lại đơn mới')
    const state = mock.load()
    mock.move(state, mockStore.getCurrentUser().id, orderCode, 'DEBIT', view.amount, `Thanh toán đơn ${orderCode}`)
    mock.save(state)
    mockStore.markOrderPaid(view.transactionId)
    return mock.getOrder(orderCode)
  },

  simulateIpn(orderCode: string, amount?: number, referenceCode?: string, ownerId?: string): IpnResult {
    const view = mock.getOrder(orderCode, ownerId)
    const paid = amount ?? view.amount
    const ref = referenceCode ?? `SIM${Date.now()}`
    const state = mock.load()
    const userId = ownerId ?? mockStore.getCurrentUser().id

    if (view.isPaid || state.processedRefs.includes(ref)) {
      return { success: true, status: 'ALREADY_PROCESSED', orderCode, message: 'Giao dịch đã được ghi nhận trước đó' }
    }
    state.processedRefs.push(ref)

    if (view.orderType === 'TOPUP') {
      const t = state.topups[orderCode]
      t.status = 'SUCCESS'
      t.isPaid = true
      t.amount = paid
      t.paidAt = new Date().toISOString()
      mock.move(state, userId, orderCode, 'CREDIT', paid, `Nạp tiền qua SePay, mã ${orderCode}`)
      mock.save(state)
      return { success: true, status: 'SUCCESS', orderCode, message: `Đã cộng ${paid.toLocaleString('vi-VN')} VND vào ví` }
    }
    if ((view.orderType === 'AD' && view.expired) || view.status !== 'PENDING') {
      mock.move(state, userId, `${orderCode}-LATE`, 'CREDIT', paid, `Tiền về sau khi đơn ${orderCode} hết hiệu lực, chuyển vào ví`)
      mock.save(state)
      return { success: true, status: 'LATE_PAYMENT_CREDITED_TO_WALLET', orderCode, message: 'Đơn đã hết hiệu lực, tiền được cộng vào ví' }
    }
    if (paid < view.amount) {
      mock.move(state, userId, `${orderCode}-PART-${ref}`, 'CREDIT', paid, `Chuyển thiếu cho đơn ${orderCode}, tiền đã nhận được cộng vào ví`)
      mock.save(state)
      return { success: true, status: 'UNDERPAID_CREDITED_TO_WALLET', orderCode, message: 'Chuyển thiếu, tiền đã nhận được cộng vào ví' }
    }
    if (paid > view.amount) {
      mock.move(state, userId, `${orderCode}-EXCESS`, 'CREDIT', paid - view.amount, `Chuyển thừa cho đơn ${orderCode}, phần dư cộng vào ví`)
    }
    mock.save(state)
    mockStore.markOrderPaid(view.transactionId)
    return { success: true, status: 'SUCCESS', orderCode, message: 'Xác nhận thanh toán thành công' }
  },

  complaints(): PaymentComplaint[] {
    return mock.load().complaints ?? []
  },

  createComplaint(input: CreateComplaintInput): PaymentComplaint {
    const state = mock.load()
    state.complaints ??= []
    const ref = input.bankReference.trim().toUpperCase()
    if (state.complaints.some((c) => c.bankReference === ref)) {
      throw new Error(`Mã giao dịch ${ref} đã được gửi khiếu nại trước đó`)
    }
    const orderCode = input.orderCode?.trim() || undefined
    if (orderCode) mock.getOrder(orderCode) // kiểm tra tồn tại & đúng chủ đơn
    const c: PaymentComplaint = {
      complaintId: String(state.complaints.length + 1),
      userId: mockStore.getCurrentUser().id,
      orderCode,
      amount: input.amount,
      transferredAt: input.transferredAt,
      bankReference: ref,
      note: input.note,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    }
    state.complaints.unshift(c)
    mock.save(state)
    return c
  },

  resolveComplaint(id: string, target: 'ORDER' | 'WALLET', note?: string): PaymentComplaint {
    const c = mock.complaints().find((x) => x.complaintId === id)
    if (!c || c.status !== 'OPEN') throw new Error('Khiếu nại không tồn tại hoặc đã được xử lý')
    let resolution: string
    if (target === 'ORDER') {
      if (!c.orderCode) throw new Error('Khiếu nại không có mã đơn, hãy chọn cộng vào ví')
      const r = mock.simulateIpn(c.orderCode, c.amount, c.bankReference, c.userId)
      if (r.status === 'ALREADY_PROCESSED') {
        throw new Error(`Đơn ${c.orderCode} đã được ghi nhận trước đó. Nếu sao kê có thêm khoản chuyển này, hãy chọn cộng vào ví.`)
      }
      resolution = r.status
    } else {
      const s = mock.load()
      mock.move(s, c.userId, `CMP-${c.bankReference}`, 'CREDIT', c.amount, `Ghi nhận khiếu nại #${c.complaintId} (mã GD ${c.bankReference})`)
      mock.save(s)
      resolution = 'CREDITED_WALLET'
    }
    const state = mock.load()
    const saved = state.complaints!.find((x) => x.complaintId === id)!
    Object.assign(saved, { status: 'RESOLVED', resolution, resolutionNote: note, resolvedAt: new Date().toISOString() })
    mock.save(state)
    return saved
  },

  rejectComplaint(id: string, reason: string): PaymentComplaint {
    if (!reason.trim()) throw new Error('Phải nhập lý do từ chối để thông báo cho khách')
    const state = mock.load()
    const c = state.complaints?.find((x) => x.complaintId === id)
    if (!c || c.status !== 'OPEN') throw new Error('Khiếu nại không tồn tại hoặc đã được xử lý')
    Object.assign(c, { status: 'REJECTED', resolutionNote: reason.trim(), resolvedAt: new Date().toISOString() })
    mock.save(state)
    return c
  },

  getWallet(): WalletInfo {
    const state = mock.load()
    return { ...mock.wallet(state, mockStore.getCurrentUser().id) }
  },
}
