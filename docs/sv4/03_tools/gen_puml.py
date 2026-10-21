"""Generate the SV4 swimlane PlantUML sources (English + Vietnamese) from ONE bilingual definition.

Usage (from repo root):  python docs/sv4/03_tools/gen_puml.py
Output: docs/sv4/02_source/swimlane_sv4_*.puml and docs/sv4/02_source/vi/swimlane_sv4_*_vi.puml
Then render PNG: python docs/sv4/03_tools/render_puml.py <file.puml>

Syntax inside the definitions:
  «english text§vietnamese text»  -> picked per language
  |C|  on its own line            -> lane switch (keys in LANES)
Every flow below was checked against the code in backend/.../finance and frontend/src/features/finance.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1] / "02_source"

HEADER = """scale max 4000 width
skinparam backgroundColor white
skinparam shadowing false
skinparam defaultFontName Arial
skinparam defaultFontSize 12
skinparam ArrowColor #000000
skinparam conditionStyle InsideDiamond
skinparam roundCorner 0
skinparam swimlane {
  BorderColor #000000
  TitleBackgroundColor #66BBE2
  TitleFontStyle bold
}
skinparam activity {
  BackgroundColor white
  BorderColor #000000
  DiamondBackgroundColor #FFF8DC
  DiamondBorderColor #000000
}
skinparam note {
  BackgroundColor #FFFFE0
  BorderColor #999999
}"""

LANES = {
    "C": ("Customer", "Khách hàng"),
    "P": ("Payment Page", "Trang thanh toán"),
    "B": ("LocalPress Backend", "Hệ thống LocalPress"),
    "S": ("SePay / Bank", "SePay / Ngân hàng"),
    "A": ("Accountant", "Kế toán"),
    "M": ("Chief Accountant", "Kế toán trưởng"),
    "K": ("Bank Statement", "Sao kê ngân hàng"),
    "X": ("SV1 / SV3 Modules", "Module SV1 / SV3"),
}

D = {}

# ---------------------------------------------------------------------------------------------
D["swimlane_sv4_00_overview"] = dict(
    title="«SV4-00 Overview: Payment (always via wallet), Complaint and Refund§SV4-00 Tổng quan: Thanh toán (luôn qua ví), Khiếu nại và Hoàn tiền»"
          "\\n<size:11>«Summary only - every branch is detailed in SV4-01 .. SV4-06§Bản tóm tắt - chi tiết từng nhánh xem SV4-01 .. SV4-06»</size>",
    lanes="CBSAM",
    body=r"""
|C|
start
:«Choose article / plan / booking
or click "Top Up"§Chọn bài viết / gói / booking
hoặc bấm "Nạp tiền"»;
|B|
:«Create PENDING order (UC047)
expires in 15 min§Tạo đơn PENDING (UC047)
hết hạn sau 15 phút»;
|C|
:«Open shared payment page
/payment/:orderCode§Mở trang thanh toán chung
/payment/:orderCode»;
|B|
if («Wallet balance >= amount?§Số dư ví >= số tiền?») then («yes§đủ»)
  |C|
  :«Click "Pay with wallet"§Bấm "Thanh toán bằng ví"»;
else («no§thiếu»)
  |B|
  :«Create top-up QR for the shortfall
(content = top-up code)§Tạo QR nạp bù đúng phần thiếu
(nội dung = mã nạp)»;
  |C|
  :«Scan QR and transfer§Quét QR, chuyển khoản»;
  |S|
  :«Send webhook (UC048, UC049)§Gửi webhook (UC048, UC049)»;
  |B|
  :«Credit wallet once
(sepay_id UNIQUE, Rule 5)§Cộng ví đúng 1 lần
(sepay_id UNIQUE, Rule 5)»;
endif
|B|
:«Debit wallet, order SUCCESS,
publish PaymentSuccessEvent§Trừ ví, đơn SUCCESS,
phát PaymentSuccessEvent»;
|C|
if («Transferred > 15 min
but not recorded?§Đã chuyển > 15 phút
mà chưa ghi nhận?») then («yes§có»)
  :«Submit complaint (UC051)§Gửi khiếu nại (UC051)»;
  |A|
  :«Match bank statement (SV4-03)§Đối chiếu sao kê (SV4-03)»;
  if («Money found?§Thấy tiền
trên sao kê?») then («yes§có»)
    |B|
    :«Record to order
or credit wallet§Ghi nhận vào đơn
hoặc cộng ví»;
  else («no§không»)
    |A|
    :«Reject with reason§Từ chối, ghi lý do»;
  endif
else («no§không»)
  |C|
  :«Payment recorded normally§Thanh toán đã được ghi nhận»;
endif
|A|
if («Refund requested
(via support)?§Khách yêu cầu hoàn
(qua hỗ trợ)?») then («no§không»)
  |C|
  :«Keep purchased rights§Giữ quyền lợi đã mua»;
else («yes§có»)
  |A|
  :«1st eye: propose refund (UC055)
within cap (Rule 11)§Mắt 1: lập đề xuất hoàn (UC055)
trong hạn mức (Rule 11)»;
  |M|
  if («2nd eye
approves?§Mắt 2
duyệt?») then («yes§duyệt»)
    |B|
    :«REFUND transaction, publish
event: SV1 / SV3 revoke rights§Tạo giao dịch REFUND, phát
sự kiện: SV1 / SV3 thu hồi quyền»;
  else («no§từ chối»)
    |M|
    :«REJECTED,
customer keeps rights§REJECTED,
khách giữ quyền lợi»;
  endif
endif
|C|
:«Receive final result§Nhận kết quả cuối cùng»;
stop
""")

# ---------------------------------------------------------------------------------------------
D["swimlane_sv4_01_payment"] = dict(
    title="«SV4-01 Shared Payment Page /payment/:orderCode, always via wallet (UC047 - UC050)§SV4-01 Trang thanh toán chung /payment/:orderCode, luôn qua ví (UC047 - UC050)»",
    lanes="CPBSX",
    body=r"""
|C|
start
:«Click Buy in the source module
(article / plan / booking)§Bấm Mua ở module nguồn
(bài / gói / booking)»;
|X|
:«Create pending record
(purchase / subscription / campaign)§Tạo bản ghi chờ
(purchase / subscription / campaign)»;
|B|
:«Create PENDING order (UC047)
code LP..., expires in 15 min§Tạo đơn PENDING (UC047)
mã LP..., hết hạn sau 15 phút»;
note right
POST /api/v1/finance/orders
«user from login session,
not from X-User-Id§user lấy từ phiên đăng nhập,
không nhận X-User-Id»
end note
|P|
if («Logged in?§Đã đăng nhập?») then («yes§rồi»)
else («no§chưa»)
  |C|
  :«Log in, return to this page§Đăng nhập, quay lại trang này»;
endif
|B|
:«Load order by code (UC050)§Tải đơn theo mã (UC050)»;
switch («Order state?§Trạng thái đơn?»)
case («not the owner§không phải chủ đơn»)
  :«403 Forbidden (Rule 14)§403 Forbidden (Rule 14)»;
case («already SUCCESS§đã SUCCESS»)
  |P|
  :«Show "Paid" result§Hiện kết quả "Đã thanh toán"»;
case («expired / FAILED§hết hạn / FAILED»)
  |P|
  :«Show "Code expired": create new order,
check wallet or file complaint§Hiện "Mã đã hết hạn": tạo đơn mới,
kiểm tra ví hoặc gửi khiếu nại»;
case («PENDING, in time§PENDING còn hạn»)
  |P|
  :«Show order, wallet balance,
amount and hold countdown§Hiện đơn, số dư ví,
số tiền và thời gian giữ đơn»;
  note right
  «Every purchase is paid from the
LocalPress Wallet (since 22/10/2026)§Mọi đơn mua đều trả bằng
Ví LocalPress (từ 22/10/2026)»
  end note
  |B|
  if («Balance >= amount?§Số dư >= số tiền?») then («yes§đủ»)
    |P|
    :«Show one button
"Pay X with wallet"§Hiện 1 nút
"Thanh toán X bằng ví"»;
    |C|
    :«Click pay§Bấm thanh toán»;
    |B|
    :«pay-with-wallet:
lock order + wallet,
re-check owner,
expiry, balance§pay-with-wallet:
khóa đơn + ví,
kiểm tra lại chủ đơn,
hạn, số dư»;
    if («All valid?§Hợp lệ?») then («yes§có»)
      :«Debit wallet, order SUCCESS
(method WALLET)§Trừ ví, đơn SUCCESS
(phương thức WALLET)»;
    else («no§không»)
      :«402 / 403 / 410,
rollback, order
stays PENDING§402 / 403 / 410,
rollback, đơn
vẫn PENDING»;
    endif
  else («no§thiếu»)
    :«shortfall-topup: create (or reuse)
TOPUP = amount - balance,
topup_for_order = order code§shortfall-topup: tạo (hoặc dùng lại)
TOPUP = số tiền - số dư,
topup_for_order = mã đơn»;
    |P|
    :«Show "Scan QR to top up X"
(content = top-up code)§Hiện "Quét QR nạp bù X"
(nội dung = mã nạp)»;
    |C|
    :«Scan QR and transfer§Quét QR, chuyển khoản»;
    |S|
    :«Send webhook§Gửi webhook»;
    |B|
    switch («Webhook result (UC048, UC049)?§Kết quả webhook (UC048, UC049)?»)
    case («wrong key /\nno code /\nresent§sai key /\nkhông có mã /\ngửi lại»)
      :«Nothing recorded:
401 wrong key,
ORDER_NOT_FOUND
(-> complaint SV4-03),
ALREADY_PROCESSED§Không ghi nhận gì:
401 sai key,
ORDER_NOT_FOUND
(-> khiếu nại SV4-03),
ALREADY_PROCESSED»;
    case («top-up received§tiền nạp về»)
      :«Credit wallet with the amount
actually received (log sepay_id)§Cộng ví đúng số tiền thực nhận
(ghi nhật ký sepay_id)»;
      if («Order PENDING, in time
and wallet >= amount?§Đơn còn chờ, còn hạn
và ví >= số tiền?») then («yes§có»)
        :«Auto debit wallet,
order SUCCESS (autoPay PAID)§Tự trừ ví,
đơn SUCCESS (autoPay PAID)»;
      else («no§không»)
        :«Money stays in wallet:
INSUFFICIENT -> new QR for the rest,
ORDER_EXPIRED -> create a new order§Tiền giữ trong ví:
INSUFFICIENT -> QR mới cho phần còn lại,
ORDER_EXPIRED -> tạo đơn mới»;
      endif
    endswitch
    note right
    «Transfers made with the order code
itself (old way / complaint) are
still processed: full -> SUCCESS,
short / late -> wallet§Chuyển thẳng vào mã đơn
(cách cũ / khiếu nại) vẫn được xử lý:
đủ -> SUCCESS, thiếu / muộn -> ví»
    end note
  endif
  |P|
  :«Poll status every 3 s or
"I have paid, check again"
(asks SePay API, UC050)§Hỏi trạng thái mỗi 3 giây hoặc
"Tôi đã chuyển khoản, kiểm tra lại"
(hỏi API SePay, UC050)»;
  |B|
  if («Order SUCCESS?§Đơn SUCCESS?») then («yes§có»)
    :«Publish PaymentSuccessEvent
(transaction = ledger line)§Phát PaymentSuccessEvent
(giao dịch = dòng sổ quỹ)»;
    |X|
    :«@EventListener: grant reading
rights / activate ad§@EventListener: mở quyền đọc /
kích hoạt quảng cáo»;
    note right
    «Not in code yet:
SV1 / SV3 must write it§Chưa có trong code:
SV1 / SV3 phải tự viết»
    end note
  else («no§không»)
    |P|
    :«Keep waiting until paid
or the order expires§Tiếp tục chờ đến khi trả đủ
hoặc đơn hết hạn»;
  endif
endswitch
|C|
:«See payment result§Xem kết quả thanh toán»;
stop
""")

# ---------------------------------------------------------------------------------------------
D["swimlane_sv4_02_wallet_topup"] = dict(
    title="«SV4-02 Top Up LocalPress Wallet via SePay QR§SV4-02 Nạp tiền Ví LocalPress qua QR SePay»"
          "\\n<size:11>«Top-up money is a liability to the customer, not revenue (Rule 16)§Tiền nạp là công nợ phải trả khách, không phải doanh thu (Rule 16)»</size>",
    lanes="CPBS",
    body=r"""
|C|
start
:«Click "Top Up" in the header
(free top-up; shortfall top-ups
are created by SV4-01)§Bấm "Nạp tiền" trên header
(nạp tự do; nạp bù cho đơn
do SV4-01 tạo)»;
|P|
if («Logged in?§Đã đăng nhập?») then («yes§rồi»)
else («no§chưa»)
  |C|
  :«Log in, return to /wallet/topup§Đăng nhập, quay lại /wallet/topup»;
endif
|P|
:«Pick a preset (50k - 1M)
or enter an amount§Chọn mức có sẵn (50k - 1tr)
hoặc tự nhập số tiền»;
if («10,000 - 50,000,000 VND,
multiple of 1,000?§10.000 - 50.000.000 đ,
bội số 1.000?») then («invalid§không hợp lệ»)
  |P|
  :«Show validation error§Báo lỗi nhập liệu»;
else («valid§hợp lệ»)
  |B|
  :«Re-check limits, create TOPUP
order PENDING (15 min)§Kiểm tra lại hạn mức, tạo đơn
TOPUP PENDING (15 phút)»;
  note right
  «Out of range or decimal -> 400§Ngoài hạn mức hoặc số lẻ -> 400»
  end note
  |P|
  :«Open /payment/:orderCode
(QR only, no wallet option)§Mở /payment/:orderCode
(chỉ có QR, không trả bằng ví)»;
  |C|
  :«Scan QR and transfer§Quét QR, chuyển khoản»;
  |S|
  :«Send IPN webhook§Gửi webhook IPN»;
  |B|
  switch («Webhook result?§Kết quả webhook?»)
  case («wrong API key§sai API key»)
    :«401, wallet unchanged§401, ví không đổi»;
  case («already SUCCESS§đã SUCCESS»)
    :«ALREADY_PROCESSED
no second credit (Rule 5)§ALREADY_PROCESSED
không cộng lần 2 (Rule 5)»;
  case («first time§lần đầu»)
    :«TOPUP SUCCESS, credit the amount
actually received (even after QR expiry),
wallet_entries CREDIT§TOPUP SUCCESS, cộng đúng số tiền
thực nhận (kể cả sau hạn QR),
ghi wallet_entries CREDIT»;
    note right
    UNIQUE(transaction_id, direction)
    «blocks a second credit.
Shortfall top-up (topup_for_order):
then auto-pay the order (SV4-01)§chặn cộng 2 lần.
Nạp bù (topup_for_order):
sau đó tự trả đơn (SV4-01)»
    end note
  endswitch
  |P|
  if («Polling: order SUCCESS?§Polling: đơn SUCCESS?») then («yes§có»)
    :«Show new balance, back to /wallet
or to the order being paid§Hiện số dư mới, quay lại /wallet
hoặc đơn đang thanh toán»;
  else («no§không»)
    :«Keep waiting; after 15 min
show "Create new top-up code"§Tiếp tục chờ; quá 15 phút
hiện "Tạo mã nạp mới"»;
  endif
endif
|C|
:«See wallet balance and history§Xem số dư và lịch sử ví»;
stop
""")

# ---------------------------------------------------------------------------------------------
D["swimlane_sv4_03_complaint"] = dict(
    title="«SV4-03 Unrecorded Payment Complaint (UC051)§SV4-03 Khiếu nại thanh toán chưa ghi nhận (UC051)»"
          "\\n<size:11>«Replaces manual transfer approval - no manual \"mark as PAID\"§Thay cho duyệt chuyển khoản thủ công - không có nút \"đánh dấu đã thanh toán\"»</size>",
    lanes="CBAK",
    body=r"""
|C|
start
:«Open /wallet/complaints
(or link on the payment page)§Mở /wallet/complaints
(hoặc link trên trang thanh toán)»;
:«Enter order code (optional), amount,
transfer time, bank transaction id§Nhập mã đơn (không bắt buộc), số tiền,
thời gian chuyển, mã GD ngân hàng»;
|B|
switch («Check complaint?§Kiểm tra khiếu nại?»)
case («missing / invalid field§thiếu / sai dữ liệu»)
  :«400 validation error§400 lỗi nhập liệu»;
case («bank tx id used before§mã GD đã khiếu nại»)
  :«409 duplicate§409 trùng khiếu nại»;
case («order not found /\nnot own order§không thấy đơn /\nkhông phải đơn của mình»)
  :«404 / 403§404 / 403»;
case («valid§hợp lệ»)
  :«Save complaint OPEN,
alert COMPLAINT_OPEN (UC060)§Lưu khiếu nại OPEN,
cảnh báo COMPLAINT_OPEN (UC060)»;
  |A|
  :«Open complaint queue
(finance staff only, others 403)§Mở hàng chờ khiếu nại
(chỉ kế toán, người khác 403)»;
  note right
  «Complaint no longer OPEN -> 409§Khiếu nại không còn OPEN -> 409»
  end note
  |K|
  :«Bank statement§Sao kê ngân hàng»;
  |A|
  :«Match bank tx id + amount,
pick an action§Đối chiếu mã GD + số tiền,
chọn thao tác»;
  |B|
  switch («Accountant action?§Kế toán chọn?»)
  case («record to order§ghi nhận vào đơn»)
    switch («Run webhook logic (UC049)?§Chạy logic webhook (UC049)?»)
    case («no order code§không có mã đơn»)
      :«400: choose wallet instead,
complaint stays OPEN§400: hãy chọn cộng ví,
khiếu nại vẫn OPEN»;
    case («order already SUCCESS§đơn đã SUCCESS»)
      :«409: choose wallet instead,
complaint stays OPEN§409: hãy chọn cộng ví,
khiếu nại vẫn OPEN»;
    case («full / under / late§đủ / thiếu / muộn»)
      :«RESOLVED: order SUCCESS
or money to wallet§RESOLVED: đơn SUCCESS
hoặc tiền vào ví»;
    endswitch
  case («credit wallet§cộng vào ví»)
    if («Order still PENDING
and in time?§Đơn còn PENDING
và còn hạn?») then («yes§có»)
      :«409: must record to order
(avoid double count)§409: phải ghi nhận vào đơn
(tránh ghi 2 lần)»;
    else («no§không»)
      :«RESOLVED: credit wallet,
code CMP-ref, only once§RESOLVED: cộng ví,
mã CMP-mãGD, chỉ 1 lần»;
    endif
  case («reject§từ chối»)
    if («Reason entered?§Có nhập lý do?») then («yes§có»)
      :«REJECTED with reason§REJECTED kèm lý do»;
    else («no§không»)
      :«400: reason required§400: bắt buộc nhập lý do»;
    endif
  endswitch
endswitch
|C|
:«See complaint status
at /wallet/complaints§Xem trạng thái khiếu nại
tại /wallet/complaints»;
stop
""")

# ---------------------------------------------------------------------------------------------
D["swimlane_sv4_04_reconciliation"] = dict(
    title="«SV4-04 Bank Reconciliation (UC054) and Advertiser Receivables (UC053)§SV4-04 Đối soát ngân hàng (UC054) và Công nợ doanh nghiệp (UC053)»",
    lanes="ABKM",
    body=r"""
|A|
start
:«Open /backoffice/finance/reconciliation§Mở /backoffice/finance/reconciliation»;
|B|
:«System total of the month: SUCCESS,
excluding REFUND and WALLET payments§Tổng hệ thống trong tháng: SUCCESS,
bỏ REFUND và đơn trả bằng ví»;
|K|
:«Gateway / statement total§Tổng cổng thanh toán / sao kê»;
note right
«Demo: statement total = system total,
discrepancy list is sample data§Demo: tổng sao kê = tổng hệ thống,
danh sách chênh lệch là dữ liệu mẫu»
end note
|B|
:«List discrepancies, period status
OPEN / RECONCILED / CLOSED§Liệt kê chênh lệch, trạng thái kỳ
OPEN / RECONCILED / CLOSED»;
|A|
while («UNRESOLVED item\nand period open?§Còn mục UNRESOLVED\nvà kỳ chưa chốt?») is («yes§còn»)
  :«Investigate: complaint (UC051),
refund (UC055) or explain§Xử lý: khiếu nại (UC051),
hoàn tiền (UC055) hoặc giải trình»;
  :«Enter resolution note§Nhập ghi chú xử lý»;
  |B|
  :«Mark RESOLVED
(who, when, note)§Đánh dấu RESOLVED
(ai, lúc nào, ghi chú)»;
  |A|
endwhile («no§hết»)
:«View advertiser receivables (UC053)§Xem công nợ doanh nghiệp (UC053)»;
note right
«API /finance/receivables only,
no screen yet§Mới có API /finance/receivables,
chưa có màn hình»
end note
|B|
switch («Debt group per campaign?§Nhóm nợ từng chiến dịch?»)
case («paid in full§đã trả đủ»)
  :«PAID_IN_FULL§PAID_IN_FULL»;
case («before end date§chưa tới ngày kết thúc»)
  :«IN_TERM§IN_TERM»;
case («past end date§quá ngày kết thúc»)
  :«OVERDUE + days overdue,
alert DEBT_OVERDUE (UC060)§OVERDUE + số ngày quá hạn,
cảnh báo DEBT_OVERDUE (UC060)»;
endswitch
|A|
:«Click "Close period"§Bấm "Chốt kỳ"»;
if («Chief accountant role?§Là Kế toán trưởng?») then («no§không»)
  |A|
  :«Blocked: chief accountant only§Bị chặn: chỉ Kế toán trưởng được chốt»;
else («yes§đúng»)
  |M|
  :«Confirm closing
(warned if discrepancy left)§Xác nhận chốt kỳ
(cảnh báo nếu còn chênh lệch)»;
  |B|
  :«Period CLOSED,
resolving is locked§Kỳ CLOSED,
khóa xử lý chênh lệch»;
endif
|A|
:«See period status§Xem trạng thái kỳ đối soát»;
stop
""")

# ---------------------------------------------------------------------------------------------
D["swimlane_sv4_05_refund"] = dict(
    title="«SV4-05 Four-Eyes Refund and Rights Adjustment (UC055, UC056)§SV4-05 Hoàn tiền 4 mắt và Điều chỉnh quyền (UC055, UC056)»",
    lanes="CAMBX",
    body=r"""
|C|
start
:«Ask for a refund via support
(outside the system)§Yêu cầu hoàn tiền qua hỗ trợ
(ngoài hệ thống)»;
|A|
:«1st eye: order detail (PAID) -> "Propose refund"
or Refund page: pick order, amount, reason§Mắt 1: chi tiết đơn (PAID) -> "Lập đề xuất hoàn"
hoặc trang Hoàn tiền: chọn đơn, số tiền, lý do»;
|B|
switch («Check proposal (UC055)?§Kiểm tra đề xuất (UC055)?»)
case («not SUCCESS /\nTOPUP / REFUND§chưa SUCCESS /\nTOPUP / REFUND»)
  :«400 rejected§400 từ chối»;
case («amount > remaining cap§số tiền > hạn mức còn lại»)
  :«400 Refund Cap (Rule 11)§400 Refund Cap (Rule 11)»;
case («valid§hợp lệ»)
  :«Create refund PENDING
(counts toward the cap)§Tạo yêu cầu hoàn PENDING
(tính vào hạn mức)»;
  note right
  «remaining cap = paid amount
- (PENDING + APPROVED + COMPLETED)§hạn mức còn lại = số tiền đã thu
- (PENDING + APPROVED + COMPLETED)»
  end note
  |M|
  :«2nd eye: open request,
approve or reject§Mắt 2: mở yêu cầu,
duyệt hoặc từ chối»;
  |B|
  switch («Review result?§Kết quả duyệt?»)
  case («reviewer = proposer§người duyệt = người lập»)
    :«403 Four-Eyes,
request stays PENDING§403 nguyên tắc 4 mắt,
yêu cầu vẫn PENDING»;
  case («already reviewed§đã xử lý trước đó»)
    :«409, nothing changes§409, không đổi gì»;
  case («rejected§từ chối»)
    :«REJECTED, cap released,
customer keeps rights§REJECTED, trả lại hạn mức,
khách giữ quyền lợi»;
  case («approved§duyệt»)
    :«COMPLETED, create REFUND
transaction (reversal entry)§COMPLETED, tạo giao dịch
REFUND (bút toán đảo)»;
    if («Paid with wallet?§Đơn trả bằng ví?») then («yes§có»)
      :«Credit refund back
to customer wallet§Cộng tiền hoàn
lại vào ví khách»;
    else («no (SePay QR)§không (QR SePay)»)
      :«Money returned to
customer outside system§Chuyển trả tiền cho
khách ngoài hệ thống»;
    endif
    if («Total refunded
>= paid amount?§Tổng đã hoàn
>= số tiền đã thu?») then («yes§có»)
      :«Original order REFUNDED§Đơn gốc chuyển REFUNDED»;
    else («no§không»)
      :«Original stays SUCCESS
(partial refund)§Đơn gốc giữ SUCCESS
(hoàn một phần)»;
    endif
  endswitch
endswitch
|B|
if («Refund COMPLETED?§Hoàn tiền COMPLETED?») then («yes§có»)
  :«Publish RefundCompletedEvent
(type, targetId, fullRefund)§Phát RefundCompletedEvent
(loại đơn, targetId, fullRefund)»;
  note right
  «Rule 17: SV4 does not update
SV1 / SV3 tables§Rule 17: SV4 không sửa
bảng của SV1 / SV3»
  end note
  |X|
  :«@EventListener (UC056): full refund -> SV3 revokes
article / plan, SV1 suspends ad; partial -> keep rights§@EventListener (UC056): hoàn toàn bộ -> SV3 thu hồi
bài / gói, SV1 dừng quảng cáo; hoàn một phần -> giữ quyền»;
  note right
  «Not in code yet:
SV1 / SV3 must write it§Chưa có trong code:
SV1 / SV3 phải tự viết»
  end note
else («no§không»)
  |B|
  :«No event,
rights unchanged§Không phát sự kiện,
quyền giữ nguyên»;
endif
|C|
:«Receive refund result§Nhận kết quả hoàn tiền»;
stop
""")

# ---------------------------------------------------------------------------------------------
D["swimlane_sv4_06_reports"] = dict(
    title="«SV4-06 Dashboard, Ledger, Documents, Reports, Alerts (UC052, UC057 - UC060)§SV4-06 Dashboard, Sổ quỹ, Chứng từ, Báo cáo, Cảnh báo (UC052, UC057 - UC060)»",
    lanes="ABM",
    body=r"""
|A|
start
:«Log in to finance back office§Đăng nhập backoffice tài chính»;
|B|
:«Cash flow dashboard (UC052): revenue = SUCCESS
excluding REFUND and TOPUP, order counts§Dashboard dòng tiền (UC052): doanh thu = SUCCESS
bỏ REFUND và TOPUP, số lượng đơn»;
|A|
:«Open ledger (UC058): filter by status,
type, method, date, keyword§Mở sổ quỹ (UC058): lọc trạng thái,
loại, phương thức, ngày, từ khóa»;
|B|
:«Summary: gross, refunded, net§Tổng hợp: tổng thu, đã hoàn, thuần»;
|A|
:«Open an order detail§Mở chi tiết một đơn»;
if («Order PAID (SUCCESS)?§Đơn PAID (SUCCESS)?») then («yes§có»)
  :«Print invoice / document (UC057)
or propose refund (SV4-05)§In hóa đơn / chứng từ (UC057)
hoặc lập đề xuất hoàn (SV4-05)»;
else («no§không»)
  :«No invoice button
(PENDING / FAILED / REFUNDED)§Không có nút in hóa đơn
(PENDING / FAILED / REFUNDED)»;
endif
|B|
:«Alerts (UC060): refunds PENDING,
complaints OPEN, overdue ad debt§Cảnh báo (UC060): hoàn tiền PENDING,
khiếu nại OPEN, nợ quảng cáo quá hạn»;
note right
«API /finance/alerts only, no screen yet§Mới có API /finance/alerts, chưa có màn hình»
end note
|A|
if («Any alert?§Có cảnh báo?») then («yes§có»)
  :«Open the linked queue
(refunds / complaints / orders)§Mở hàng chờ tương ứng
(hoàn tiền / khiếu nại / đơn)»;
else («no§không»)
  :«Nothing pending§Không có việc tồn đọng»;
endif
:«Export CSV report (UC059):
all transactions, UTF-8 for Excel§Xuất báo cáo CSV (UC059):
toàn bộ giao dịch, UTF-8 cho Excel»;
note right
«API only; fromDate / toDate
not applied yet§Mới có API; chưa lọc theo
fromDate / toDate»
end note
|M|
:«Review reports§Xem báo cáo»;
stop
""")


PICK = re.compile(r"«(.*?)§(.*?)»", re.S)
LANE = re.compile(r"^(\s*)\|([A-Z])\|\s*$", re.M)


def render(text, li):
    text = PICK.sub(lambda m: m.group(li), text)
    return LANE.sub(lambda m: f"{m.group(1)}|{LANES[m.group(2)][li - 1]}|", text)


def main():
    (ROOT / "vi").mkdir(parents=True, exist_ok=True)
    for name, d in D.items():
        for li, path in ((1, ROOT / f"{name}.puml"), (2, ROOT / "vi" / f"{name}_vi.puml")):
            uml = name if li == 1 else name + "_vi"
            lanes = "\n".join(f"|{LANES[k][li - 1]}|" for k in d["lanes"])
            out = (f"@startuml {uml}\ntitle {render(d['title'], li)}\n\n{HEADER}\n\n{lanes}\n"
                   f"{render(d['body'], li)}\n@enduml\n")
            assert "«" not in out and "§" not in out, (name, li)
            path.write_text(out, encoding="utf-8", newline="\n")
    print(len(D) * 2, "PlantUML files written")


if __name__ == "__main__":
    main()
