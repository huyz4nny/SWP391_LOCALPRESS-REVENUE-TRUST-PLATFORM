import { httpClient } from '@/lib/http/client'

/**
 * Cửa hàng thử (chỉ backend profile dev + localpress.demo-store.enabled): đóng vai SV3 tạo đơn mua bài / gói
 * từ server để demo trọn luồng thanh toán SV4. Trình duyệt chỉ gửi loại + id món hàng, không gửi giá.
 */
export interface DemoItem {
  id: number
  title: string
  price: number
  slug?: string
  durationDays?: number
  accessStatus?: string | null
}

export interface DemoCatalog {
  articles: DemoItem[]
  plans: DemoItem[]
}

const unwrap = (res: any) => (res && res.data !== undefined && res.success !== undefined ? res.data : res)
const toItem = (r: any): DemoItem => ({ ...r, id: Number(r.id), price: Number(r.price) })

export const demoStoreApi = {
  catalog: async (): Promise<DemoCatalog> => {
    const data = unwrap(await httpClient.get<any>('/finance/dev/demo-store'))
    return { articles: (data.articles || []).map(toItem), plans: (data.plans || []).map(toItem) }
  },

  purchase: async (type: 'ARTICLE' | 'SUBSCRIPTION', itemId: number): Promise<{ orderCode: string }> =>
    unwrap(await httpClient.post<any>('/finance/dev/demo-store/purchase', { type, itemId })),
}
