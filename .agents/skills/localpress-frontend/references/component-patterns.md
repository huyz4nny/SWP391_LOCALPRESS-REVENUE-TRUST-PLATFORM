# LocalPress Component Patterns & Reusable UI Catalog

Tài liệu này tổng hợp toàn bộ các Component có sẵn trong thư mục `@/components/ui` và `@/components/shared`, kèm theo cú pháp chuẩn để mọi thành viên sử dụng mà không cần tự chế lại.

---

## 1. COMPONENT NGUYÊN TỬ (BASE UI COMPONENTS)

### 1.1. Nút bấm (`Button`)
Đường dẫn: `@/components/ui/button`

```tsx
import { Button } from '@/components/ui/button'

// Các biến thể hỗ trợ:
<Button variant="primary">Lưu thay đổi</Button>
<Button variant="secondary">Hủy bỏ</Button>
<Button variant="outline">Xuất dữ liệu</Button>
<Button variant="ghost">Xem chi tiết</Button>
<Button variant="destructive">Xóa bài viết</Button>
<Button variant="gold">Nâng cấp VIP</Button>
<Button variant="link">Quên mật khẩu?</Button>

// Các kích cỡ: 'sm' | 'md' | 'lg' | 'icon'
<Button size="sm">Nhỏ (h-8)</Button>
<Button size="md">Vừa (h-10 tiêu chuẩn)</Button>
<Button size="lg">Lớn (h-11 cho hero/checkout)</Button>

// Trạng thái Loading:
<Button isLoading={isSubmitting}>Đang xử lý...</Button>
```

### 1.2. Huy hiệu (`Badge`)
Đường dẫn: `@/components/ui/badge`

```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="default">Chính</Badge>
<Badge variant="secondary">Phụ</Badge>
<Badge variant="outline">Viền mảnh</Badge>
<Badge variant="success">Hoàn thành</Badge>
<Badge variant="warning">Đang xử lý</Badge>
<Badge variant="destructive">Thất bại</Badge>
<Badge variant="gold">Hội viên VIP</Badge>
<Badge variant="info">Thông báo</Badge>
```

### 1.3. Thẻ chứa (`Card`)
Đường dẫn: `@/components/ui/card`

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Thông tin chiến dịch</CardTitle>
    <CardDescription>Chi tiết hợp đồng quảng cáo vị trí Banner Header</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-slate-600">Nội dung chi tiết...</p>
  </CardContent>
  <CardFooter className="flex justify-between">
    <Button variant="outline">Đóng</Button>
    <Button variant="primary">Tiếp tục</Button>
  </CardFooter>
</Card>
```

### 1.4. Nhập liệu (`Input`, `Label`)
Đường dẫn: `@/components/ui/input`, `@/components/ui/label`

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

<div className="space-y-1.5">
  <Label htmlFor="campaignName">Tên chiến dịch <span className="text-red-500">*</span></Label>
  <Input
    id="campaignName"
    placeholder="Nhập tên chiến dịch quảng cáo..."
    {...register('campaignName')}
  />
  {errors.campaignName && (
    <p className="text-xs text-red-600">{errors.campaignName.message}</p>
  )}
</div>
```

---

## 2. COMPONENT NGHIỆP VỤ DÙNG CHUNG (SHARED DOMAIN COMPONENTS)

### 2.1. Huy hiệu trạng thái nghiệp vụ (`StatusBadge`)
Đường dẫn: `@/components/shared/StatusBadge`  
> [!IMPORTANT]
> **BẮT BUỘC:** Toàn bộ bảng dữ liệu, danh sách và trang chi tiết **PHẢI DÙNG** `StatusBadge` để hiển thị trạng thái. Không được tự viết `<span>` hoặc `Badge` riêng cho 6 loại trạng thái sau:

```tsx
import { StatusBadge } from '@/components/shared/StatusBadge'

// 1. Trạng thái bài viết: 'article'
// Các giá trị hợp lệ: DRAFT | IN_REVIEW | CHANGES_REQUESTED | APPROVED | SCHEDULED | PUBLISHED | UNPUBLISHED
<StatusBadge type="article" status={article.status} />

// 2. Trạng thái booking quảng cáo: 'booking'
// Các giá trị: SUBMITTED | QUOTED | CONFIRMED | REJECTED | CANCELLED
<StatusBadge type="booking" status={booking.status} />

// 3. Trạng thái thanh toán: 'payment'
// Các giá trị: UNPAID | PENDING | PROCESSING | PAID | SUCCESS | FAILED | EXPIRED | REFUNDED | PARTIALLY_REFUNDED
<StatusBadge type="payment" status={order.paymentStatus} />

// 4. Trạng thái phát sóng banner: 'delivery'
// Các giá trị: NOT_STARTED | ELIGIBLE | LIVE | PAUSED | COMPLETED
<StatusBadge type="delivery" status={campaign.deliveryStatus} />

// 5. Trạng thái banner sáng tạo: 'creative'
// Các giá trị: DRAFT | IN_REVIEW | CHANGES_REQUESTED | APPROVED
<StatusBadge type="creative" status={creative.status} />

// 6. Trạng thái yêu cầu hoàn tiền: 'refund'
// Các giá trị: REQUESTED | UNDER_REVIEW | APPROVED | SUCCEEDED | REJECTED
<StatusBadge type="refund" status={refund.status} />
```

### 2.2. Khung trạng thái rỗng (`EmptyState`)
Đường dẫn: `@/components/shared/EmptyState`

```tsx
import { EmptyState } from '@/components/shared/EmptyState'
import { FileText } from 'lucide-react'

{filteredList.length === 0 ? (
  <EmptyState
    icon={<FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
    title="Chưa có bài viết nào"
    description="Bạn chưa tạo bản thảo nào. Hãy bắt đầu bằng cách soạn bài viết mới."
    actionLabel="Soạn bài mới"
    onAction={() => navigate('/backoffice/editorial/articles/new')}
  />
) : (
  <TableContent />
)}
```

### 2.3. Hộp thoại xác nhận hành động nguy hiểm (`ConfirmDialog`)
Đường dẫn: `@/components/shared/ConfirmDialog`  
Dùng khi: Hạ bài viết, xóa bản nháp, dừng khẩn cấp quảng cáo, từ chối báo giá, duyệt hoàn tiền.

```tsx
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

<ConfirmDialog
  isOpen={isConfirmOpen}
  title="Xác nhận hạ bài viết"
  description="Bài viết sẽ không còn hiển thị công khai trên trang chủ. Bạn có chắc chắn muốn thực hiện hành động này?"
  confirmText="Hạ bài ngay"
  cancelText="Hủy bỏ"
  variant="destructive" // 'destructive' | 'primary'
  onConfirm={handleUnpublish}
  onCancel={() => setIsConfirmOpen(false)}
/>
```

---

## 3. MẪU BẢNG QUẢN TRỊ TIÊU CHUẨN (STANDARD BACKOFFICE DATA TABLE)

Mọi màn hình danh sách (Orders, Articles, Bookings, Refunds, Users) phải cấu trúc theo 3 khối đồng bộ:

```tsx
<div className="space-y-6">
  {/* 1. Header trang */}
  <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
        Tiêu đề màn hình quản trị
      </h1>
      <p className="text-xs text-slate-500 mt-1">
        Mô tả ngắn gọn chức năng nghiệp vụ của màn hình này.
      </p>
    </div>
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="sm">Xuất Excel</Button>
      <Button variant="primary" size="sm">Tạo mới</Button>
    </div>
  </div>

  {/* 2. Thanh lọc (Filter Toolbar) */}
  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 text-xs">
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-semibold text-slate-500">Trạng thái:</span>
      {['ALL', 'PENDING', 'APPROVED'].map((st) => (
        <button
          key={st}
          onClick={() => setFilter(st)}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
            filter === st ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {st}
        </button>
      ))}
    </div>
    <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
      <Input
        placeholder="Tìm kiếm theo mã, từ khóa..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-xs max-w-xs"
      />
      <span className="text-slate-400 text-xs">Hiển thị {list.length} kết quả</span>
    </div>
  </div>

  {/* 3. Bảng dữ liệu chuẩn */}
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
          <tr>
            <th className="px-4 py-3">Mã</th>
            <th className="px-4 py-3">Đối tượng</th>
            <th className="px-4 py-3">Số tiền</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {list.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.code}</td>
              <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
              <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(item.amount)}</td>
              <td className="px-4 py-3"><StatusBadge type="payment" status={item.status} /></td>
              <td className="px-4 py-3 text-right">
                <Button variant="ghost" size="sm">Chi tiết</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</div>
```
