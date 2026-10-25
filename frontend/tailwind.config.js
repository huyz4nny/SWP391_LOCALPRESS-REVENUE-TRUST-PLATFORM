/** @type {import('tailwindcss').Config} */
// Design tokens theo taste-skill (style "achromatic-ledger", giữ màu & phông brand LocalPress).
// - slate: xám trung tính (không ngả xanh), các bậc chứa chữ đạt >= 4.5:1 trên nền trắng.
// - Không shadow cho vật đứng yên (card, nút, badge); shadow chỉ còn ở lg/xl/2xl cho thứ nổi (dialog, menu).
// - Bo góc 2 mức: 8px cho panel, 6px cho control, 4px cho chip.
// - Dark mode: class 'dark' trên <html> (ThemeToggle), nền xám trung tính thật, không navy.
// slate / stone đọc từ biến CSS (kênh RGB) để dark mode đảo cả thang màu mà không phải sửa class ở từng trang.
// Giá trị sáng / tối nằm ở src/styles/globals.css (:root và .dark).
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const scale = (name) => Object.fromEntries(STEPS.map((n) => [n, `rgb(var(--${name}-${n}) / <alpha-value>)`]))

export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        slate: scale('slate'),
        stone: scale('stone'),
        ground: 'rgb(var(--ground) / <alpha-value>)', // nền backoffice: xám-xanh nhạt của sổ cái (tối: xám trung tính)
        primary: {
          DEFAULT: '#1e3a8a', // Deep Navy
          foreground: '#ffffff',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f172a',
        },
        crimson: {
          DEFAULT: '#991b1b', // Deep Crimson for news accents
          foreground: '#ffffff',
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
        },
        gold: {
          DEFAULT: '#d97706', // Premium badge/gold accent
          foreground: '#ffffff',
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        positive: 'rgb(var(--positive) / <alpha-value>)',
        negative: 'rgb(var(--negative) / <alpha-value>)',
        editorial: {
          bg: '#fafaf9',
          card: '#ffffff',
          paper: '#fdfbf7',
          border: '#e7e5e4',
          muted: '#78716c',
          text: '#1c1917',
        }
      },
      fontFamily: {
        serif: ['"Merriweather"', '"Noto Serif"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        '2xs': 'none',
        xs: 'none',
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        inner: 'none',
        lg: '0 8px 24px rgba(0, 0, 0, 0.08)',
        xl: '0 12px 32px rgba(0, 0, 0, 0.12)',
        '2xl': '0 16px 48px rgba(0, 0, 0, 0.16)',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '8px',
        '2xl': '8px',
      },
    },
  },
  plugins: [],
}
