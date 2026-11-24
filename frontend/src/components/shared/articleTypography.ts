export const ARTICLE_FONTS = {
  georgia: { label: 'Georgia', family: 'Georgia, serif' },
  arial: { label: 'Arial', family: 'Arial, sans-serif' },
  times: { label: 'Times New Roman', family: '"Times New Roman", serif' },
} as const

export const ARTICLE_FONT_SIZES = [14, 16, 18, 20, 24, 28, 32] as const

export function articleFontFamily(value: unknown): string | undefined {
  return typeof value === 'string' && Object.hasOwn(ARTICLE_FONTS, value)
    ? ARTICLE_FONTS[value as keyof typeof ARTICLE_FONTS].family : undefined
}

export function articleFontSize(value: unknown): string | undefined {
  const size = Number(value)
  return ARTICLE_FONT_SIZES.some(allowed => allowed === size) ? `${size / 16}rem` : undefined
}
