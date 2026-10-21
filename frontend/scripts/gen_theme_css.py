"""Sinh khối CSS biến màu sáng/tối + ghi đè dark mode cho globals.css.

Chạy ở thư mục frontend:  python scripts/gen_theme_css.py
"""
import sys

def hex2(c):
    c = c.lstrip('#')
    return ' '.join(str(int(c[i:i + 2], 16)) for i in (0, 2, 4))

STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
slate_light = ['#f7f7f8', '#f0f1f2', '#e6e7e9', '#d1d3d6', '#6e7177', '#5f6268', '#4b4e54', '#35373b', '#232427', '#141516', '#0b0b0c']
slate_dark = ['#1d1e21', '#242529', '#2e3034', '#404247', '#8e9198', '#a3a6ac', '#babdc2', '#d0d2d6', '#e4e5e8', '#f2f3f5', '#fafafb']
stone_light = ['#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#0c0a09']
stone_dark = ['#1e1d1b', '#262422', '#302e2b', '#423f3c', '#96918c', '#a8a29d', '#c0bbb6', '#d4d0cc', '#e6e3e0', '#f4f2f0', '#faf9f8']

def vars_block(light):
    sl = slate_light if light else slate_dark
    st = stone_light if light else stone_dark
    out = []
    for n, a, b in zip(STEPS, sl, st):
        out.append(f'    --slate-{n}: {hex2(a)};')
    for n, b in zip(STEPS, st):
        out.append(f'    --stone-{n}: {hex2(b)};')
    return '\n'.join(out)

# Màu nền nhạt / chữ đậm của các sắc độ: trong dark mode đổi sang nền trong suốt + chữ sáng
HUES = {
    'emerald': (16, 185, 129, '#6ee7b7'),
    'green': (34, 197, 94, '#86efac'),
    'amber': (245, 158, 11, '#fcd34d'),
    'yellow': (234, 179, 8, '#fde047'),
    'orange': (249, 115, 22, '#fdba74'),
    'red': (239, 68, 68, '#fca5a5'),
    'rose': (244, 63, 94, '#fda4af'),
    'sky': (14, 165, 233, '#7dd3fc'),
    'blue': (59, 130, 246, '#93c5fd'),
    'indigo': (99, 102, 241, '#a5b4fc'),
    'purple': (168, 85, 247, '#d8b4fe'),
    'teal': (20, 184, 166, '#5eead4'),
    'primary': (96, 140, 235, '#a9c1f5'),
    'crimson': (239, 68, 68, '#fca5a5'),
    'gold': (245, 158, 11, '#fcd34d'),
}

def esc(c):
    return c.replace('[', '\\[').replace(']', '\\]').replace('#', '\\#').replace('/', '\\/').replace(':', '\\:')

rules = []
for hue, (r, g, b, light_text) in HUES.items():
    rules.append(f'  .dark .bg-{hue}-50, .dark .bg-{hue}-100 {{ background-color: rgb({r} {g} {b} / 0.14); }}')
    rules.append(f'  .dark .bg-{hue}-200 {{ background-color: rgb({r} {g} {b} / 0.24); }}')
    rules.append(f'  .dark .border-{hue}-100, .dark .border-{hue}-200, .dark .border-{hue}-300 {{ border-color: rgb({r} {g} {b} / 0.35); }}')
    sel = ', '.join(f'.dark .text-{hue}-{n}' for n in (600, 700, 800, 900, 950))
    rules.append(f'  {sel} {{ color: {light_text}; }}')
# text-primary / text-crimson mặc định
rules.append('  .dark .text-primary, .dark .text-crimson { color: #a9c1f5; }')
rules.append('  .dark .text-crimson { color: #f2a3a3; }')

# Nền và màu tùy biến (arbitrary) đang dùng trong layout & finance
ARBITRARY = {
    'bg-[#fafaf9]': 'background-color: rgb(var(--page));',
    'bg-[#fdfbf7]': 'background-color: rgb(var(--page));',
    'bg-[#e9ecf0]': 'background-color: rgb(var(--slate-100));',
    'hover:bg-[#e9ecf0]:hover': 'background-color: rgb(var(--slate-100));',
    'bg-[#e3e6eb]': 'background-color: rgb(var(--slate-200));',
    'bg-[#dfe7f5]': 'background-color: rgb(96 140 235 / 0.22);',
    'border-[#e1e4e9]': 'border-color: rgb(var(--slate-200));',
    'bg-[#dcfae5]': 'background-color: rgb(16 185 129 / 0.16);',
    'text-[#04250e]': 'color: #86efac;',
    'bg-[#ffedea]': 'background-color: rgb(239 68 68 / 0.16);',
    'text-[#831c1e]': 'color: #fca5a5;',
    'bg-[#fffbeb]': 'background-color: rgb(245 158 11 / 0.12);',
    'text-[#92400e]': 'color: #fcd34d;',
    'ring-[#fde68a]': '--tw-ring-color: rgb(245 158 11 / 0.35);',
    'border-[#fde68a]': 'border-color: rgb(245 158 11 / 0.35);',
    'bg-[#fef3c7]': 'background-color: rgb(245 158 11 / 0.16);',
    'text-[#78350f]': 'color: #fcd34d;',
    'bg-[#e8effc]': 'background-color: rgb(96 140 235 / 0.18);',
    'text-[#1e3a8a]': 'color: #a9c1f5;',
    'bg-[#fff5f4]': 'background-color: rgb(239 68 68 / 0.12);',
    'border-[#f6cfca]': 'border-color: rgb(239 68 68 / 0.35);',
    'bg-[#f0fbf3]': 'background-color: rgb(16 185 129 / 0.12);',
    'border-[#c6ecd2]': 'border-color: rgb(16 185 129 / 0.35);',
    'text-[#14532d]': 'color: #86efac;',
}
for cls, decl in ARBITRARY.items():
    if cls.endswith(':hover'):
        base = cls[:-len(':hover')]
        rules.append(f'  .dark .{esc(base)}:hover {{ {decl} }}')
    else:
        rules.append(f'  .dark .{esc(cls)} {{ {decl} }}')

css = f'''@layer base {{
  /* Thang màu slate/stone (kênh RGB) dùng bởi tailwind.config.js. Sáng: */
  :root {{
{vars_block(True)}
    --ground: 242 244 247;     /* nền backoffice */
    --page: 250 250 249;       /* nền báo giấy ngà */
    --surface: 255 255 255;    /* panel */
    --positive: 36 123 80;
    --negative: 196 36 42;
    --chart-grid: #e7e8ea;
    --chart-axis: #a3a6ab;
    --chart-tick: #5f6268;
    --chart-bar: #1e3a8a;
    color-scheme: light;
  }}

  /* Tối: xám trung tính thật (taste-skill app-screens §9.3), không navy, không slate xanh. */
  .dark {{
{vars_block(False)}
    --ground: 15 16 18;
    --page: 18 17 16;
    --surface: 23 24 26;
    --positive: 74 199 130;
    --negative: 240 110 120;
    --chart-grid: #2a2b2f;
    --chart-axis: #4a4c51;
    --chart-tick: #a3a6ac;
    --chart-bar: #7f9ff0;
    color-scheme: dark;
  }}
}}

/* -----------------------------------------------------------------------------
 * Dark mode ghi đè: các trang của mọi module dùng bg-white và màu nhạt cố định,
 * đổi ở đây để cả site tối theo mà không phải sửa code từng module (Rule 17).
 * --------------------------------------------------------------------------- */
@layer utilities {{
  .dark body {{ background-color: rgb(var(--page)); color: rgb(var(--slate-900)); }}
  .dark .bg-white {{ background-color: rgb(var(--surface)); }}
  .dark .hover\\:bg-white:hover {{ background-color: rgb(var(--slate-50)); }}
  .dark .border-white {{ border-color: rgb(var(--slate-200)); }}
  /* Nền đậm (slate/stone 800-950) đã đảo thành sáng: chữ trắng trên đó phải thành chữ tối */
  .dark :is(.bg-slate-800, .bg-slate-900, .bg-slate-950, .bg-stone-800, .bg-stone-900, .bg-stone-950):is(.text-white),
  .dark :is(.bg-slate-800, .bg-slate-900, .bg-slate-950, .bg-stone-800, .bg-stone-900, .bg-stone-950) .text-white {{ color: rgb(var(--ground)); }}
  .dark .bg-black\\/40 {{ background-color: rgb(0 0 0 / 0.6); }}
  .dark img {{ filter: brightness(0.92); }}
{chr(10).join(rules)}
}}
'''
# Ghi thẳng vào src/styles/globals.css, giữa 2 dòng đánh dấu THEME
START = '/* === THEME (sinh bởi frontend/scripts/gen_theme_css.py, sửa màu ở script rồi chạy lại) === */\n'
END = '/* === HẾT THEME === */\n'
target = sys.argv[1] if len(sys.argv) > 1 else 'src/styles/globals.css'
g = open(target, encoding='utf-8').read()
a, b = g.index(START), g.index(END) + len(END)
open(target, 'w', encoding='utf-8').write(g[:a] + START + css + END + g[b:])
print('Đã cập nhật', target, 'với', len(rules), 'quy tắc dark mode')
