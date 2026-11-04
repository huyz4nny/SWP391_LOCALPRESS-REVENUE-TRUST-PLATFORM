import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { adminApi } from '../api'
import type { AdSlotConfig } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/format'

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên vị trí').max(150, 'Tên tối đa 150 ký tự'),
  basePrice: z.coerce.number().finite().min(0, 'Giá không được âm').max(9999999999.99, 'Giá vượt giới hạn')
    .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.0001, 'Giá tối đa 2 chữ số thập phân'),
  capacity: z.coerce.number().int('Sức chứa phải là số nguyên').min(1, 'Sức chứa tối thiểu 1').max(2147483647),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
type Values = z.infer<typeof schema>

export function AdSlotConfigPage() {
  const [slots, setSlots] = useState<AdSlotConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [revision, setRevision] = useState(0)
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState<AdSlotConfig | null>(null)
  const [saveError, setSaveError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<Values | null>(null)
  const inFlight = useRef(false)
  const { register, reset, handleSubmit, setError, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) })

  useEffect(() => {
    let active = true
    void adminApi.getAdSlots().then(data => {
      if (active) { setSlots(data); setLoadError('') }
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : 'Không tải được danh sách vị trí')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  function reload() {
    if (inFlight.current) return
    setSelected(null); setPending(null); setLoading(true); setLoadError(''); setSuccess('')
    setRevision(value => value + 1)
  }
  function edit(slot: AdSlotConfig) {
    setSelected(slot); setSaveError(''); setSuccess(''); setPending(null)
    reset({ name: slot.name, basePrice: slot.basePrice, capacity: slot.capacity, status: slot.status })
  }
  async function save(values: Values) {
    if (!selected || inFlight.current) return
    inFlight.current = true; setSaving(true); setSaveError('')
    try {
      const saved = await adminApi.updateAdSlot(selected.id, { ...values, expectedRevision: selected.revision })
      setSlots(current => current.map(slot => slot.id === saved.id ? saved : slot))
      setSelected(null)
      setSuccess(`Đã lưu cấu hình ${saved.code}. Thay đổi được ghi vào nhật ký hệ thống.`)
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : 'Không lưu được cấu hình')
    } finally {
      inFlight.current = false; setSaving(false); setPending(null)
    }
  }
  function submit(values: Values) {
    if (!selected || inFlight.current) return
    if (selected.inventoryMode === 'EXCLUSIVE' && values.capacity !== 1) {
      setError('capacity', { message: 'Vị trí độc quyền phải có sức chứa bằng 1' }); return
    }
    if (selected.status === 'ACTIVE' && values.status === 'INACTIVE') setPending(values)
    else void save(values)
  }
  const visible = slots.filter(slot => filter === 'ALL' || slot.status === filter)
  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Cấu hình vị trí quảng cáo</h1>
        <p className="mt-2 text-sm text-slate-600">Quản lý giá cơ sở, sức chứa và trạng thái các vị trí hiện có.</p></div>
      <Button variant="outline" disabled={loading || saving} onClick={reload}>Tải lại danh sách</Button>
    </header>
    <div className="flex items-center gap-3">
      <Label htmlFor="slot-filter">Trạng thái</Label>
      <select id="slot-filter" className="rounded border border-slate-300 bg-white p-2 text-sm" value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="ALL">Tất cả</option><option value="ACTIVE">Đang bật</option><option value="INACTIVE">Đã tắt</option>
      </select>
    </div>
    {success && <p role="status" className="text-emerald-700">{success}</p>}
    {loadError && <p role="alert" className="text-crimson">{loadError}</p>}
    {loading ? <p role="status">Đang tải vị trí quảng cáo...</p> : !loadError && (visible.length === 0
      ? <EmptyState title="Không có vị trí phù hợp" description="Thử đổi bộ lọc trạng thái." />
      : <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr>{['Vị trí', 'Hiển thị', 'Sức chứa', 'Giá cơ sở', 'Trạng thái', 'Thao tác'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
        <tbody>{visible.map(slot => <tr key={slot.id} className="border-t border-slate-200">
          <td className="p-3"><div className="font-semibold">{slot.name}</div><div className="text-xs text-slate-500">{slot.code}</div></td>
          <td className="p-3">{slot.pageLocation}<div className="text-xs text-slate-500">{slot.deviceType} · {slot.dimensions} · {slot.categoryName || 'Tất cả chuyên mục'}</div></td>
          <td className="p-3">{slot.capacity}<div className="text-xs text-slate-500">{slot.inventoryMode === 'EXCLUSIVE' ? 'Độc quyền' : 'Luân phiên'}</div></td>
          <td className="p-3">{formatCurrency(slot.basePrice)}<div className="text-xs text-slate-500">{slot.pricingType}</div></td>
          <td className="p-3"><StatusBadge type="adSlot" status={slot.status} /></td>
          <td className="p-3"><Button size="sm" variant="outline" onClick={() => edit(slot)} aria-label={`Sửa ${slot.code}`}>Chỉnh sửa</Button></td>
        </tr>)}</tbody>
      </table></div>)}
    <Dialog open={selected !== null} title={`Chỉnh sửa ${selected?.code ?? ''}`} onClose={() => { if (!inFlight.current && !pending) setSelected(null) }}>
      {selected && <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <p className="text-sm text-slate-600">{selected.dimensions} · {selected.deviceType} · {selected.inventoryMode === 'EXCLUSIVE' ? 'Độc quyền' : 'Luân phiên'}. Mã và thông số hiển thị được giữ cố định.</p>
        <fieldset disabled={saving || pending !== null} className="space-y-3">
          <div><Label htmlFor="slot-name">Tên vị trí</Label><Input id="slot-name" maxLength={150} {...register('name')} />{errors.name && <p className="text-sm text-crimson">{errors.name.message}</p>}</div>
          <div><Label htmlFor="slot-price">Giá cơ sở (VND / {selected.pricingType})</Label><Input id="slot-price" type="number" min={0} step="0.01" {...register('basePrice')} />{errors.basePrice && <p className="text-sm text-crimson">{errors.basePrice.message}</p>}</div>
          <div><Label htmlFor="slot-capacity">Sức chứa</Label><Input id="slot-capacity" type="number" min={1} step={1} readOnly={selected.inventoryMode === 'EXCLUSIVE'} {...register('capacity')} />{errors.capacity && <p className="text-sm text-crimson">{errors.capacity.message}</p>}</div>
          <div><Label htmlFor="slot-status">Trạng thái</Label><select id="slot-status" className="ml-3 rounded border border-slate-300 bg-white p-2" {...register('status')}><option value="ACTIVE">Đang bật</option><option value="INACTIVE">Đã tắt</option></select></div>
        </fieldset>
        <p className="text-xs text-slate-500">Giá mới không thay đổi báo giá đã gửi/chấp nhận. Không giảm sức chứa dưới lịch giữ chỗ; không tắt vị trí còn booking hiệu lực hiện tại hoặc tương lai.</p>
        {saveError && <div><p role="alert" className="text-crimson">{saveError}</p><Button type="button" variant="outline" onClick={reload}>Tải lại cấu hình</Button></div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving || pending !== null} onClick={() => setSelected(null)}>Hủy</Button><Button type="submit" isLoading={saving} disabled={saving || pending !== null}>Lưu cấu hình</Button></div>
      </form>}
    </Dialog>
    <ConfirmDialog open={pending !== null} title="Tắt vị trí quảng cáo?" message="Vị trí sẽ ngừng nhận booking mới và ngừng phân phối banner. Hệ thống sẽ từ chối nếu còn booking hiệu lực hiện tại hoặc tương lai." confirmText="Tắt và lưu" isDestructive isLoading={saving}
      onClose={() => { if (!inFlight.current) setPending(null) }} onConfirm={() => { if (pending) void save(pending) }} />
  </div>
}
