import { useEffect, useState } from 'react'
import { httpClient } from '@/lib/http/client'
import { APP_CONFIG } from '@/app/config'
import { Button } from '@/components/ui/button'

type Row = { id: number; campaign: string; slot: string; targetUrl: string; baselineUrl: string | null; scanStatus: string | null; reviewStatus: string; lastScannedAt: string | null; checkId: number | null; outcome: string | null; resolvedUrl: string | null; detail: string | null; source: string | null }
type History = { id: number; outcome: string; detail: string; resolvedUrl: string | null; checkedAt: string; source: string }
type Schedule = { enabled: boolean; delayMs: number; initialDelayMs: number; minAgeHours: number; batchSize: number }
const sourceLabel = (source: string | null) => source === 'AUTO' ? 'Tự động' : source === 'MANUAL' ? 'Thủ công' : '—'
const base = '/admin/ad-url-monitor'
const labels: Record<string, string> = { SAFE: 'Không có cảnh báo URL', CHANGED: 'Đích URL thay đổi', SUSPICIOUS: 'Cần kiểm tra', OK: 'Truy cập được', ERROR: 'Không kiểm tra được', BLOCKED: 'Bị chặn' }
export function AdUrlMonitorPage() {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<{ row: Row; action: 'ACCEPT' | 'BLOCK' } | null>(null)
  const [note, setNote] = useState('')
  const [history, setHistory] = useState<{ id: number; rows: History[] } | null>(null)
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        if (APP_CONFIG.useMockApi) throw new Error('Giám sát URL cần VITE_USE_MOCK_API=false và backend đang chạy.')
        const [data, settings] = await Promise.all([httpClient.get<Row[]>(base), httpClient.get<Schedule>(`${base}/schedule`)])
        if (active) { setRows(data); setSchedule(settings) }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Không tải được dữ liệu') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [refresh])
  async function perform(row: Row, action: 'scan' | 'resolve') {
    setBusy(row.id); setError('')
    try {
      const updated = await httpClient.post<Row>(`${base}/${row.id}/${action}`, action === 'resolve' ? { checkId: row.checkId, action: selected?.action, note: note.trim() } : {})
      setRows(previous => previous.map(item => item.id === updated.id ? updated : item))
      setSelected(null); setNote(''); setHistory(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Không xử lý được yêu cầu') }
    finally { setBusy(null) }
  }
  async function showHistory(row: Row) {
    setBusy(row.id); setError('')
    try { setHistory({ id: row.id, rows: await httpClient.get<History[]>(`${base}/${row.id}/history`) }) }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được lịch sử') }
    finally { setBusy(null) }
  }
  return <div className="space-y-5">
    <header className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">Giám sát URL quảng cáo</h1>
      <p className="mt-2 text-sm text-slate-600">Kiểm tra thủ công và theo lịch khi backend đang chạy. Cảnh báo URL sẽ tạm loại banner khỏi phân phối cho đến khi được xử lý.</p>
      <p className="text-sm text-slate-600">Kiểm tra kết nối và chuyển hướng, không chứng nhận nội dung không có mã độc. Hiển thị tối đa 200 banner gần nhất.</p></div>
      <Button variant="outline" disabled={loading || busy !== null} onClick={() => { setLoading(true); setError(''); setSelected(null); setHistory(null); setRefresh(n => n + 1) }}>Làm mới dữ liệu</Button></header>
    {schedule && <p role="status" className="rounded border bg-white p-3 text-sm">{schedule.enabled
      ? `Tự động đang bật · chu kỳ ${schedule.delayMs / 1000} giây sau mỗi lượt · tối đa ${schedule.batchSize} banner/lượt · kiểm tra lại sau ${schedule.minAgeHours} giờ. Lượt đầu sau ${schedule.initialDelayMs / 1000} giây từ khi backend khởi động.`
      : 'Quét tự động đang tắt. Bạn vẫn có thể kiểm tra URL thủ công.'}</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Đang tải...</p> : rows.length === 0 ? <p>Chưa có banner.</p> : rows.map(row => <section key={row.id} className="space-y-3 rounded border bg-white p-5">
      <h2 className="font-bold">{row.campaign} · Banner #{row.id}</h2><p>{row.slot}</p>
      <p className="break-all text-sm">URL đăng ký: {row.targetUrl}</p>
      <p className="break-all text-sm">Đích đã duyệt: {row.baselineUrl || row.targetUrl}</p>
      <p className="break-all text-sm">Đích kiểm tra gần nhất: {row.resolvedUrl || '—'}</p>
      <p className="font-semibold">{row.reviewStatus === 'BLOCKED' ? 'Banner đã bị chặn' : labels[row.scanStatus || ''] || 'Chưa kiểm tra URL'}</p>
      <p className="text-sm">{row.lastScannedAt || 'Chưa có thời gian kiểm tra'} · {sourceLabel(row.source)} · {labels[row.outcome || ''] || '—'} · {row.detail}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy !== null} onClick={() => void perform(row, 'scan')}>{busy === row.id ? 'Đang xử lý...' : 'Kiểm tra URL'}</Button>
        <Button variant="outline" disabled={busy !== null || !row.checkId || row.reviewStatus !== 'APPROVED' || !['OK', 'CHANGED'].includes(row.outcome || '')} onClick={() => { setSelected({ row, action: 'ACCEPT' }); setNote('') }}>Xác nhận đích URL</Button>
        <Button variant="outline" disabled={busy !== null || !row.checkId || row.reviewStatus === 'BLOCKED'} onClick={() => { setSelected({ row, action: 'BLOCK' }); setNote('') }}>Chặn banner</Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => void showHistory(row)}>Lịch sử kiểm tra</Button>
      </div>
      {history?.id === row.id && <ul className="space-y-2 border-t pt-3">{history.rows.length === 0 ? <li>Chưa có lịch sử.</li> : history.rows.map(check => <li key={check.id} className="break-all text-sm">{check.checkedAt} · {sourceLabel(check.source)} · {labels[check.outcome] || check.outcome} · {check.detail} · {check.resolvedUrl}</li>)}</ul>}
    </section>)}
    {selected && <div role="dialog" aria-modal="true" aria-labelledby="url-decision-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form className="w-full max-w-lg space-y-4 rounded bg-white p-6" onSubmit={e => { e.preventDefault(); void perform(selected.row, 'resolve') }}>
      <h2 id="url-decision-title" className="text-lg font-bold">{selected.action === 'ACCEPT' ? 'Xác nhận đích URL đã kiểm tra' : 'Chặn banner khỏi phân phối'}</h2>
      <p className="break-all text-sm">{selected.row.resolvedUrl || selected.row.targetUrl}</p>
      <label className="block">Lý do<textarea required maxLength={500} value={note} onChange={e => setNote(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <div className="flex gap-2"><Button type="submit" disabled={busy !== null || !note.trim()}>Xác nhận</Button><Button type="button" variant="outline" disabled={busy !== null} onClick={() => setSelected(null)}>Hủy</Button></div>
    </form></div>}
  </div>
}
