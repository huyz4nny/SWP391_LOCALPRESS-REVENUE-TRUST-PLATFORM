import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Primitive giao diện dùng chung cho các màn hình kế toán SV4 (style "achromatic-ledger" của taste-skill):
 * chrome không màu, số tiền in mực đen bằng chữ số đều cột, màu chỉ đặt trên dữ liệu chính và tín hiệu thay đổi.
 */

export function PageHeader({
  title,
  sub,
  actions,
  back,
}: {
  title: React.ReactNode
  sub?: React.ReactNode
  actions?: React.ReactNode
  back?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && <div className="mb-2 text-[13px] text-slate-500">{back}</div>}
        <h1 className="text-2xl font-semibold leading-8 tracking-[-0.01em] text-slate-900">{title}</h1>
        {sub && <p className="mt-1 text-sm leading-6 text-slate-600">{sub}</p>}
      </div>
      {actions && <div className="flex flex-none flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white', className)}>
      {(title || aside) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {aside && <div className="flex-none text-[13px] text-slate-500">{aside}</div>}
        </div>
      )}
      <div className={cn('px-5 pb-5', !(title || aside) && 'pt-5', bodyClassName)}>{children}</div>
    </section>
  )
}

export interface KpiItem {
  label: string
  value: React.ReactNode
  note?: React.ReactNode
  tone?: 'default' | 'negative' | 'muted'
  lead?: boolean
}

/** Một khung chia bằng đường 1px, nhãn ở trên, số ở dưới. Không icon, không sparkline. */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  const cols = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[items.length] || 'sm:grid-cols-4'
  return (
    <div className={cn('grid grid-cols-1 overflow-hidden rounded-lg border border-slate-200 bg-white', cols)}>
      {items.map((k, i) => (
        <div
          key={k.label}
          className={cn('px-5 py-4', i > 0 && 'border-t border-slate-200 sm:border-t-0 sm:border-l')}
        >
          <div className="text-[13px] text-slate-500">{k.label}</div>
          <div
            className={cn(
              'mt-1 font-semibold num tracking-[-0.01em]',
              k.lead ? 'text-[30px] leading-9' : 'text-2xl leading-8',
              k.tone === 'negative' && 'text-negative',
              k.tone === 'muted' && 'text-slate-500',
              (!k.tone || k.tone === 'default') && 'text-slate-900'
            )}
          >
            {k.value}
          </div>
          {k.note && <div className="mt-1 text-[13px] text-slate-500">{k.note}</div>}
        </div>
      ))}
    </div>
  )
}

/** Bảng: tiêu đề 12px xám sentence case, không dải nền, đường kẻ hàng nhạt, số canh phải. */
export const tableCls = {
  table: 'w-full text-left text-sm',
  thead: 'text-xs text-slate-500',
  th: 'h-10 px-3 font-normal first:pl-5 last:pr-5 whitespace-nowrap border-b border-slate-200',
  thNum: 'h-10 px-3 font-normal text-right first:pl-5 last:pr-5 whitespace-nowrap border-b border-slate-200',
  tr: 'border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50',
  td: 'h-12 px-3 py-2.5 align-middle first:pl-5 last:pr-5 text-slate-700',
  tdNum: 'h-12 px-3 py-2.5 align-middle text-right first:pl-5 last:pr-5 num text-slate-900',
  code: 'font-mono text-[13px] text-slate-900 whitespace-nowrap',
}

/** Thanh chọn phân đoạn cho bộ lọc: rộng bằng các lựa chọn, pill trắng cho mục đang chọn. */
export function Segmented<T extends string | undefined>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string; count?: number }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-md bg-slate-200/70 p-0.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.label}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'h-7 flex-none whitespace-nowrap rounded-[5px] px-3 text-[13px] transition-colors cursor-pointer',
              active ? 'bg-white font-medium text-slate-900 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 text-slate-500 num">{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Hàng nhãn - giá trị trong panel chi tiết. */
export function KeyValue({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="flex-none text-sm text-slate-500">{label}</dt>
      <dd className={cn('min-w-0 text-right text-sm', strong ? 'font-semibold text-slate-900' : 'text-slate-900')}>{children}</dd>
    </div>
  )
}

/** Thông báo trong khối: lỗi, cảnh báo hoặc ghi chú. Không phải nền trang. */
export function Notice({ tone = 'note', children }: { tone?: 'note' | 'warning' | 'error' | 'success'; children: React.ReactNode }) {
  const tones = {
    note: 'bg-slate-50 text-slate-700 border-slate-200',
    warning: 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]',
    error: 'bg-[#fff5f4] text-[#831c1e] border-[#f6cfca]',
    success: 'bg-[#f0fbf3] text-[#14532d] border-[#c6ecd2]',
  }
  return <div className={cn('rounded-md border px-3.5 py-2.5 text-sm leading-6', tones[tone])}>{children}</div>
}

/** Khung chờ tải: giữ bố cục cuối cùng, thay số bằng thanh xám đúng kích thước. */
export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-5 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  )
}
