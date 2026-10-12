import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Plus, Search, Filter, ArrowRight, Trash2 } from 'lucide-react'

// Kiểu dữ liệu mẫu của bản ghi
interface ExampleItem {
  id: string
  code: string
  title: string
  creatorName: string
  amount: number
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED'
  createdAt: string
}

export function BackofficeTablePageExample() {
  const [items, setItems] = useState<ExampleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedItemToDelete, setSelectedItemToDelete] = useState<ExampleItem | null>(null)

  useEffect(() => {
    // Giả lập load dữ liệu từ API
    setTimeout(() => {
      setItems([
        {
          id: 'item-1',
          code: 'ART-2026-001',
          title: 'Phát triển kinh tế biển Bạch Long Vĩ giai đoạn 2026-2030',
          creatorName: 'Nguyễn Văn Phóng Viên',
          amount: 15000,
          status: 'PUBLISHED',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'item-2',
          code: 'ART-2026-002',
          title: 'Quy hoạch cụm công nghiệp cảng biển Lạch Huyện mở rộng',
          creatorName: 'Trần Thị Biên Tập',
          amount: 0,
          status: 'IN_REVIEW',
          createdAt: new Date().toISOString(),
        },
      ])
      setLoading(false)
    }, 300)
  }, [])

  // Lọc dữ liệu theo bộ lọc và ô tìm kiếm
  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false
    if (
      search &&
      !item.code.toLowerCase().includes(search.toLowerCase()) &&
      !item.title.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const handleDeleteConfirm = () => {
    if (!selectedItemToDelete) return
    setItems((prev) => prev.filter((i) => i.id !== selectedItemToDelete.id))
    setSelectedItemToDelete(null)
  }

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Header trang */}
      <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Quản lý Bản Thảo & Bài Viết
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tiến độ biên tập, phiên bản bài viết và phê duyệt xuất bản
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            Xuất báo cáo
          </Button>
          <Button variant="primary" size="sm" className="bg-primary-900 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Soạn bài mới
          </Button>
        </div>
      </div>

      {/* 2. Thanh lọc (Filter Toolbar) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-500 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Trạng thái:
          </span>
          {['ALL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'DRAFT' && 'Bản nháp'}
              {st === 'IN_REVIEW' && 'Chờ duyệt'}
              {st === 'APPROVED' && 'Đã duyệt'}
              {st === 'PUBLISHED' && 'Đã xuất bản'}
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Input
              placeholder="Tìm theo mã bài, tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs pl-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          <span className="text-slate-400 text-xs font-medium">
            Hiển thị {filteredItems.length} / {items.length} bài viết
          </span>
        </div>
      </div>

      {/* 3. Bảng dữ liệu hoặc Trạng thái rỗng */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
          title="Không tìm thấy bài viết nào"
          description="Không có bản ghi nào khớp với điều kiện lọc hiện tại."
          actionLabel="Xóa bộ lọc"
          onAction={() => {
            setStatusFilter('ALL')
            setSearch('')
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Mã bài</th>
                  <th className="px-4 py-3">Tiêu đề bài viết</th>
                  <th className="px-4 py-3">Tác giả</th>
                  <th className="px-4 py-3">Phí đọc lẻ</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{item.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-sm truncate">
                      {item.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.creatorName}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      {item.amount > 0 ? formatCurrency(item.amount) : 'Miễn phí'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge type="article" status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedItemToDelete(item)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Xóa bài"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        to={`/backoffice/editorial/articles/${item.id}`}
                        className="inline-flex items-center px-2 py-1 text-primary-900 font-bold hover:underline"
                      >
                        Chi tiết <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Hộp thoại xác nhận hành động nguy hiểm */}
      <ConfirmDialog
        isOpen={!!selectedItemToDelete}
        title="Xác nhận xóa bài viết"
        description={`Bạn có chắc chắn muốn xóa bài viết "${selectedItemToDelete?.title}"? Thao tác này sẽ không thể khôi phục.`}
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy bỏ"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setSelectedItemToDelete(null)}
      />
    </div>
  )
}
