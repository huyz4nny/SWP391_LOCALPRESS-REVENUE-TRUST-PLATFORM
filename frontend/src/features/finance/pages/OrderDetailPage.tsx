import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Order, FinancialDocument } from '../types'
import { financeApi } from '../api'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, Printer } from 'lucide-react'
import { PageHeader, Panel, KeyValue, LoadingBlock, Notice } from '../components/LedgerUI'
import { mockStore } from '@/mocks/store'
import { PERMISSION_CHECKERS } from '@/app/config'

const ORDER_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: 'Gói độc giả',
  ARTICLE_PURCHASE: 'Bài lẻ',
  AD_CAMPAIGN: 'Quảng cáo',
  REFUND: 'Hoàn tiền',
}

const ATTEMPT_STATUS: Record<string, ['success' | 'warning' | 'destructive' | 'secondary', string]> = {
  SUCCESS: ['success', 'Thành công'],
  PROCESSING: ['warning', 'Đang xác minh'],
  PENDING: ['warning', 'Chờ thanh toán'],
  FAILED: ['destructive', 'Thất bại'],
  EXPIRED: ['secondary', 'Hết hạn'],
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  // Kế toán trưởng chỉ duyệt hoàn tiền, không lập đề xuất (giữ nguyên tắc 4 mắt)
  const canProposeRefund = !PERMISSION_CHECKERS.canApproveRefunds(mockStore.getCurrentUser().role)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [document, setDocument] = useState<FinancialDocument | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)

  useEffect(() => {
    if (id) loadOrder(id)
  }, [id])

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true)
      setError('')
      const data = await financeApi.getOrderById(orderId)
      setOrder(data)
      // UC057: chứng từ do hệ thống phát hành khi đơn SUCCESS; đơn chưa thu (404) thì null, lỗi khác báo ra
      try {
        setDocument(await financeApi.getOrderDocument(data.id))
      } catch (docError: any) {
        setDocument(null)
        setError(`Không tải được chứng từ: ${docError?.message || 'lỗi máy chủ'}`)
      }
    } catch (e: any) {
      setError(e?.message || 'Không tải được đơn')
    } finally {
      setLoading(false)
    }
  }

  const back = (
    <Link to="/backoffice/finance/orders" className="hover:text-slate-900 hover:underline">
      Đơn thanh toán
    </Link>
  )

  if (loading) return <LoadingBlock rows={6} />

  if (!order) {
    return (
      <>
        <PageHeader back={back} title="Không tìm thấy đơn" />
        <Notice tone="error">{error || `Không có đơn mã ${id}.`}</Notice>
      </>
    )
  }

  const isInvoice = document?.type === 'INVOICE'
  const documentTitle = isInvoice ? 'Hóa đơn giá trị gia tăng' : 'Biên nhận thanh toán'
  const voided = document?.status === 'VOIDED'

  return (
    <div>
      <PageHeader
        back={<>{back} / <span className="font-mono">{order.orderCode}</span></>}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[22px]">{order.orderCode}</span>
            <StatusBadge type="payment" status={order.paymentStatus} />
          </span>
        }
        sub={`${order.userName} · tạo lúc ${formatDateTime(order.createdAt)}`}
        actions={
          order.paymentStatus === 'PAID' && (
            <>
              {canProposeRefund && (
                <Link to={`/backoffice/finance/refunds?orderId=${order.id}`}>
                  <Button variant="outline" size="sm" className="text-negative">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Lập đề xuất hoàn tiền
                  </Button>
                </Link>
              )}
              {document && (
                <Button size="sm" onClick={() => setShowInvoiceModal(true)}>
                  <Printer className="h-3.5 w-3.5" />
                  In chứng từ
                </Button>
              )}
            </>
          )
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Thanh toán">
          <dl>
            <KeyValue label="Dịch vụ">{order.targetTitle}</KeyValue>
            <KeyValue label="Loại đơn">{ORDER_TYPE_LABELS[order.orderType] || order.orderType}</KeyValue>
            <KeyValue label="Phương thức">{order.paymentMethod || <span className="text-slate-400">—</span>}</KeyValue>
            <KeyValue label="Giá gốc"><span className="num">{formatCurrency(order.amount)}</span></KeyValue>
            {order.discount > 0 && (
              <KeyValue label="Chiết khấu"><span className="num">-{formatCurrency(order.discount)}</span></KeyValue>
            )}
          </dl>
          <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-medium text-slate-900">Tổng thu</span>
            <span className="text-2xl font-semibold text-slate-900 num">{formatCurrency(order.finalAmount)}</span>
          </div>

          {document && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3.5 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                  {isInvoice ? 'Hóa đơn' : 'Biên nhận'} <span className="font-mono">{document.documentNo}</span>
                  {voided && <Badge variant="secondary">Đã hủy</Badge>}
                </div>
                <div className="text-[13px] text-slate-500 num">
                  Phát hành lúc {formatDateTime(document.issuedAt)}
                  {voided && document.voidedAt && <> · hủy lúc {formatDateTime(document.voidedAt)} (hoàn tiền toàn phần)</>}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowInvoiceModal(true)}>
                Xem
              </Button>
            </div>
          )}
        </Panel>

        <Panel title="Các lần thanh toán" aside={<span className="num">{order.paymentAttempts.length} lần</span>}>
          {order.paymentAttempts.length === 0 ? (
            <p className="text-sm text-slate-500">Khách chưa thực hiện lần thanh toán nào.</p>
          ) : (
            <ul className="-mt-1">
              {order.paymentAttempts.map((att) => {
                const [variant, label] = ATTEMPT_STATUS[att.status] || ['secondary', att.status]
                return (
                  <li key={att.id} className="border-b border-slate-100 py-3 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[13px] text-slate-900">{att.transactionCode}</span>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[13px] text-slate-500">
                      <span>{att.method} · {formatDateTime(att.createdAt)}</span>
                      <span className="text-slate-900 num">{formatCurrency(att.amount)}</span>
                    </div>
                    {att.bankReferenceCode && (
                      <div className="mt-0.5 text-[13px] text-slate-500">Mã ngân hàng <span className="font-mono text-slate-700">{att.bankReferenceCode}</span></div>
                    )}
                    {att.verifiedBy && (
                      <div className="mt-0.5 text-[13px] text-slate-500">Xác nhận bởi {att.verifiedBy}, {formatDateTime(att.verifiedAt)}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Chứng từ do hệ thống phát hành khi đơn SUCCESS (UC057, bảng financial_documents) */}
      {document && (
        <Dialog open={showInvoiceModal} onClose={() => setShowInvoiceModal(false)} title={documentTitle} maxWidth="2xl">
          <div className="rounded-md border border-slate-300 bg-white p-6 text-sm text-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="font-serif text-base font-black">Báo điện tử LocalPress</div>
                <div className="mt-0.5 text-[13px] text-slate-600">Đơn vị chủ quản: Hội Nhà báo TP. Hải Phòng</div>
                <div className="text-[13px] text-slate-600">Mã số thuế 0201998877</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{documentTitle}</div>
                <div className="font-mono text-[13px]">Số {document.documentNo}</div>
                {voided && <div className="mt-1"><Badge variant="destructive">Đã hủy</Badge></div>}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 text-[13px]">
              <div>
                <dt className="text-slate-500">{isInvoice ? 'Đơn vị mua' : 'Khách hàng'}</dt>
                <dd className="font-medium">{document.buyerName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Mã đơn</dt>
                <dd className="font-mono">{order.orderCode}</dd>
              </div>
              {document.buyerTaxCode && (
                <div>
                  <dt className="text-slate-500">Mã số thuế</dt>
                  <dd className="font-mono">{document.buyerTaxCode}</dd>
                </div>
              )}
              {document.buyerAddress && (
                <div>
                  <dt className="text-slate-500">Địa chỉ</dt>
                  <dd>{document.buyerAddress}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Phương thức thanh toán</dt>
                <dd>Chuyển khoản ngân hàng (QR SePay)</dd>
              </div>
              <div>
                <dt className="text-slate-500">Ngày phát hành</dt>
                <dd className="num">{formatDateTime(document.issuedAt)}</dd>
              </div>
            </dl>

            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="border-b border-slate-300 py-2 pr-2 font-normal">Dịch vụ</th>
                  <th className="border-b border-slate-300 py-2 pl-2 text-right font-normal">Thành tiền trước thuế</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-b border-slate-100 py-2 pr-2">{order.targetTitle} ({ORDER_TYPE_LABELS[order.orderType] || order.orderType})</td>
                  <td className="border-b border-slate-100 py-2 pl-2 text-right num">{formatCurrency(document.amountBeforeVat)}</td>
                </tr>
              </tbody>
            </table>

            <dl className="ml-auto mt-3 w-full max-w-xs space-y-1 text-[13px]">
              <div className="flex justify-between"><dt className="text-slate-500">Cộng tiền dịch vụ</dt><dd className="num">{formatCurrency(document.amountBeforeVat)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Thuế GTGT {document.vatRate}%</dt><dd className="num">{formatCurrency(document.vatAmount)}</dd></div>
              <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-semibold">
                <dt>Tổng thanh toán</dt><dd className="num">{formatCurrency(document.totalAmount)}</dd>
              </div>
            </dl>

            <p className="mt-4 text-[13px] text-slate-500">
              {voided
                ? `Chứng từ đã hủy lúc ${formatDateTime(document.voidedAt)} do đơn được hoàn tiền toàn phần.`
                : 'Đã thu đủ qua chuyển khoản. Chứng từ do hệ thống LocalPress phát hành tự động.'}
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowInvoiceModal(false)}>
              Đóng
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              In hoặc lưu PDF
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
