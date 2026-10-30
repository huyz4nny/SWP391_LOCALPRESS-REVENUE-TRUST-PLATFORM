import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { APP_CONFIG } from '@/app/config'
import { mockStore } from '@/mocks/store'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { demoStoreApi, type DemoCatalog, type DemoItem } from '../api/demoStore'
import { Panel, Notice, tableCls } from '../components/LedgerUI'

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Đã mở quyền',
  PENDING: 'Chờ thanh toán',
  REVOKED: 'Đã thu hồi',
  CANCELLED: 'Đã thu hồi',
  EXPIRED: 'Hết hạn',
}

/**
 * ==============================================================================
 * CỬA HÀNG THỬ /dev/demo-store (SV4, chỉ môi trường dev)
 * Đóng vai SV3 khi demo: bấm Mua -> backend tạo bản ghi chờ + đơn (giá lấy từ DB) -> /payment/:orderCode
 * -> trả tiền -> PaymentSuccessEvent -> mở bài / gói. Hoàn tiền toàn bộ -> RefundCompletedEvent -> thu hồi.
 * ==============================================================================
 */
export function DemoStorePage() {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState<DemoCatalog | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const isGuest = mockStore.getCurrentUser().role === 'GUEST'

  useEffect(() => {
    if (isGuest) {
      navigate('/login', { replace: true, state: { from: { pathname: '/dev/demo-store' } } })
      return
    }
    if (APP_CONFIG.useMockApi) return
    demoStoreApi
      .catalog()
      .then(setCatalog)
      .catch((e) => setError(e?.message || 'Không tải được cửa hàng thử'))
  }, [isGuest, navigate])

  const buy = async (type: 'ARTICLE' | 'SUBSCRIPTION', item: DemoItem) => {
    setBusy(`${type}-${item.id}`)
    setError('')
    try {
      const order = await demoStoreApi.purchase(type, item.id)
      navigate(`/payment/${order.orderCode}`)
    } catch (e: any) {
      setError(e?.message || 'Không tạo được đơn')
      setBusy('')
    }
  }

  const rows = (type: 'ARTICLE' | 'SUBSCRIPTION', items: DemoItem[]) =>
    items.map((item) => {
      const owned = item.accessStatus === 'ACTIVE'
      return (
        <tr key={`${type}-${item.id}`} className={tableCls.tr}>
          <td className={tableCls.td}>
            <div className="font-medium text-slate-900">{item.title}</div>
            {type === 'ARTICLE' && item.slug && (
              <Link to={`/articles/${item.slug}`} className="text-[13px] text-slate-500 hover:underline">
                Mở bài để kiểm tra paywall
              </Link>
            )}
            {type === 'SUBSCRIPTION' && <div className="text-[13px] text-slate-500">{item.durationDays} ngày</div>}
          </td>
          <td className={tableCls.td}>{item.accessStatus ? STATUS_LABEL[item.accessStatus] ?? item.accessStatus : 'Chưa mua'}</td>
          <td className={tableCls.tdNum}>{formatCurrency(item.price)}</td>
          <td className={tableCls.td}>
            <Button size="sm" disabled={owned || busy !== ''} onClick={() => buy(type, item)}>
              {busy === `${type}-${item.id}` ? 'Đang tạo đơn...' : owned ? 'Đã có quyền' : 'Mua'}
            </Button>
          </td>
        </tr>
      )
    })

  return (
    <div className="mx-auto max-w-[960px] py-6 font-sans text-slate-900">
      <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em]">Cửa hàng thử</h1>
      <p className="mt-1 text-[13px] text-slate-500">
        Chỉ dùng khi demo luồng thanh toán: tạo đơn mua bài / gói từ server rồi chuyển sang trang thanh toán chung.
      </p>

      {APP_CONFIG.useMockApi && (
        <div className="mt-4">
          <Notice tone="warning">Cửa hàng thử cần API thật: đặt VITE_USE_MOCK_API=false và bật localpress.demo-store.enabled ở backend.</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {catalog && (
        <div className="mt-5 flex flex-col gap-5">
          <Panel title="Bài Premium (mua lẻ)" bodyClassName="px-0 pb-0">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Bài viết</th>
                  <th className={tableCls.th}>Quyền hiện tại</th>
                  <th className={tableCls.thNum}>Giá</th>
                  <th className={tableCls.th} />
                </tr>
              </thead>
              <tbody>{rows('ARTICLE', catalog.articles)}</tbody>
            </table>
          </Panel>
          <Panel title="Gói hội viên" bodyClassName="px-0 pb-0">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Gói</th>
                  <th className={tableCls.th}>Quyền hiện tại</th>
                  <th className={tableCls.thNum}>Giá</th>
                  <th className={tableCls.th} />
                </tr>
              </thead>
              <tbody>{rows('SUBSCRIPTION', catalog.plans)}</tbody>
            </table>
          </Panel>
        </div>
      )}
    </div>
  )
}
