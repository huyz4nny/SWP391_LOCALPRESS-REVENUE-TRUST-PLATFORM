import { useEffect, useRef, useState } from 'react'
import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { formatDateTime } from '@/lib/format'

type Entry = { id: string; userName: string; action: string; targetType: string; targetId: string | null; description: string | null; ipAddress: string | null; timestamp: string; result: 'SUCCESS' | 'FAILURE' | 'UNKNOWN' }
type Filters = { actor: string; action: string; target: string; from: string; to: string; result: string }
const empty: Filters = { actor: '', action: '', target: '', from: '', to: '', result: '' }
export function AuditLogsPage() {
  const [draft, setDraft] = useState(empty)
  const [query, setQuery] = useState<{ filters: Filters; cursor?: string }>({ filters: empty })
  const [history, setHistory] = useState<(string | undefined)[]>([])
  const [data, setData] = useState<{ items: Entry[]; nextCursor: string | null }>({ items: [], nextCursor: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const request = useRef(0)
  useEffect(() => {
    const id = ++request.current
    setLoading(true); setError(''); setData({ items: [], nextCursor: null })
    const params = new URLSearchParams()
    Object.entries(query.filters).forEach(([key, value]) => { if (value.trim()) params.set(key, value.trim()) })
    if (query.cursor) params.set('before', query.cursor)
    const load = async () => {
      try {
        if (APP_CONFIG.useMockApi) throw new Error('Tra cứu nhật ký cần API thật.')
        const result = await httpClient.get<{ items: Entry[]; nextCursor: string | null }>(`/admin/audit-logs/search?${params}`)
        if (id === request.current) setData(result)
      } catch (e) {
        if (id === request.current) setError(e instanceof Error ? e.message : 'Không tải được nhật ký')
      } finally { if (id === request.current) setLoading(false) }
    }
    void load()
    return () => { request.current++ }
  }, [query])
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Nhật ký kiểm toán hệ thống</h1>
    <p className="text-sm text-slate-500">Tra cứu toàn bộ sự kiện đã được ghi nhận, 50 sự kiện mỗi trang. Thời gian theo Asia/Ho_Chi_Minh. Nhật ký chưa được phân loại có kết quả “Chưa xác định”.</p>
    <form className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border" onSubmit={e => { e.preventDefault(); setHistory([]); setQuery({ filters: { ...draft } }) }}>
      {([['actor', 'Người thực hiện (tên/email/ID)'], ['action', 'Hành động'], ['target', 'Đối tượng (loại/ID)'], ['from', 'Từ ngày'], ['to', 'Đến ngày']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input className="block border rounded p-2" type={key === 'from' || key === 'to' ? 'date' : 'text'} maxLength={120} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
      <label className="text-sm">Kết quả<select className="block border rounded p-2" value={draft.result} onChange={e => setDraft({ ...draft, result: e.target.value })}><option value="">Tất cả</option><option value="SUCCESS">Thành công</option><option value="FAILURE">Thất bại</option><option value="UNKNOWN">Chưa xác định</option></select></label>
      <button className="border rounded px-4" disabled={loading || !!(draft.from && draft.to && draft.from > draft.to)}>Tìm kiếm</button>
      <button type="button" className="border rounded px-4" disabled={loading} onClick={() => { setDraft(empty); setHistory([]); setQuery({ filters: empty }) }}>Xóa bộ lọc</button>
    </form>
    {draft.from && draft.to && draft.from > draft.to && <p role="alert">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.</p>}
    {loading && <p role="status">Đang tải nhật ký...</p>}
    {error && <div role="alert">{error} <button onClick={() => setQuery({ ...query })}>Thử lại</button></div>}
    {!loading && !error && data.items.length === 0 && <p>Không có sự kiện phù hợp.</p>}
    <div className="overflow-x-auto bg-white border rounded-xl"><table className="w-full text-sm text-left"><thead><tr>{['Mã log', 'Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Kết quả', 'Chi tiết', 'IP'].map(t => <th key={t} className="p-3">{t}</th>)}</tr></thead>
      <tbody>{data.items.map(row => <tr key={row.id} className="border-t"><td className="p-3">{row.id}</td><td className="p-3 whitespace-nowrap">{formatDateTime(row.timestamp)}</td><td className="p-3">{row.userName}</td><td className="p-3">{row.action}</td><td className="p-3">{row.targetType} #{row.targetId ?? '—'}</td><td className="p-3">{{ SUCCESS: 'Thành công', FAILURE: 'Thất bại', UNKNOWN: 'Chưa xác định' }[row.result] ?? 'Chưa xác định'}</td><td className="p-3 max-w-md break-words"><details><summary>Xem chi tiết</summary><pre className="whitespace-pre-wrap break-all">{row.description ?? 'Không có dữ liệu bổ sung'}</pre></details></td><td className="p-3">{row.ipAddress ?? '—'}</td></tr>)}</tbody>
    </table></div>
    <div className="flex gap-4 items-center">
      <button disabled={loading || history.length === 0} onClick={() => { setQuery({ ...query, cursor: history[history.length - 1] }); setHistory(history.slice(0, -1)) }}>Trang trước</button>
      <span>Trang {history.length + 1}</span>
      <button disabled={loading || !!error || !data.nextCursor} onClick={() => { if (data.nextCursor) { setHistory([...history, query.cursor]); setQuery({ ...query, cursor: data.nextCursor }) } }}>Trang sau</button>
    </div>
  </div>
}
