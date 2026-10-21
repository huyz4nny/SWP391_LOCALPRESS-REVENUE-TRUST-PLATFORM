// =============================================================================
// CHỤP MÀN HÌNH THEO TỪNG LUỒNG SWIMLANE SV4 (dùng khi review Iteration)
// =============================================================================
// Chạy frontend ở chế độ mock trước (launch config "frontend-mock-data", cổng 5173), rồi:
//   node docs/sv4/03_tools/capture_screens.mjs                 (giao diện sáng)
//   node docs/sv4/03_tools/capture_screens.mjs --dark          (thêm bộ ảnh giao diện tối)
// Ảnh ra docs/sv4/01_output/screenshots/<luồng>/NN_ten.png, kèm README.md liệt kê từng ảnh.
// Dùng Chrome có sẵn trên máy qua CDP (thư viện của taste-skill), không cài thêm gì.
// =============================================================================

import { Browser, sleep } from '../../../.agents/skills/taste-skill/scripts/lib/cdp.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.LP_BASE_URL || 'http://localhost:5173'
const DARK = process.argv.includes('--dark')
const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(here, '../01_output/screenshots' + (DARK ? '_dark' : ''))
const STORE_KEY = 'localpress_mock_store_haiphong_v4'
const FIN_KEY = 'localpress_finance_wallet_mock_v1'

const shots = [] // { flow, file, caption }

const W = 1440
const H = 1000
const browser = await Browser.launch({ width: W, height: H })
const page = await browser.newPage({ width: W, height: H })

async function go(route, settleMs = 1200) {
  await page.goto(BASE + route, { settleMs })
}

/** Đổi vai trò demo bằng cách sửa currentUserId trong mock store rồi tải lại. */
async function loginAs(userId) {
  await page.eval((args) => {
    const raw = localStorage.getItem(args.key)
    const s = raw ? JSON.parse(raw) : {}
    s.currentUserId = args.userId
    localStorage.setItem(args.key, JSON.stringify(s))
    localStorage.setItem('localpress-theme', args.dark ? 'dark' : 'light')
  }, { key: STORE_KEY, userId, dark: DARK })
}

/** Bấm phần tử đầu tiên (button / a / [role=tab]) có chữ chứa text. */
async function click(text, { exact = false } = {}) {
  const ok = await page.eval((a) => {
    const els = [...document.querySelectorAll('button, a, [role="tab"]')]
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim()
    const el = els.find((e) => (a.exact ? norm(e.textContent) === a.text : norm(e.textContent).includes(a.text)) && !e.disabled)
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, { text, exact })
  if (!ok) console.warn(`  ! không thấy nút "${text}"`)
  await sleep(700)
  return ok
}

async function fill(selector, value) {
  await page.eval((a) => {
    const el = document.querySelector(a.selector)
    if (!el) return
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, a.value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, { selector, value })
}

async function shot(flow, file, caption, { fullPage = false } = {}) {
  const dir = path.join(OUT, flow)
  fs.mkdirSync(dir, { recursive: true })
  await page.eval(() => {
    // Thu nhỏ bảng demo vai trò để không che nội dung ảnh
    const bar = [...document.querySelectorAll('button')].find((b) => b.title === 'Thu nhỏ')
    if (bar) bar.click()
    // Không có dialog thì đưa tiêu đề trang (h1 trong main) lên đầu khung hình
    if (!document.querySelector('[role="dialog"]')) {
      const h1 = document.querySelector('main h1')
      if (h1) window.scrollTo(0, Math.max(0, h1.getBoundingClientRect().top + window.scrollY - 24))
    }
  })
  await sleep(250)
  await page.screenshot({ path: path.join(dir, file), format: 'png', fullPage })
  shots.push({ flow, file, caption })
  console.log(`  ${flow}/${file}`)
}

/** Làm mới 1 đơn mua bài trong mock store: PENDING, tạo lúc này (còn hạn 15 phút). */
async function freshPendingOrder(code) {
  await page.eval((a) => {
    const s = JSON.parse(localStorage.getItem(a.key))
    const o = s.orders.find((x) => x.orderCode === a.code)
    o.paymentStatus = 'PENDING'
    o.createdAt = new Date().toISOString()
    o.updatedAt = o.createdAt
    localStorage.setItem(a.key, JSON.stringify(s))
  }, { key: STORE_KEY, code })
}

async function resetData() {
  await go('/')
  await page.eval((a) => {
    localStorage.removeItem(a.store)
    localStorage.removeItem(a.fin)
  }, { store: STORE_KEY, fin: FIN_KEY })
  // Mock store chỉ ghi xuống localStorage sau lần đổi state đầu tiên: bấm nút đăng nhập demo để có dữ liệu đầy đủ
  await go('/backoffice')
  await click('Demo: đăng nhập Kế toán viên')
}

const READER = 'user-reader-free' // Nguyễn Văn An, chủ đơn LP-202609-106
const STAFF = 'user-fin-staff' // Lê Thị Thu Ngân, kế toán viên (mắt 1)
const MANAGER = 'user-fin-mgr' // Phạm Trưởng Phòng, kế toán trưởng (mắt 2)

try {
  console.log('Chụp vào', OUT)
  await resetData()

  // ---------------------------------------------------------------- 01 Thanh toán chung (mọi đơn trả qua ví)
  const F1 = '01_thanh_toan_chung'
  await loginAs(READER)
  await freshPendingOrder('LP-202609-106')
  await go('/payment/LP-202609-106')
  await sleep(800)
  await shot(F1, '01_vi_thieu_qr_nap_bu.png', 'Đơn 15.000 ₫, ví 0 ₫: trang tự tạo mã QR nạp bù đúng phần còn thiếu, nội dung CK là mã nạp (UC047, UC050)')
  await click('Chuyển thiếu một nửa')
  await sleep(1200)
  await shot(F1, '02_nap_bu_chua_du.png', 'SePay báo về 7.000 ₫: tiền vào ví, đơn vẫn chờ, trang tạo mã nạp bù mới cho 8.000 ₫ còn lại')
  await click('Chuyển đủ')
  await sleep(800)
  await shot(F1, '03_tu_thanh_toan.png', 'Tiền nạp bù đủ: hệ thống tự trừ ví trả đơn, khách không bấm thêm (autoPay PAID, UC049)')
  await click('Bắn lại webhook cùng mã giao dịch')
  await shot(F1, '04_webhook_lap_lai.png', 'Bắn lại webhook cùng mã giao dịch: ALREADY_PROCESSED, không cộng trùng (Rule 5)')
  await go('/payment/LP-202609-107')
  await shot(F1, '05_don_het_han.png', 'Đơn quá 15 phút: "Đơn đã hết hạn thanh toán", tiền đã nạp vẫn nằm trong ví')

  // ---------------------------------------------------------------- 02 Ví & nạp tiền
  const F2 = '02_vi_nap_tien'
  await go('/wallet')
  await shot(F2, '01_vi_localpress.png', 'Ví LocalPress /wallet: số dư và biến động (2 lần nạp bù và 1 lần trừ ví ở luồng 01)')
  await click('Nạp tiền', { exact: false })
  await sleep(500)
  await shot(F2, '02_nap_tien.png', 'Nạp tiền /wallet/topup: chọn nhanh hoặc tự nhập, kiểm tra 10.000 - 50.000.000 ₫, bội số 1.000 (zod)')
  await fill('#amount', '5500')
  await click('qua QR SePay')
  await shot(F2, '03_loi_validate.png', 'Nhập 5.500 ₫: báo lỗi tiếng Việt, không tạo đơn')
  await fill('#amount', '200000')
  await click('qua QR SePay')
  await sleep(800)
  await shot(F2, '04_qr_nap_vi.png', 'Đơn TOPUP mở trang thanh toán chung, chỉ có QR (không có tab Ví)')
  await click('Chuyển đủ')
  await shot(F2, '05_nap_thanh_cong.png', 'SePay xác nhận: cộng đúng số tiền thực nhận vào ví')
  await go('/wallet')
  await shot(F2, '06_vi_sau_khi_nap.png', 'Số dư mới và dòng CREDIT trong lịch sử ví')

  await freshPendingOrder('LP-202609-107')
  await go('/payment/LP-202609-107')
  await shot(F2, '07_vi_du_tra_mot_nut.png', 'Ví đủ tiền: chỉ một nút "Thanh toán bằng ví", không cần QR')
  await click('bằng ví')
  await sleep(800)
  await shot(F2, '08_tra_bang_vi_xong.png', 'Trừ ví xong: đơn đã thanh toán, hiện số dư còn lại')

  // ---------------------------------------------------------------- 03 Khiếu nại (UC051)
  const F3 = '03_khieu_nai'
  await go('/wallet/complaints?orderCode=LP-202609-108&amount=159000')
  await shot(F3, '01_form_khieu_nai.png', 'Khách gửi khiếu nại /wallet/complaints (điền sẵn mã đơn, số tiền khi mở từ trang thanh toán)')
  await fill('#bankReference', 'FT26294518801')
  await fill('#note', 'Chuyển từ Vietcombank lúc 9h sáng')
  await click('Gửi khiếu nại')
  await sleep(600)
  await shot(F3, '02_da_gui.png', 'Gửi thành công: khiếu nại ở trạng thái Chờ đối soát')
  await loginAs(STAFF)
  await go('/backoffice/finance/complaints')
  await shot(F3, '03_hang_cho_ke_toan.png', 'Kế toán mở hàng chờ: Ghi nhận vào đơn / Cộng vào ví / Từ chối')
  await click('Cộng vào ví')
  await shot(F3, '04_xac_nhan_doi_chieu.png', 'Xác nhận đã thấy khoản tiền trên sao kê trước khi ghi nhận')
  await click('Đã khớp sao kê, ghi nhận')
  await click('Đã ghi nhận')
  await shot(F3, '05_da_ghi_nhan.png', 'Khiếu nại RESOLVED, kết quả "Đã cộng vào ví"')

  // ---------------------------------------------------------------- 04 Đối soát
  const F4 = '04_doi_soat'
  await go('/backoffice/finance/reconciliation')
  await shot(F4, '01_ky_doi_soat.png', 'Kỳ đối soát: hệ thống vs sao kê, khoản chênh lệch (UC054)')
  await click('Xử lý', { exact: true })
  await shot(F4, '02_xu_ly_chenh_lech.png', 'Xử lý 1 khoản lệch: bắt buộc ghi chú biện pháp')
  await click('Đánh dấu đã xử lý')
  await sleep(500)
  await shot(F4, '03_da_xu_ly.png', 'Khoản lệch chuyển Đã xử lý; nút Đóng kỳ chỉ cho Kế toán trưởng')

  // ---------------------------------------------------------------- 05 Hoàn tiền 4 mắt
  const F5 = '05_hoan_tien_4_mat'
  await go('/backoffice/finance/refunds')
  await shot(F5, '01_danh_sach_de_xuat.png', 'Danh sách đề xuất hoàn tiền; người lập không có nút duyệt (UC055)')
  await click('Lập đề xuất hoàn tiền')
  await shot(F5, '02_lap_de_xuat.png', 'Mắt 1: kế toán viên lập đề xuất, tối đa bằng số khách đã trả (Rule 11)')
  await page.eval(() => document.querySelector('[role="dialog"] button[class*="absolute"]')?.click())
  await loginAs(MANAGER)
  await go('/backoffice/finance/refunds')
  await click('Xét duyệt')
  await shot(F5, '03_ke_toan_truong_duyet.png', 'Mắt 2: kế toán trưởng xem và duyệt / từ chối (UC055, UC056)')

  // ---------------------------------------------------------------- 06 Báo cáo, sổ quỹ, chứng từ, nhật ký SePay
  const F6 = '06_bao_cao_so_quy'
  await loginAs(STAFF)
  await go('/backoffice/finance')
  await shot(F6, '01_tong_quan.png', 'Tổng quan tài chính: doanh thu thực thu, biểu đồ 14 ngày, việc cần xử lý (UC052)')
  await go('/backoffice/finance/orders')
  await shot(F6, '02_don_thanh_toan.png', 'Danh sách đơn thanh toán: lọc loại, trạng thái, tìm kiếm')
  await go('/backoffice/finance/orders/ORD-101')
  await shot(F6, '03_chi_tiet_don.png', 'Chi tiết đơn đã thanh toán: các lần thanh toán, nút in chứng từ, lập đề xuất hoàn')
  await click('In chứng từ')
  await shot(F6, '04_hoa_don_dien_tu.png', 'Hóa đơn điện tử (UC057)')
  await go('/backoffice/finance/ledger')
  await shot(F6, '05_so_quy.png', 'Sổ quỹ: bút toán Có / Nợ, số dư ròng tính từ các dòng (UC058)')
  await go('/backoffice/finance/sepay')
  await shot(F6, '06_nhat_ky_sepay.png', 'Nhật ký SePay: mỗi khoản tiền SePay báo về có 1 dòng kèm payload gốc (UC048, UC049)')
  await click('Payload')
  await shot(F6, '07_payload_sepay.png', 'Xem payload gốc của 1 lần nhận')

  // ---------------------------------------------------------------- Mục lục
  const FLOW_TITLE = {
    '01_thanh_toan_chung': '01. Trang thanh toán chung, mọi đơn trả qua ví (swimlane 01, UC047 - UC050)',
    '02_vi_nap_tien': '02. Ví LocalPress & nạp tiền (swimlane 02)',
    '03_khieu_nai': '03. Khiếu nại thanh toán chưa ghi nhận (swimlane 03, UC051)',
    '04_doi_soat': '04. Đối soát kỳ (swimlane 04, UC054)',
    '05_hoan_tien_4_mat': '05. Hoàn tiền 4 mắt (swimlane 05, UC055, UC056)',
    '06_bao_cao_so_quy': '06. Tổng quan, đơn, chứng từ, sổ quỹ, nhật ký SePay (swimlane 06, UC052, UC057, UC058, UC048, UC049)',
  }
  let md = `# Ảnh màn hình theo luồng swimlane SV4${DARK ? ' (giao diện tối)' : ''}\n\n`
  md += `> Chụp tự động bằng \`docs/sv4/03_tools/capture_screens.mjs\` ở chế độ dữ liệu mock, 1440x1000. Chụp lại: chạy frontend mock rồi chạy script.\n\n`
  for (const flow of Object.keys(FLOW_TITLE)) {
    md += `## ${FLOW_TITLE[flow]}\n\n`
    for (const s of shots.filter((x) => x.flow === flow)) {
      md += `**${s.file.replace('.png', '')}**: ${s.caption}\n\n![${s.caption}](${flow}/${s.file})\n\n`
    }
  }
  fs.writeFileSync(path.join(OUT, 'README.md'), md)
  console.log(`Xong ${shots.length} ảnh.`)
} finally {
  await browser.close()
}
