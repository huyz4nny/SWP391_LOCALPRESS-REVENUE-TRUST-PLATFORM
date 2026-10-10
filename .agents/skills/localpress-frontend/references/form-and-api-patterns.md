# LocalPress Form & API Integration Patterns

Tài liệu hướng dẫn quy chuẩn quản lý Form, Xác thực dữ liệu (Validation với Zod), tích hợp API và đồng bộ trạng thái Reactive với Mock Store / Backend Spring Boot thật.

---

## 1. QUY CHUẨN FORM & VALIDATION (REACT HOOK FORM + ZOD)

Dự án cài đặt sẵn `react-hook-form`, `zod`, và `@hookform/resolvers/zod`. Mọi form nhập liệu (đặt booking, gửi báo giá, soạn bài viết, đề xuất hoàn tiền) **PHẢI** dùng schema Zod để xác thực.

### Ví dụ chuẩn: Form Đề xuất Hoàn tiền (SV4) hoặc Đặt Booking (SV1)

```tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// 1. Định nghĩa Zod Schema với thông báo lỗi tiếng Việt rõ ràng
const refundFormSchema = z.object({
  refundAmount: z
    .number({ invalid_type_error: 'Số tiền phải là số hợp lệ' })
    .min(1000, 'Số tiền hoàn tối thiểu là 1.000 ₫'),
  reason: z
    .string()
    .min(10, 'Lý do hoàn tiền phải có ít nhất 10 ký tự')
    .max(500, 'Lý do không được vượt quá 500 ký tự'),
  bankAccountNumber: z
    .string()
    .min(6, 'Số tài khoản ngân hàng không hợp lệ')
    .optional(),
})

type RefundFormValues = z.infer<typeof refundFormSchema>

interface RefundFormModalProps {
  maxAmount: number
  onSubmit: (values: RefundFormValues) => Promise<void>
  onClose: () => void
}

export function RefundFormModal({ maxAmount, onSubmit, onClose }: RefundFormModalProps) {
  // 2. Tinh chỉnh schema để thỏa mãn Invariant Rule 11 (Refund Cap)
  const schemaWithMax = refundFormSchema.refine(
    (data) => data.refundAmount <= maxAmount,
    {
      message: `Số tiền hoàn không được vượt quá giá trị đơn hàng (${maxAmount.toLocaleString('vi-VN')} ₫)`,
      path: ['refundAmount'],
    }
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RefundFormValues>({
    resolver: zodResolver(schemaWithMax),
    defaultValues: {
      refundAmount: maxAmount,
      reason: '',
      bankAccountNumber: '',
    },
  })

  const onFormSubmit = async (data: RefundFormValues) => {
    try {
      await onSubmit(data)
      onClose()
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi gửi đề xuất hoàn tiền')
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Trường số tiền */}
      <div className="space-y-1.5">
        <Label htmlFor="refundAmount">
          Số tiền đề xuất hoàn (₫) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="refundAmount"
          type="number"
          {...register('refundAmount', { valueAsNumber: true })}
        />
        {errors.refundAmount && (
          <p className="text-xs text-red-600 font-medium">{errors.refundAmount.message}</p>
        )}
      </div>

      {/* Trường lý do */}
      <div className="space-y-1.5">
        <Label htmlFor="reason">
          Lý do hoàn tiền (Biên bản kiểm toán) <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="reason"
          rows={3}
          className="w-full rounded-md border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
          placeholder="Mô tả chi tiết nguyên nhân hoàn tiền..."
          {...register('reason')}
        />
        {errors.reason && (
          <p className="text-xs text-red-600 font-medium">{errors.reason.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
        <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
          Đóng
        </Button>
        <Button variant="destructive" size="sm" type="submit" isLoading={isSubmitting}>
          Gửi đề xuất
        </Button>
      </div>
    </form>
  )
}
```

---

## 2. QUY CHUẨN TẦNG API DÙNG CHUNG (API LAYER)

Tất cả các cuộc gọi HTTP phải được đóng gói tại `src/features/<tên_phân_hệ>/api/index.ts`.  
**TUYỆT ĐỐI KHÔNG** dùng trực tiếp `fetch()` hoặc `axios` bừa bãi trong component.

### Cơ chế Dual-Mode: Mock API & Real Backend (`APP_CONFIG.useMockApi`)

Hệ thống đã có sẵn `httpClient` tại `@/lib/http/client`:
- Khi `useMockApi: true`: Tự động gọi qua Mock Handlers (`src/mocks/handlers/index.ts`).
- Khi `useMockApi: false`: Tự động gửi Request tới Backend Spring Boot (`http://localhost:8080/api/v1`).

### Cấu trúc file API mẫu của một phân hệ (`src/features/<module>/api/index.ts`):

```typescript
import { httpClient } from '@/lib/http/client'
import { mockStore } from '@/mocks/store'
import { APP_CONFIG } from '@/app/config'
import { Order, CreateOrderRequest } from '../types'

export const financeApi = {
  // Lấy danh sách đơn hàng
  getOrders: async (): Promise<Order[]> => {
    if (APP_CONFIG.useMockApi) {
      return mockStore.getState().orders
    }
    return httpClient.get<Order[]>('/finance/orders')
  },

  // Lấy chi tiết đơn hàng
  getOrderById: async (id: string): Promise<Order | null> => {
    if (APP_CONFIG.useMockApi) {
      return mockStore.getOrderById(id) || null
    }
    return httpClient.get<Order>(`/finance/orders/${id}`)
  },

  // Cập nhật hoặc thực thi hành động
  verifyBankTransfer: async (orderId: string, note?: string): Promise<Order> => {
    if (APP_CONFIG.useMockApi) {
      return mockStore.verifyOrder(orderId, note)
    }
    return httpClient.post<Order>(`/finance/orders/${orderId}/verify-bank-transfer`, { note })
  },
}
```

---

## 3. LẮNG NGHE & PHẢN ỨNG VỚI MOCK STORE (`mockStore.subscribe`)

Khi chạy ở chế độ Mock, để các tab hoặc màn hình tự động cập nhật khi đổi tài khoản (Role Switcher) hoặc khi có đơn mới tạo, hãy đăng ký `subscribe`:

```tsx
useEffect(() => {
  // 1. Tải dữ liệu ban đầu
  loadData()

  // 2. Đăng ký lắng nghe thay đổi trạng thái từ mockStore
  const unsubscribe = mockStore.subscribe(() => {
    loadData()
  })

  // 3. Hủy lắng nghe khi unmount
  return unsubscribe
}, [])
```
