// Cùng quy tắc với VnPhone bên backend: trống thì bỏ qua, có nhập thì phải là di động hoặc bàn Việt Nam.
export function vnPhoneError(raw: string): string | null {
  const compact = raw.trim().replace(/[\s.-]/g, '')
  if (!compact) return null
  let local = compact
  if (local.startsWith('+84')) local = `0${local.slice(3)}`
  else if (local.startsWith('84') && local.length > 9) local = `0${local.slice(2)}`
  if (/^0(3|5|7|8|9)\d{8}$/.test(local) || /^02\d{8,9}$/.test(local)) return null
  return 'Số điện thoại không đúng định dạng Việt Nam'
}
