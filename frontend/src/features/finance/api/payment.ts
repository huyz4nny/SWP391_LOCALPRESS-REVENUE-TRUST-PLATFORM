import { APP_CONFIG } from '@/app/config'
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'
import type {
  CreateComplaintInput,
  IpnResult,
  PaymentComplaint,
  PaymentOrderView,
  PaymentStatusView,
  SepayLog,
  SepayStatus,
} from '../types'

/**
 * ==============================================================================
 * API TRANG THANH TOÁN CHUNG (SV4 - HUY)
 * ==============================================================================
 * Mọi module muốn thu tiền: tạo đơn qua POST /finance/orders,
 * rồi navigate(paymentPath(response)) để sang trang /payment/:orderCode của SV4.
 * Khách quét QR đúng mã đơn + đúng số tiền.
 *
 * Dual-mode: API thật gọi Spring Boot; mock mode giữ khiếu nại + nhật ký SePay trong localStorage riêng
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

  /** Chỉ dùng khi demo ở máy local (backend profile dev): giả lập SePay bắn webhook. */
  simulateIpn: async (orderCode: string, amount?: number, referenceCode?: string): Promise<IpnResult> => {
    if (APP_CONFIG.useMockApi) {
      const view = mock.getOrder(orderCode)
      const r = mock.simulateIpn(orderCode, amount, referenceCode)
      mock.recordLog({
        orderCode,
        amount: amount ?? view.amount,
        referenceCode: referenceCode ?? null,
        resultStatus: r.status === 'ALREADY_PROCESSED' && referenceCode ? 'DUPLICATE_DELIVERY' : r.status,
        resultMessage: r.message,
      })
      return r
    }
    return httpClient.post<IpnResult>(`/finance/orders/code/${orderCode}/simulate-ipn`, { amount, referenceCode })
  },

  /**
   * Nút "Tôi đã chuyển khoản, kiểm tra lại": backend hỏi thẳng API SePay cho đơn này (khi chưa nhận được webhook).
   * checked=false khi chưa cấu hình token SePay hoặc vừa hỏi trong 10 giây; khi đó chỉ đọc lại trạng thái đơn.
   */
  checkWithSepay: async (orderCode: string): Promise<{ checked: boolean; reason?: string; found?: number }> => {
    if (APP_CONFIG.useMockApi) return { checked: false, reason: 'MOCK_MODE' }
    return unwrap(await httpClient.post<any>(`/finance/orders/code/${orderCode}/check-sepay`))
  },
}

/**
 * Khiếu nại "đã chuyển tiền nhưng chưa được ghi nhận" (UC051).
 * Khách gửi/xem của mình; kế toán đối chiếu sao kê rồi ghi nhận vào đơn, chuyển trả lại khách, hoặc từ chối có lý do.
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

  resolve: async (id: string, target: 'ORDER' | 'RETURNED', note?: string): Promise<PaymentComplaint> => {
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


/**
 * Nhật ký tiền SePay báo về (UC048, UC049) - màn hình /backoffice/finance/sepay của kế toán.
 * Nguồn: WEBHOOK (SePay gọi vào), API_SYNC (LocalPress hỏi API SePay), SIMULATION (nút demo).
 */
export const sepayApi = {
  logs: async (source?: SepayLog['source']): Promise<SepayLog[]> => {
    if (APP_CONFIG.useMockApi) return (mock.load().sepayLogs ?? []).filter((l) => !source || l.source === source)
    return (unwrap<any[]>(await httpClient.get<any>('/finance/sepay/logs', { params: { source, limit: 200 } })) || []).map(toSepayLog)
  },

  status: async (): Promise<SepayStatus> => {
    if (APP_CONFIG.useMockApi) {
      return { webhookKeyConfigured: false, apiTokenConfigured: false, accountNumber: '****9981', webhookPath: '/api/v1/finance/webhook/sepay', lastWebhookAt: null, mock: true }
    }
    return unwrap(await httpClient.get<any>('/finance/sepay/status'))
  },

  sync: async (hours = 24): Promise<{ fetched: number; processed: number; skippedDuplicate: number; ignored: number }> => {
    if (APP_CONFIG.useMockApi) throw new Error('Chế độ mock không gọi được API SePay. Chạy backend thật để đồng bộ.')
    return unwrap(await httpClient.post<any>('/finance/sepay/sync', undefined, { params: { hours } }))
  },
}

function toSepayLog(raw: any): SepayLog {
  return {
    logId: String(raw.logId),
    source: raw.source,
    sepayId: raw.sepayId ?? null,
    authOk: Boolean(raw.authOk),
    gateway: raw.gateway ?? null,
    transferType: raw.transferType ?? null,
    amount: raw.transferAmount != null ? Number(raw.transferAmount) : null,
    content: raw.content ?? null,
    referenceCode: raw.referenceCode ?? null,
    transactionDate: raw.transactionDate ?? null,
    orderCode: raw.orderCode ?? null,
    resultStatus: raw.resultStatus,
    resultMessage: raw.resultMessage ?? null,
    rawPayload: raw.rawPayload ?? null,
    remoteIp: raw.remoteIp ?? null,
    receivedAt: raw.receivedAt,
  }
}

// =============================================================================
// MOCK MODE (chỉ chạy khi VITE_USE_MOCK_API != 'false')
// =============================================================================

const MOCK_KEY = 'localpress_finance_payment_mock_v2'
const ORDER_TTL_MS = 15 * 60 * 1000

interface MockPaymentState {
  processedRefs: string[]
  complaints?: PaymentComplaint[]
  sepayLogs?: SepayLog[]
}

const mock = {
  load(): MockPaymentState {
    try {
      const raw = window.localStorage.getItem(MOCK_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* dữ liệu hỏng thì khởi tạo lại */
    }
    return { processedRefs: [] }
  },

  save(state: MockPaymentState) {
    window.localStorage.setItem(MOCK_KEY, JSON.stringify(state))
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
    const userId = ownerId ?? mockStore.getCurrentUser().id
    const o = mock.sharedOrder(orderCode)
    if (!o) throw new Error('Không tìm thấy đơn hàng')
    if (o.userId !== userId) throw new Error('Bạn không có quyền truy cập đơn hàng này')
    const paid = o.paymentStatus === 'PAID'
    const expiresAt = new Date(Date.parse(o.createdAt) + ORDER_TTL_MS).toISOString()
    // Rule 6 (giống backend isPaymentWindowClosed): chỉ booking quảng cáo giữ chỗ có hạn
    const expired = !paid && o.orderType === 'AD_CAMPAIGN' && Date.now() > Date.parse(expiresAt)
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
      paymentMethod: o.paymentMethod,
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

    if ((view.orderType === 'AD' && view.expired) || view.status !== 'PENDING') {
      mock.save(state)
      return { success: false, status: 'LATE_PAYMENT', orderCode, message: `Tiền về sau khi đơn ${orderCode} hết hiệu lực, kế toán sẽ chuyển trả lại khách` }
    }
    if (paid !== view.amount) {
      mock.save(state)
      return {
        success: false,
        status: 'AMOUNT_MISMATCH',
        orderCode,
        message: `Chuyển ${paid.toLocaleString('vi-VN')} VND, đơn cần ${view.amount.toLocaleString('vi-VN')} VND. Đơn chưa được ghi nhận, kế toán sẽ chuyển trả lại khách`,
      }
    }
    mock.save(state)
    mockStore.markOrderPaid(view.transactionId)
    return { success: true, status: 'SUCCESS', orderCode, message: 'Xác nhận thanh toán thành công' }
  },

  complaints(): PaymentComplaint[] {
    return mock.load().complaints ?? []
  },

  recordLog(input: { orderCode: string; amount: number; referenceCode: string | null; resultStatus: string; resultMessage: string }) {
    const state = mock.load()
    state.sepayLogs ??= []
    const now = new Date().toISOString()
    state.sepayLogs.unshift({
      logId: String(state.sepayLogs.length + 1),
      source: 'SIMULATION',
      sepayId: null,
      authOk: true,
      gateway: 'Vietcombank',
      transferType: 'in',
      amount: input.amount,
      content: `LOCALPRESS ${input.orderCode}`,
      referenceCode: input.referenceCode,
      transactionDate: now.slice(0, 19).replace('T', ' '),
      orderCode: input.orderCode,
      resultStatus: input.resultStatus,
      resultMessage: input.resultMessage,
      rawPayload: JSON.stringify({ simulated: true, orderCode: input.orderCode, amount: input.amount, referenceCode: input.referenceCode }),
      remoteIp: 'localhost',
      receivedAt: now,
    })
    window.localStorage.setItem(MOCK_KEY, JSON.stringify(state))
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

  resolveComplaint(id: string, target: 'ORDER' | 'RETURNED', note?: string): PaymentComplaint {
    const c = mock.complaints().find((x) => x.complaintId === id)
    if (!c || c.status !== 'OPEN') throw new Error('Khiếu nại không tồn tại hoặc đã được xử lý')
    let resolution: string
    if (target === 'ORDER') {
      if (!c.orderCode) throw new Error('Khiếu nại không có mã đơn, hãy chuyển trả lại khách')
      const r = mock.simulateIpn(c.orderCode, c.amount, c.bankReference, c.userId)
      if (r.status === 'ALREADY_PROCESSED') {
        throw new Error(`Đơn ${c.orderCode} đã được ghi nhận trước đó. Nếu sao kê có thêm khoản chuyển này, hãy chuyển trả lại khách.`)
      }
      if (r.status !== 'SUCCESS') throw new Error(`${r.message}. Hãy chuyển trả lại khách.`)
      resolution = r.status
    } else {
      if (!note?.trim()) throw new Error('Nhập mã giao dịch chuyển trả lại khách vào ghi chú')
      resolution = 'RETURNED_TO_CUSTOMER'
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
}
