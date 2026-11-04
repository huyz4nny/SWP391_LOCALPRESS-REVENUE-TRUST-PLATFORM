export function toCsv(rows: Record<string, string | number>[], headers: [string, string][]): string {
  const cell = (value: string | number) => {
    let text = String(value)
    if (typeof value === 'string' && /^[=+@\-\t\r]/.test(text)) text = `'${text}`
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return (
    '\uFEFF' +
    [
      headers.map(([, label]) => cell(label)).join(','),
      ...rows.map((row) => headers.map(([key]) => cell(row[key] ?? '')).join(',')),
    ].join('\r\n')
  )
}
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
