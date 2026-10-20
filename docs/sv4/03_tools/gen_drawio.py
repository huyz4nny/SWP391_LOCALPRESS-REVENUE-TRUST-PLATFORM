"""Generate editable draw.io (.drawio) files for the SV4 diagrams.

Usage (from repo root):  python docs/sv4/03_tools/gen_drawio.py
Output: docs/sv4/01_output/drawio/*.drawio (English) and *_vi.drawio (Vietnamese).
Open with https://app.diagrams.net or the draw.io desktop app. Every lane, box, diamond
and arrow is a separate shape: drag to rearrange, double-click to edit text.
Swimlanes use horizontal lanes (label on the left) like swimlane_sv4_luong_ke_toan.png.
"""
import html
import pathlib

OUT = pathlib.Path(__file__).resolve().parents[1] / "01_output" / "drawio"

COL_W = 190        # horizontal distance between steps
ROW_H = 110        # vertical distance between sub-rows inside one lane
HEADER = 40        # lane title width (left)
TOP_PAD = 25

SIZE = {"start": (30, 30), "end": (30, 30), "act": (172, 66), "dec": (150, 80), "merge": (30, 30), "note": (180, 60)}
STYLE = {
    "start": "ellipse;fillColor=#000000;strokeColor=#000000;html=1;",
    "end": "ellipse;shape=endState;fillColor=#000000;strokeColor=#000000;html=1;",
    "act": "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontSize=11;",
    "dec": "rhombus;whiteSpace=wrap;html=1;fillColor=#FFF8DC;strokeColor=#000000;fontSize=11;",
    "merge": "rhombus;html=1;fillColor=#FFF8DC;strokeColor=#000000;",
    "note": "shape=note;whiteSpace=wrap;html=1;size=12;fillColor=#FFFFE0;strokeColor=#999999;fontSize=11;align=left;spacingLeft=6;",
}
LANE_STYLE = ("swimlane;horizontal=0;startSize={h};html=1;fillColor=#66BBE2;strokeColor=#000000;"
              "fontStyle=1;fontSize=12;swimlaneFillColor=#FFFFFF;collapsible=0;")
EDGE_STYLE = ("edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;"
              "endArrow=block;endFill=1;strokeColor=#000000;fontSize=11;labelBackgroundColor=#FFFFFF;")


def esc(t):
    return html.escape(t, quote=True).replace("\n", "&lt;br&gt;")


def swimlane(name, title, lanes, nodes, edges, lang):
    """lanes: [(key, en, vi)]; nodes: [(id, lane, col, sub, kind, en, vi)]; edges: [(src, dst, en, vi)]"""
    li = 1 if lang == "en" else 2
    subs = {k: 0 for k, *_ in lanes}
    for _, lane, _, sub, *_ in nodes:
        subs[lane] = max(subs[lane], sub)
    max_col = max(n[2] for n in nodes)
    width = HEADER + 40 + (max_col + 1) * COL_W
    cells, y = [], 60
    lane_y = {}
    for key, *labels in lanes:
        h = TOP_PAD * 2 + (subs[key] + 1) * ROW_H - 30
        lane_y[key] = h
        cells.append(f'<mxCell id="lane_{key}" value="{esc(labels[li - 1])}" style="{LANE_STYLE.format(h=HEADER)}" '
                     f'vertex="1" parent="1"><mxGeometry x="20" y="{y}" width="{width}" height="{h}" as="geometry"/></mxCell>')
        y += h
    cells.insert(0, f'<mxCell id="title" value="&lt;b&gt;{esc(title[li - 1])}&lt;/b&gt;" '
                    f'style="text;html=1;align=center;verticalAlign=middle;fontSize=16;" vertex="1" parent="1">'
                    f'<mxGeometry x="20" y="10" width="{width}" height="40" as="geometry"/></mxCell>')
    for nid, lane, col, sub, kind, *labels in nodes:
        w, h = SIZE[kind]
        cx = HEADER + 40 + col * COL_W + COL_W / 2
        cy = TOP_PAD + sub * ROW_H + 40
        text = "" if kind in ("start", "end", "merge") else esc(labels[li - 1])
        cells.append(f'<mxCell id="{nid}" value="{text}" style="{STYLE[kind]}" vertex="1" parent="lane_{lane}">'
                     f'<mxGeometry x="{cx - w / 2:.0f}" y="{cy - h / 2:.0f}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    # global geometry (for choosing connection points so lines do not cut through boxes)
    lane_top, acc = {}, 60
    for key, *_ in lanes:
        lane_top[key] = acc
        acc += lane_y[key]
    pos = {}
    for nid, lane, col, sub, kind, *_ in nodes:
        pos[nid] = (col, lane_top[lane] + TOP_PAD + sub * ROW_H + 40, kind)
    for i, (src, dst, *labels) in enumerate(edges):
        text = esc(labels[li - 1]) if labels and labels[li - 1] else ""
        cs, ys, ks = pos[src]
        cd, yd, kd = pos[dst]
        port = ""
        if cd < cs:                      # loop back: leave from the top, enter from the top
            port = "exitX=0.5;exitY=0;entryX=0.5;entryY=0;"
        elif kd == "merge" and ks != "dec":   # into a merge: go right, then up/down into it
            if yd < ys:
                port = "exitX=1;exitY=0.5;entryX=0.5;entryY=1;"
            elif yd > ys:
                port = "exitX=1;exitY=0.5;entryX=0.5;entryY=0;"
            else:
                port = "exitX=1;exitY=0.5;entryX=0;entryY=0.5;"
        else:                            # vertical first at the source column, then into the left side
            if yd > ys:
                port = "exitX=0.5;exitY=1;entryX=0;entryY=0.5;"
            elif yd < ys:
                port = "exitX=0.5;exitY=0;entryX=0;entryY=0.5;"
            else:
                port = "exitX=1;exitY=0.5;entryX=0;entryY=0.5;"
        cells.append(f'<mxCell id="e{i}" value="{text}" style="{EDGE_STYLE}{port}" edge="1" parent="1" source="{src}" target="{dst}">'
                     f'<mxGeometry relative="1" as="geometry"/></mxCell>')
    return wrap(name if lang == "en" else name + "_vi", cells, width + 60, y + 40)


def wrap(name, cells, w, h):
    body = "".join(cells)
    return (f'<mxfile host="app.diagrams.net"><diagram id="{name}" name="{name}">'
            f'<mxGraphModel dx="{w}" dy="{h}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" '
            f'fold="1" page="0" pageScale="1" pageWidth="{w}" pageHeight="{h}" math="0" shadow="0">'
            f'<root><mxCell id="0"/><mxCell id="1" parent="0"/>{body}</root></mxGraphModel></diagram></mxfile>')


# ---------------------------------------------------------------------------------------------
# Swimlane definitions: same structure as docs/sv4/02_source/swimlane_*.puml
# ---------------------------------------------------------------------------------------------
L = {
    "C": ("Customer", "Khách hàng"),
    "P": ("Payment Page", "Trang thanh toán"),
    "B": ("LocalPress Backend", "Hệ thống LocalPress"),
    "S": ("SePay / Bank", "SePay / Ngân hàng"),
    "A": ("Accountant", "Kế toán"),
    "M": ("Chief Accountant", "Kế toán trưởng"),
    "K": ("Bank Statement", "Sao kê ngân hàng"),
    "D": ("Advertiser", "Doanh nghiệp"),
    "X": ("SV1 / SV3 Modules", "Module SV1 / SV3"),
}


def lanes(*keys):
    return [(k, *L[k]) for k in keys]


SWIMLANES = {}

# Node: (id, lane, col, sub-row, kind, en, vi). Same content as 03_tools/gen_puml.py (checked against the code).
SWIMLANES["swimlane_sv4_00_overview"] = dict(
    title=("SV4-00 Overview: Payment, Complaint and Refund (summary, details in SV4-01 .. SV4-06)",
           "SV4-00 Tổng quan: Thanh toán, Khiếu nại và Hoàn tiền (tóm tắt, chi tiết xem SV4-01 .. SV4-06)"),
    lanes=lanes("C", "B", "S", "A", "M"),
    nodes=[
        ("s", "C", 0, 0, "start", "", ""),
        ("n1", "C", 1, 0, "act", "Choose article / plan / booking\nor click Top Up", "Chọn bài / gói / booking\nhoặc bấm Nạp tiền"),
        ("n2", "B", 2, 0, "act", "Create PENDING order (UC047)\nexpires in 15 min", "Tạo đơn PENDING (UC047)\nhết hạn sau 15 phút"),
        ("n3", "C", 3, 0, "act", "Open shared payment page\n/payment/:orderCode", "Mở trang thanh toán chung\n/payment/:orderCode"),
        ("d1", "C", 4, 0, "dec", "Pay with?", "Thanh toán bằng?"),
        ("d2", "C", 5, 2, "dec", "Enough balance?", "Ví đủ tiền?"),
        ("tp", "C", 6, 3, "act", "Top up the shortfall\n(SePay QR, SV4-02)", "Nạp thêm tiền vào ví\n(QR SePay, SV4-02)"),
        ("mw", "C", 7, 2, "merge", "", ""),
        ("n4", "B", 8, 3, "act", "Debit wallet,\norder SUCCESS", "Trừ ví,\nđơn SUCCESS"),
        ("q1", "C", 9, 0, "act", "Scan QR and transfer", "Quét QR, chuyển khoản"),
        ("q2", "S", 10, 0, "act", "Send IPN webhook", "Gửi webhook IPN"),
        ("d3", "B", 11, 0, "dec", "Webhook result\n(UC048, UC049)?", "Kết quả webhook\n(UC048, UC049)?"),
        ("r1", "B", 12, 0, "act", "Full / overpaid: order\nSUCCESS, excess to wallet", "Đủ / thừa: đơn SUCCESS,\ntiền thừa vào ví"),
        ("r2", "B", 12, 1, "act", "Underpaid / late: money\nto wallet, order not done", "Thiếu / về muộn: tiền vào\nví, đơn chưa hoàn tất"),
        ("r3", "B", 12, 2, "act", "Top-up order:\ncredit wallet", "Đơn nạp ví:\ncộng tiền vào ví"),
        ("mq", "B", 13, 0, "merge", "", ""),
        ("m1", "C", 14, 0, "merge", "", ""),
        ("d4", "C", 15, 0, "dec", "Transferred > 15 min\nbut not recorded?", "Đã chuyển > 15 phút\nmà chưa ghi nhận?"),
        ("nb1", "C", 16, 0, "act", "Payment recorded\nnormally", "Thanh toán đã\nđược ghi nhận"),
        ("c1", "C", 16, 1, "act", "Submit complaint\n(UC051)", "Gửi khiếu nại\n(UC051)"),
        ("c2", "A", 17, 0, "act", "Match bank statement\n(SV4-03)", "Đối chiếu sao kê\n(SV4-03)"),
        ("d5", "A", 18, 0, "dec", "Money found?", "Thấy tiền\ntrên sao kê?"),
        ("c3", "B", 19, 0, "act", "Record to order\nor credit wallet", "Ghi nhận vào đơn\nhoặc cộng ví"),
        ("c4", "A", 19, 1, "act", "Reject with reason", "Từ chối, ghi lý do"),
        ("mc", "A", 20, 0, "merge", "", ""),
        ("m2", "C", 21, 0, "merge", "", ""),
        ("d6", "A", 22, 0, "dec", "Refund requested\n(via support)?", "Khách yêu cầu hoàn\n(qua hỗ trợ)?"),
        ("f1", "A", 23, 0, "act", "1st eye: propose refund\n(UC055), cap Rule 11", "Mắt 1: lập đề xuất hoàn\n(UC055), hạn mức Rule 11"),
        ("nb2", "C", 23, 0, "act", "Keep purchased rights", "Giữ quyền lợi đã mua"),
        ("d7", "M", 24, 0, "dec", "2nd eye\napproves?", "Mắt 2\nduyệt?"),
        ("f2", "B", 25, 0, "act", "REFUND transaction, event:\nSV1 / SV3 revoke rights", "Giao dịch REFUND, phát sự\nkiện: SV1 / SV3 thu hồi quyền"),
        ("f3", "M", 25, 1, "act", "REJECTED,\ncustomer keeps rights", "REJECTED,\nkhách giữ quyền lợi"),
        ("mf", "M", 26, 0, "merge", "", ""),
        ("m3", "C", 27, 0, "merge", "", ""),
        ("n9", "C", 28, 0, "act", "Receive final result", "Nhận kết quả cuối cùng"),
        ("e", "C", 29, 0, "end", "", ""),
    ],
    edges=[
        ("s", "n1"), ("n1", "n2"), ("n2", "n3"), ("n3", "d1"),
        ("d1", "d2", "LocalPress Wallet", "Ví LocalPress"), ("d1", "q1", "SePay QR", "QR SePay"),
        ("d2", "mw", "yes", "đủ"), ("d2", "tp", "no", "không đủ"), ("tp", "mw"), ("mw", "n4"),
        ("q1", "q2"), ("q2", "d3"), ("d3", "r1"), ("d3", "r2"), ("d3", "r3"),
        ("r1", "mq"), ("r2", "mq"), ("r3", "mq"), ("mq", "m1"), ("n4", "m1"), ("m1", "d4"),
        ("d4", "nb1", "no", "không"), ("d4", "c1", "yes", "có"), ("c1", "c2"), ("c2", "d5"),
        ("d5", "c3", "yes", "có"), ("d5", "c4", "no", "không"), ("c3", "mc"), ("c4", "mc"), ("mc", "m2"), ("nb1", "m2"),
        ("m2", "d6"), ("d6", "f1", "yes", "có"), ("d6", "nb2", "no", "không"), ("f1", "d7"),
        ("d7", "f2", "yes", "duyệt"), ("d7", "f3", "no", "từ chối"), ("f2", "mf"), ("f3", "mf"),
        ("mf", "m3"), ("nb2", "m3"), ("m3", "n9"), ("n9", "e"),
    ],
)

SWIMLANES["swimlane_sv4_01_payment"] = dict(
    title=("SV4-01 Shared Payment Page /payment/:orderCode (UC047 - UC050)", "SV4-01 Trang thanh toán chung /payment/:orderCode (UC047 - UC050)"),
    lanes=lanes("C", "P", "B", "S", "X"),
    nodes=[
        ("s", "C", 0, 0, "start", "", ""),
        ("a1", "C", 1, 0, "act", "Click Buy in the source module\n(article / plan / booking)", "Bấm Mua ở module nguồn\n(bài / gói / booking)"),
        ("a2", "X", 2, 0, "act", "Create pending record (purchase /\nsubscription / campaign)", "Tạo bản ghi chờ (purchase /\nsubscription / campaign)"),
        ("a3", "B", 3, 0, "act", "Create PENDING order (UC047)\ncode LP..., expires in 15 min", "Tạo đơn PENDING (UC047)\nmã LP..., hết hạn 15 phút"),
        ("nt1", "B", 4, 1, "note", "POST /api/v1/finance/orders\nuser from login session", "POST /api/v1/finance/orders\nuser lấy từ phiên đăng nhập"),
        ("d1", "P", 4, 0, "dec", "Logged in?", "Đã đăng nhập?"),
        ("l1", "C", 5, 0, "act", "Log in, return\nto this page", "Đăng nhập, quay lại\ntrang này"),
        ("ml", "P", 6, 0, "merge", "", ""),
        ("a4", "B", 7, 0, "act", "Load order by code\n(UC050)", "Tải đơn theo mã\n(UC050)"),
        ("d2", "B", 8, 0, "dec", "Order state?", "Trạng thái đơn?"),
        ("o4", "P", 9, 0, "act", "Show order, wallet balance,\nQR code, countdown", "Hiện đơn, số dư ví,\nmã QR, đếm ngược"),
        ("o2", "P", 9, 1, "act", "Already SUCCESS:\nshow Paid result", "Đã SUCCESS:\nhiện Đã thanh toán"),
        ("o3", "P", 9, 2, "act", "Expired / FAILED: new order,\ncheck wallet or complaint", "Hết hạn / FAILED: tạo đơn mới,\nxem ví hoặc khiếu nại"),
        ("o1", "B", 9, 6, "act", "Not the owner:\n403 Forbidden (Rule 14)", "Không phải chủ đơn:\n403 Forbidden (Rule 14)"),
        ("nt2", "P", 10, 3, "note", "Top-up order: QR only,\nno wallet option (SV4-02)", "Đơn nạp ví: chỉ có QR,\nkhông trả bằng ví (SV4-02)"),
        ("d3", "C", 10, 0, "dec", "Pay with?", "Thanh toán bằng?"),
        ("w1", "P", 11, 0, "dec", "Balance >= amount?", "Số dư >= số tiền?"),
        ("ws", "P", 12, 3, "act", "Show Top up to pay: customer\ntops up (SV4-02), comes back", "Hiện nút Nạp thêm: khách nạp\nphần thiếu (SV4-02), quay lại"),
        ("w2", "B", 12, 0, "act", "pay-with-wallet: lock order\n+ wallet, re-check all", "pay-with-wallet: khóa đơn\n+ ví, kiểm tra lại"),
        ("w3", "B", 13, 0, "dec", "All valid?", "Hợp lệ?"),
        ("w4", "B", 14, 0, "act", "Debit wallet, order\nSUCCESS (WALLET)", "Trừ ví, đơn SUCCESS\n(WALLET)"),
        ("w5", "B", 14, 1, "act", "402 / 403 / 410, rollback,\norder stays PENDING", "402 / 403 / 410, rollback,\nđơn vẫn PENDING"),
        ("mw", "B", 15, 0, "merge", "", ""),
        ("q1", "C", 16, 2, "act", "Transfer, content\n= order code", "Chuyển khoản, nội dung\n= mã đơn"),
        ("q2", "S", 17, 0, "act", "Send IPN webhook", "Gửi webhook IPN"),
        ("d4", "B", 18, 2, "dec", "Webhook result\n(UC048, UC049)?", "Kết quả webhook\n(UC048, UC049)?"),
        ("k1", "B", 19, 2, "act", "Wrong key 401 / ORDER_NOT_FOUND\n/ ALREADY_PROCESSED: no change", "Sai key 401 / ORDER_NOT_FOUND\n/ ALREADY_PROCESSED: không đổi"),
        ("k2", "B", 19, 3, "act", "Ad hold expired / closed:\nFAILED, wallet -LATE (Rule 6)", "Hết giữ chỗ / đơn đóng:\nFAILED, ví -LATE (Rule 6)"),
        ("k3", "B", 19, 4, "act", "Underpaid: wallet -PART,\norder stays PENDING", "Chuyển thiếu: ví -PART,\nđơn vẫn PENDING"),
        ("k4", "B", 19, 5, "act", "Full / overpaid: SUCCESS,\nexcess to wallet -EXCESS", "Đủ / thừa: SUCCESS,\ntiền thừa vào ví -EXCESS"),
        ("mk", "B", 20, 2, "merge", "", ""),
        ("mp", "P", 21, 0, "merge", "", ""),
        ("n9", "P", 22, 0, "act", "Poll every 3 s or\n\"check again\" (UC050)", "Hỏi trạng thái mỗi 3 giây\nhoặc \"kiểm tra lại\" (UC050)"),
        ("d5", "B", 23, 0, "dec", "Order SUCCESS?", "Đơn SUCCESS?"),
        ("ev", "B", 24, 0, "act", "Publish PaymentSuccessEvent\n(transaction = ledger line)", "Phát PaymentSuccessEvent\n(giao dịch = dòng sổ quỹ)"),
        ("nw", "P", 24, 0, "act", "Keep waiting until paid\nor the code expires", "Chờ đến khi trả đủ\nhoặc mã hết hạn"),
        ("x1", "X", 25, 0, "act", "@EventListener: grant rights\n/ activate ad", "@EventListener: mở quyền\n/ kích hoạt quảng cáo"),
        ("nt3", "X", 25, 1, "note", "Not in code yet:\nSV1 / SV3 must write it", "Chưa có trong code:\nSV1 / SV3 phải tự viết"),
        ("mF", "C", 27, 0, "merge", "", ""),
        ("fin", "C", 28, 0, "act", "See payment result", "Xem kết quả thanh toán"),
        ("e", "C", 29, 0, "end", "", ""),
    ],
    edges=[
        ("s", "a1"), ("a1", "a2"), ("a2", "a3"), ("a3", "d1"),
        ("d1", "ml", "yes", "rồi"), ("d1", "l1", "no", "chưa"), ("l1", "ml"), ("ml", "a4"), ("a4", "d2"),
        ("d2", "o4", "PENDING, in time", "PENDING còn hạn"), ("d2", "o2"), ("d2", "o3"), ("d2", "o1"),
        ("o4", "d3"),
        ("d3", "w1", "LocalPress Wallet", "Ví LocalPress"), ("d3", "q1", "SePay QR", "QR SePay"),
        ("w1", "w2", "yes", "đủ"), ("w1", "ws", "no", "thiếu"), ("w2", "w3"),
        ("w3", "w4", "yes", "có"), ("w3", "w5", "no", "không"), ("w4", "mw"), ("w5", "mw"), ("ws", "mw"),
        ("q1", "q2"), ("q2", "d4"), ("d4", "k1"), ("d4", "k2"), ("d4", "k3"), ("d4", "k4"),
        ("k1", "mk"), ("k2", "mk"), ("k3", "mk"), ("k4", "mk"),
        ("mw", "mp"), ("mk", "mp"), ("mp", "n9"), ("n9", "d5"),
        ("d5", "ev", "yes", "có"), ("d5", "nw", "no", "không"), ("ev", "x1"),
        ("x1", "mF"), ("nw", "mF"), ("o1", "mF"), ("o2", "mF"), ("o3", "mF"), ("mF", "fin"), ("fin", "e"),
    ],
)

SWIMLANES["swimlane_sv4_02_wallet_topup"] = dict(
    title=("SV4-02 Top Up LocalPress Wallet via SePay QR (top-up is a liability, not revenue)",
           "SV4-02 Nạp tiền Ví LocalPress qua QR SePay (tiền nạp là công nợ, không phải doanh thu)"),
    lanes=lanes("C", "P", "B", "S"),
    nodes=[
        ("s", "C", 0, 0, "start", "", ""),
        ("t1", "C", 1, 0, "act", "Click Top Up in the header\nor Top up to pay", "Bấm Nạp tiền trên header\nhoặc Nạp thêm để thanh toán"),
        ("d1", "P", 2, 0, "dec", "Logged in?", "Đã đăng nhập?"),
        ("l1", "C", 3, 1, "act", "Log in, return\nto /wallet/topup", "Đăng nhập, quay lại\n/wallet/topup"),
        ("ml", "P", 4, 0, "merge", "", ""),
        ("t2", "P", 5, 0, "act", "Pick a preset (50k - 1M)\nor enter an amount", "Chọn mức có sẵn (50k - 1tr)\nhoặc tự nhập số tiền"),
        ("d2", "P", 6, 0, "dec", "10,000 - 50,000,000\nmultiple of 1,000?", "10.000 - 50.000.000 đ\nbội số 1.000?"),
        ("t3", "B", 7, 0, "act", "Re-check limits, create\nTOPUP PENDING (15 min)", "Kiểm tra lại hạn mức, tạo\nđơn TOPUP PENDING (15 phút)"),
        ("nt1", "B", 8, 1, "note", "Out of range or\ndecimal -> 400", "Ngoài hạn mức hoặc\nsố lẻ -> 400"),
        ("inv", "P", 8, 2, "act", "Show validation error", "Báo lỗi nhập liệu"),
        ("t4", "P", 8, 0, "act", "Open /payment/:orderCode\n(QR only, no wallet)", "Mở /payment/:orderCode\n(chỉ QR, không trả bằng ví)"),
        ("t5", "C", 9, 0, "act", "Scan QR and transfer", "Quét QR, chuyển khoản"),
        ("t6", "S", 10, 0, "act", "Send IPN webhook", "Gửi webhook IPN"),
        ("d3", "B", 11, 0, "dec", "Webhook result?", "Kết quả webhook?"),
        ("k1", "B", 12, 0, "act", "Wrong API key:\n401, wallet unchanged", "Sai API key:\n401, ví không đổi"),
        ("k2", "B", 12, 1, "act", "Already SUCCESS:\nALREADY_PROCESSED (Rule 5)", "Đã SUCCESS:\nALREADY_PROCESSED (Rule 5)"),
        ("k3", "B", 12, 2, "act", "First time: TOPUP SUCCESS,\ncredit amount actually received", "Lần đầu: TOPUP SUCCESS,\ncộng đúng số tiền thực nhận"),
        ("nt2", "B", 13, 3, "note", "UNIQUE(transaction_id, direction)\nblocks a second credit", "UNIQUE(transaction_id, direction)\nchặn cộng 2 lần"),
        ("mk", "B", 13, 0, "merge", "", ""),
        ("d4", "P", 14, 0, "dec", "Polling: order\nSUCCESS?", "Polling: đơn\nSUCCESS?"),
        ("p1", "P", 15, 0, "act", "Show new balance, back to\n/wallet or the order", "Hiện số dư mới, quay lại\n/wallet hoặc đơn đang trả"),
        ("p2", "P", 15, 1, "act", "Keep waiting; after 15 min\nCreate new top-up code", "Tiếp tục chờ; quá 15 phút\nhiện Tạo mã nạp mới"),
        ("mp", "P", 16, 0, "merge", "", ""),
        ("mF", "P", 17, 0, "merge", "", ""),
        ("fin", "C", 18, 0, "act", "See wallet balance\nand history", "Xem số dư và\nlịch sử ví"),
        ("e", "C", 19, 0, "end", "", ""),
    ],
    edges=[
        ("s", "t1"), ("t1", "d1"), ("d1", "ml", "yes", "rồi"), ("d1", "l1", "no", "chưa"), ("l1", "ml"), ("ml", "t2"),
        ("t2", "d2"), ("d2", "t3", "valid", "hợp lệ"), ("d2", "inv", "invalid", "không hợp lệ"),
        ("t3", "t4"), ("t4", "t5"), ("t5", "t6"), ("t6", "d3"), ("d3", "k1"), ("d3", "k2"), ("d3", "k3"),
        ("k1", "mk"), ("k2", "mk"), ("k3", "mk"), ("mk", "d4"),
        ("d4", "p1", "yes", "có"), ("d4", "p2", "no", "không"), ("p1", "mp"), ("p2", "mp"),
        ("mp", "mF"), ("inv", "mF"), ("mF", "fin"), ("fin", "e"),
    ],
)

SWIMLANES["swimlane_sv4_03_complaint"] = dict(
    title=("SV4-03 Unrecorded Payment Complaint (UC051) - no manual mark as PAID",
           "SV4-03 Khiếu nại thanh toán chưa ghi nhận (UC051) - không có nút đánh dấu đã thanh toán"),
    lanes=lanes("C", "B", "A", "K"),
    nodes=[
        ("s", "C", 0, 0, "start", "", ""),
        ("c1", "C", 1, 0, "act", "Open /wallet/complaints\n(or link on payment page)", "Mở /wallet/complaints\n(hoặc link trang thanh toán)"),
        ("c2", "C", 2, 0, "act", "Enter order code (optional),\namount, time, bank tx id", "Nhập mã đơn (không bắt buộc),\nsố tiền, thời gian, mã GD"),
        ("d1", "B", 3, 0, "dec", "Check complaint?", "Kiểm tra khiếu nại?"),
        ("v4", "B", 4, 0, "act", "Valid: save OPEN, alert\nCOMPLAINT_OPEN (UC060)", "Hợp lệ: lưu OPEN, cảnh báo\nCOMPLAINT_OPEN (UC060)"),
        ("v1", "B", 5, 7, "act", "Missing / invalid field:\n400", "Thiếu / sai dữ liệu:\n400"),
        ("v2", "B", 5, 8, "act", "Bank tx id used before:\n409 duplicate", "Mã GD đã khiếu nại:\n409 trùng"),
        ("v3", "B", 5, 9, "act", "Order not found / not own:\n404 / 403", "Không thấy đơn / không phải\nđơn của mình: 404 / 403"),
        ("mv", "B", 6, 7, "merge", "", ""),
        ("a1", "A", 5, 0, "act", "Open complaint queue\n(finance staff only, else 403)", "Mở hàng chờ khiếu nại\n(chỉ kế toán, khác 403)"),
        ("nt1", "A", 4, 1, "note", "Complaint no longer\nOPEN -> 409", "Khiếu nại không còn\nOPEN -> 409"),
        ("k1", "K", 6, 0, "act", "Bank statement", "Sao kê ngân hàng"),
        ("a2", "A", 7, 0, "act", "Match bank tx id + amount,\npick an action", "Đối chiếu mã GD + số tiền,\nchọn thao tác"),
        ("d2", "B", 8, 0, "dec", "Accountant action?", "Kế toán chọn?"),
        ("d3", "B", 9, 0, "dec", "Run webhook\nlogic (UC049)?", "Chạy logic\nwebhook (UC049)?"),
        ("x1", "B", 10, 0, "act", "No order code: 400,\nchoose wallet, stays OPEN", "Không có mã đơn: 400,\nchọn cộng ví, vẫn OPEN"),
        ("x2", "B", 10, 1, "act", "Order already SUCCESS: 409,\nchoose wallet, stays OPEN", "Đơn đã SUCCESS: 409,\nchọn cộng ví, vẫn OPEN"),
        ("x3", "B", 10, 2, "act", "Full / under / late: RESOLVED,\norder SUCCESS or to wallet", "Đủ / thiếu / muộn: RESOLVED,\nđơn SUCCESS hoặc vào ví"),
        ("mx", "B", 11, 0, "merge", "", ""),
        ("d4", "B", 9, 3, "dec", "Order still PENDING\nand in time?", "Đơn còn PENDING\nvà còn hạn?"),
        ("w1", "B", 10, 3, "act", "409: must record to order\n(avoid double count)", "409: phải ghi nhận vào đơn\n(tránh ghi 2 lần)"),
        ("w2", "B", 10, 4, "act", "RESOLVED: credit wallet,\ncode CMP-ref, only once", "RESOLVED: cộng ví,\nmã CMP-mãGD, chỉ 1 lần"),
        ("mw", "B", 11, 3, "merge", "", ""),
        ("d5", "B", 9, 5, "dec", "Reason entered?", "Có nhập lý do?"),
        ("r1", "B", 10, 5, "act", "REJECTED with reason", "REJECTED kèm lý do"),
        ("r2", "B", 10, 6, "act", "400: reason required", "400: bắt buộc nhập lý do"),
        ("mr", "B", 11, 5, "merge", "", ""),
        ("ma", "B", 12, 0, "merge", "", ""),
        ("mF", "C", 13, 0, "merge", "", ""),
        ("fin", "C", 14, 0, "act", "See complaint status\nat /wallet/complaints", "Xem trạng thái khiếu nại\ntại /wallet/complaints"),
        ("e", "C", 15, 0, "end", "", ""),
    ],
    edges=[
        ("s", "c1"), ("c1", "c2"), ("c2", "d1"),
        ("d1", "v4", "valid", "hợp lệ"), ("d1", "v1"), ("d1", "v2"), ("d1", "v3"),
        ("v1", "mv"), ("v2", "mv"), ("v3", "mv"),
        ("v4", "a1"), ("a1", "k1"), ("k1", "a2"), ("a2", "d2"),
        ("d2", "d3", "record to order", "ghi nhận vào đơn"), ("d2", "d4", "credit wallet", "cộng vào ví"), ("d2", "d5", "reject", "từ chối"),
        ("d3", "x1"), ("d3", "x2"), ("d3", "x3"), ("x1", "mx"), ("x2", "mx"), ("x3", "mx"),
        ("d4", "w1", "yes", "có"), ("d4", "w2", "no", "không"), ("w1", "mw"), ("w2", "mw"),
        ("d5", "r1", "yes", "có"), ("d5", "r2", "no", "không"), ("r1", "mr"), ("r2", "mr"),
        ("mx", "ma"), ("mw", "ma"), ("mr", "ma"), ("ma", "mF"), ("mv", "mF"), ("mF", "fin"), ("fin", "e"),
    ],
)

SWIMLANES["swimlane_sv4_04_reconciliation"] = dict(
    title=("SV4-04 Bank Reconciliation (UC054) and Advertiser Receivables (UC053)",
           "SV4-04 Đối soát ngân hàng (UC054) và Công nợ doanh nghiệp (UC053)"),
    lanes=lanes("A", "B", "K", "M"),
    nodes=[
        ("s", "A", 0, 0, "start", "", ""),
        ("n1", "A", 1, 0, "act", "Open /backoffice/finance/\nreconciliation", "Mở /backoffice/finance/\nreconciliation"),
        ("n2", "B", 2, 0, "act", "System total of the month:\nSUCCESS, no REFUND / WALLET", "Tổng hệ thống trong tháng:\nSUCCESS, bỏ REFUND / ví"),
        ("n3", "K", 3, 0, "act", "Gateway / statement total", "Tổng cổng TT / sao kê"),
        ("nt1", "K", 4, 1, "note", "Demo: statement = system total,\ndiscrepancies are sample data", "Demo: sao kê = tổng hệ thống,\nchênh lệch là dữ liệu mẫu"),
        ("n4", "B", 4, 0, "act", "List discrepancies, status\nOPEN / RECONCILED / CLOSED", "Liệt kê chênh lệch, trạng thái\nOPEN / RECONCILED / CLOSED"),
        ("d1", "A", 5, 0, "dec", "UNRESOLVED item\nand period open?", "Còn mục UNRESOLVED\nvà kỳ chưa chốt?"),
        ("l1", "A", 6, 1, "act", "Investigate: complaint (UC051),\nrefund (UC055) or explain", "Xử lý: khiếu nại (UC051),\nhoàn tiền (UC055), giải trình"),
        ("l2", "A", 7, 1, "act", "Enter resolution note", "Nhập ghi chú xử lý"),
        ("l3", "B", 8, 0, "act", "Mark RESOLVED\n(who, when, note)", "Đánh dấu RESOLVED\n(ai, lúc nào, ghi chú)"),
        ("n5", "A", 9, 0, "act", "View advertiser\nreceivables (UC053)", "Xem công nợ\ndoanh nghiệp (UC053)"),
        ("nt2", "A", 10, 1, "note", "API /finance/receivables\nonly, no screen yet", "Mới có API /finance/receivables,\nchưa có màn hình"),
        ("d2", "B", 10, 0, "dec", "Debt group\nper campaign?", "Nhóm nợ\ntừng chiến dịch?"),
        ("g1", "B", 11, 0, "act", "Paid in full:\nPAID_IN_FULL", "Đã trả đủ:\nPAID_IN_FULL"),
        ("g2", "B", 11, 1, "act", "Before end date:\nIN_TERM", "Chưa tới ngày kết thúc:\nIN_TERM"),
        ("g3", "B", 11, 2, "act", "Past end date: OVERDUE,\nalert DEBT_OVERDUE (UC060)", "Quá ngày kết thúc: OVERDUE,\ncảnh báo DEBT_OVERDUE (UC060)"),
        ("mg", "B", 12, 0, "merge", "", ""),
        ("c1", "A", 13, 0, "act", "Click Close period", "Bấm Chốt kỳ"),
        ("d3", "A", 14, 0, "dec", "Chief accountant\nrole?", "Là Kế toán\ntrưởng?"),
        ("c2", "M", 15, 0, "act", "Confirm closing (warned\nif discrepancy left)", "Xác nhận chốt kỳ (cảnh\nbáo nếu còn chênh lệch)"),
        ("c4", "A", 15, 1, "act", "Blocked: chief\naccountant only", "Bị chặn: chỉ Kế toán\ntrưởng được chốt"),
        ("c3", "B", 16, 0, "act", "Period CLOSED,\nresolving is locked", "Kỳ CLOSED,\nkhóa xử lý chênh lệch"),
        ("mc", "A", 17, 0, "merge", "", ""),
        ("fin", "A", 18, 0, "act", "See period status", "Xem trạng thái kỳ"),
        ("e", "A", 19, 0, "end", "", ""),
    ],
    edges=[
        ("s", "n1"), ("n1", "n2"), ("n2", "n3"), ("n3", "n4"), ("n4", "d1"),
        ("d1", "l1", "yes", "còn"), ("l1", "l2"), ("l2", "l3"), ("l3", "d1"), ("d1", "n5", "no", "hết"),
        ("n5", "d2"), ("d2", "g1"), ("d2", "g2"), ("d2", "g3"), ("g1", "mg"), ("g2", "mg"), ("g3", "mg"),
        ("mg", "c1"), ("c1", "d3"), ("d3", "c2", "yes", "đúng"), ("d3", "c4", "no", "không"),
        ("c2", "c3"), ("c3", "mc"), ("c4", "mc"), ("mc", "fin"), ("fin", "e"),
    ],
)

SWIMLANES["swimlane_sv4_05_refund"] = dict(
    title=("SV4-05 Four-Eyes Refund and Rights Adjustment (UC055, UC056)", "SV4-05 Hoàn tiền 4 mắt và Điều chỉnh quyền (UC055, UC056)"),
    lanes=lanes("C", "A", "M", "B", "X"),
    nodes=[
        ("s", "C", 0, 0, "start", "", ""),
        ("n1", "C", 1, 0, "act", "Ask for a refund via\nsupport (outside system)", "Yêu cầu hoàn tiền qua\nhỗ trợ (ngoài hệ thống)"),
        ("n2", "A", 2, 0, "act", "1st eye: order detail (PAID)\nor Refund page: amount, reason", "Mắt 1: chi tiết đơn (PAID)\nhoặc trang Hoàn tiền: số tiền, lý do"),
        ("d1", "B", 3, 0, "dec", "Check proposal\n(UC055)?", "Kiểm tra đề xuất\n(UC055)?"),
        ("p1", "B", 4, 0, "act", "Valid: refund PENDING\n(counts toward cap)", "Hợp lệ: yêu cầu hoàn\nPENDING (tính vào hạn mức)"),
        ("nt1", "B", 5, 1, "note", "cap left = paid - (PENDING\n+ APPROVED + COMPLETED)", "hạn mức còn = đã thu - (PENDING\n+ APPROVED + COMPLETED)"),
        ("v1", "B", 4, 6, "act", "Not SUCCESS / TOPUP /\nREFUND: 400", "Chưa SUCCESS / TOPUP /\nREFUND: 400"),
        ("v2", "B", 4, 7, "act", "Amount > cap left:\n400 Refund Cap (Rule 11)", "Số tiền > hạn mức còn:\n400 Refund Cap (Rule 11)"),
        ("mv", "B", 5, 6, "merge", "", ""),
        ("n5", "M", 5, 0, "act", "2nd eye: open request,\napprove or reject", "Mắt 2: mở yêu cầu,\nduyệt hoặc từ chối"),
        ("d2", "B", 6, 0, "dec", "Review result?", "Kết quả duyệt?"),
        ("r1", "B", 7, 0, "act", "Reviewer = proposer: 403\nFour-Eyes, stays PENDING", "Người duyệt = người lập: 403\n4 mắt, vẫn PENDING"),
        ("r2", "B", 7, 1, "act", "Already reviewed:\n409, nothing changes", "Đã xử lý trước đó:\n409, không đổi gì"),
        ("r3", "B", 7, 2, "act", "Rejected: REJECTED, cap\nreleased, keeps rights", "Từ chối: REJECTED, trả hạn\nmức, khách giữ quyền lợi"),
        ("r4", "B", 7, 3, "act", "Approved: COMPLETED,\nREFUND tx (reversal)", "Duyệt: COMPLETED,\ngiao dịch REFUND (đảo)"),
        ("dw", "B", 8, 3, "dec", "Paid with\nwallet?", "Đơn trả\nbằng ví?"),
        ("w1", "B", 9, 3, "act", "Credit refund back\nto customer wallet", "Cộng tiền hoàn\nlại vào ví khách"),
        ("w2", "B", 9, 4, "act", "SePay QR: money returned\noutside the system", "QR SePay: chuyển trả\ntiền ngoài hệ thống"),
        ("mw", "B", 10, 3, "merge", "", ""),
        ("d3", "B", 11, 3, "dec", "Total refunded\n>= paid?", "Tổng đã hoàn\n>= đã thu?"),
        ("t1", "B", 12, 3, "act", "Original order\nREFUNDED", "Đơn gốc chuyển\nREFUNDED"),
        ("t2", "B", 12, 4, "act", "Original stays SUCCESS\n(partial refund)", "Đơn gốc giữ SUCCESS\n(hoàn một phần)"),
        ("mt", "B", 13, 3, "merge", "", ""),
        ("mr", "B", 14, 0, "merge", "", ""),
        ("dc", "B", 15, 0, "dec", "Refund\nCOMPLETED?", "Hoàn tiền\nCOMPLETED?"),
        ("ev", "B", 16, 0, "act", "Publish RefundCompletedEvent\n(type, targetId, fullRefund)", "Phát RefundCompletedEvent\n(loại đơn, targetId, fullRefund)"),
        ("nt2", "B", 17, 2, "note", "Rule 17: SV4 does not\nupdate SV1 / SV3 tables", "Rule 17: SV4 không sửa\nbảng của SV1 / SV3"),
        ("nb", "B", 17, 1, "act", "No event,\nrights unchanged", "Không phát sự kiện,\nquyền giữ nguyên"),
        ("x1", "X", 17, 0, "act", "@EventListener (UC056): full refund\nrevoke rights, partial keep", "@EventListener (UC056): hoàn hết\nthu hồi quyền, một phần giữ quyền"),
        ("nt3", "X", 18, 1, "note", "Not in code yet:\nSV1 / SV3 must write it", "Chưa có trong code:\nSV1 / SV3 phải tự viết"),
        ("mz", "C", 19, 0, "merge", "", ""),
        ("fin", "C", 20, 0, "act", "Receive refund result", "Nhận kết quả hoàn tiền"),
        ("e", "C", 21, 0, "end", "", ""),
    ],
    edges=[
        ("s", "n1"), ("n1", "n2"), ("n2", "d1"), ("d1", "p1", "valid", "hợp lệ"), ("d1", "v1"), ("d1", "v2"),
        ("v1", "mv"), ("v2", "mv"), ("p1", "n5"), ("n5", "d2"),
        ("d2", "r1"), ("d2", "r2"), ("d2", "r3"), ("d2", "r4"),
        ("r4", "dw"), ("dw", "w1", "yes", "có"), ("dw", "w2", "no", "không"), ("w1", "mw"), ("w2", "mw"), ("mw", "d3"), ("d3", "t1", "yes", "có"), ("d3", "t2", "no", "không"), ("t1", "mt"), ("t2", "mt"), ("mt", "mr"),
        ("r1", "mr"), ("r2", "mr"), ("r3", "mr"), ("mv", "mr"), ("mr", "dc"),
        ("dc", "ev", "yes", "có"), ("dc", "nb", "no", "không"), ("ev", "x1"),
        ("x1", "mz"), ("nb", "mz"), ("mz", "fin"), ("fin", "e"),
    ],
)

SWIMLANES["swimlane_sv4_06_reports"] = dict(
    title=("SV4-06 Dashboard, Ledger, Documents, Reports, Alerts (UC052, UC057 - UC060)",
           "SV4-06 Dashboard, Sổ quỹ, Chứng từ, Báo cáo, Cảnh báo (UC052, UC057 - UC060)"),
    lanes=lanes("A", "B", "M"),
    nodes=[
        ("s", "A", 0, 0, "start", "", ""),
        ("n1", "A", 1, 0, "act", "Log in to finance\nback office", "Đăng nhập backoffice\ntài chính"),
        ("n2", "B", 2, 0, "act", "Dashboard (UC052): revenue =\nSUCCESS, no REFUND / TOPUP", "Dashboard (UC052): doanh thu =\nSUCCESS, bỏ REFUND / TOPUP"),
        ("n3", "A", 3, 0, "act", "Open ledger (UC058): filter\nstatus, type, method, date", "Mở sổ quỹ (UC058): lọc trạng\nthái, loại, phương thức, ngày"),
        ("n4", "B", 4, 0, "act", "Summary: gross,\nrefunded, net", "Tổng hợp: tổng thu,\nđã hoàn, thuần"),
        ("n5", "A", 5, 0, "act", "Open an order detail", "Mở chi tiết một đơn"),
        ("d1", "A", 6, 0, "dec", "Order PAID\n(SUCCESS)?", "Đơn PAID\n(SUCCESS)?"),
        ("y1", "A", 7, 0, "act", "Print invoice (UC057)\nor propose refund (SV4-05)", "In hóa đơn (UC057) hoặc\nlập đề xuất hoàn (SV4-05)"),
        ("y2", "A", 7, 1, "act", "No invoice button (PENDING\n/ FAILED / REFUNDED)", "Không có nút in hóa đơn\n(PENDING / FAILED / REFUNDED)"),
        ("m1", "A", 8, 0, "merge", "", ""),
        ("n6", "B", 9, 0, "act", "Alerts (UC060): refunds PENDING,\ncomplaints OPEN, overdue debt", "Cảnh báo (UC060): hoàn PENDING,\nkhiếu nại OPEN, nợ quá hạn"),
        ("nt1", "B", 10, 1, "note", "API /finance/alerts only,\nno screen yet", "Mới có API /finance/alerts,\nchưa có màn hình"),
        ("d2", "A", 10, 0, "dec", "Any alert?", "Có cảnh báo?"),
        ("q1", "A", 11, 0, "act", "Open the linked queue (refunds\n/ complaints / orders)", "Mở hàng chờ tương ứng (hoàn\ntiền / khiếu nại / đơn)"),
        ("q2", "A", 11, 1, "act", "Nothing pending", "Không có việc tồn đọng"),
        ("m2", "A", 12, 0, "merge", "", ""),
        ("n7", "A", 13, 0, "act", "Export CSV report (UC059)\nall transactions, UTF-8", "Xuất báo cáo CSV (UC059)\ntoàn bộ giao dịch, UTF-8"),
        ("nt2", "A", 14, 1, "note", "API only; fromDate / toDate\nnot applied yet", "Mới có API; chưa lọc theo\nfromDate / toDate"),
        ("n8", "M", 14, 0, "act", "Review reports", "Xem báo cáo"),
        ("e", "M", 15, 0, "end", "", ""),
    ],
    edges=[
        ("s", "n1"), ("n1", "n2"), ("n2", "n3"), ("n3", "n4"), ("n4", "n5"), ("n5", "d1"),
        ("d1", "y1", "yes", "có"), ("d1", "y2", "no", "không"), ("y1", "m1"), ("y2", "m1"),
        ("m1", "n6"), ("n6", "d2"), ("d2", "q1", "yes", "có"), ("d2", "q2", "no", "không"), ("q1", "m2"), ("q2", "m2"),
        ("m2", "n7"), ("n7", "n8"), ("n8", "e"),
    ],
)


# ---------------------------------------------------------------------------------------------
# Use case diagram (main, 14 UC) - same form as usecase_sv4_standard.png
# ---------------------------------------------------------------------------------------------
ACTOR = "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;fillColor=#66BBE2;strokeColor=#000000;fontSize=11;"
UC = "ellipse;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#000000;fontSize=11;"
SYS = "rounded=0;whiteSpace=wrap;html=1;fillColor=#66BBE2;strokeColor=#000000;verticalAlign=top;fontStyle=1;fontSize=14;"
ASSOC = "endArrow=none;html=1;strokeColor=#000000;"
DEP = "endArrow=open;dashed=1;html=1;strokeColor=#000000;fontSize=10;labelBackgroundColor=#66BBE2;"

UC_LIST = [  # id, col, row, en, vi
    ("UC047", 0, 0, "Create Payment Transaction\nUC047", "Tạo giao dịch thanh toán\nUC047"),
    ("TopUp", 0, 1, "Top Up Wallet", "Nạp tiền vào ví"),
    ("PayWallet", 0, 2, "Pay With Wallet", "Thanh toán bằng ví"),
    ("UC050", 0, 3, "Check Payment Status\nUC050", "Kiểm tra trạng thái thanh toán\nUC050"),
    ("UC051", 0, 4, "Handle Unrecorded Payment\nComplaint - UC051", "Xử lý khiếu nại thanh toán\nchưa ghi nhận - UC051"),
    ("UC058", 0, 5, "View Financial Ledger\nUC058", "Xem sổ quỹ\nUC058"),
    ("UC057", 0, 6, "Generate Financial Documents\nUC057", "Xuất chứng từ tài chính\nUC057"),
    ("UC053", 0, 7, "Manage Advertiser Receivables\nUC053", "Quản lý công nợ doanh nghiệp\nUC053"),
    ("UC054", 0, 8, "Reconcile Payment Mismatch\nUC054", "Đối soát chênh lệch thanh toán\nUC054"),
    ("UC055", 0, 9, "Process Refund Request\nUC055", "Xử lý yêu cầu hoàn tiền\nUC055"),
    ("UC052", 0, 10, "View Cash Flow Dashboard\nUC052", "Xem dashboard dòng tiền\nUC052"),
    ("UC059", 0, 11, "Export Financial Report\nUC059", "Xuất báo cáo tài chính\nUC059"),
    ("UC060", 0, 12, "View Financial Alerts\nUC060", "Xem cảnh báo tài chính\nUC060"),
    ("GenQR", 1, 0, "Generate SePay QR Code", "Sinh mã QR SePay"),
    ("UC049", 1, 3, "Handle Payment Webhook\nUC049", "Xử lý webhook thanh toán\nUC049"),
    ("UC048", 1, 2, "Verify Payment Result\nUC048", "Xác minh kết quả thanh toán\nUC048"),
    ("MatchStmt", 1, 6, "Match Bank Statement", "Đối chiếu sao kê ngân hàng"),
    ("UC056", 1, 9, "Adjust Reading or\nCampaign Rights - UC056", "Điều chỉnh quyền đọc /\nquảng cáo - UC056"),
]
ACTORS = [  # id, side, row, en, vi
    ("Customer", "L", 1.5, "CUSTOMER\nReader / Advertiser", "KHÁCH HÀNG\nĐộc giả / Doanh nghiệp"),
    ("Accountant", "L", 7, "ACCOUNTANT\nFinance Staff", "KẾ TOÁN\nNhân viên tài chính"),
    ("Chief", "L", 10.5, "CHIEF ACCOUNTANT\nApprover (2nd eye)", "KẾ TOÁN TRƯỞNG\nNgười duyệt (mắt 2)"),
    ("Gateway", "R", 2.5, "Payment Gateway\nSePay", "Cổng thanh toán\nSePay"),
    ("Bank", "R", 6, "Bank Partner\nBank Statement", "Ngân hàng\nSao kê"),
    ("Modules", "R", 9, "SV1 / SV3 Modules\nPayment / RefundCompletedEvent", "Module SV1 / SV3\nPayment / RefundCompletedEvent"),
]
UC_ASSOC = [("Customer", "UC047"), ("Customer", "TopUp"), ("Customer", "UC050"), ("Customer", "UC051"),
            ("Accountant", "UC051"), ("Accountant", "UC058"), ("Accountant", "UC057"), ("Accountant", "UC053"),
            ("Accountant", "UC054"), ("Accountant", "UC055"), ("Accountant", "UC052"), ("Accountant", "UC060"),
            ("Chief", "UC055"), ("Chief", "UC052"), ("Chief", "UC059"),
            ("UC049", "Gateway"), ("UC049", "Modules"), ("MatchStmt", "Bank"), ("UC056", "Modules")]
UC_DEPS = [("UC047", "GenQR", "include"), ("TopUp", "UC047", "include"), ("UC049", "UC048", "include"),
           ("UC051", "MatchStmt", "include"), ("UC051", "UC049", "include"), ("UC054", "MatchStmt", "include"),
           ("UC055", "UC056", "include"), ("PayWallet", "UC047", "extend"), ("UC057", "UC058", "extend"),
           ("UC059", "UC052", "extend")]


def usecase(lang):
    li = 0 if lang == "en" else 1
    cells = []
    sys_x, sys_y, row_h, uc_w, uc_h = 260, 70, 75, 230, 56
    rows = 13
    sys_w, sys_h = 2 * 330 + 80, rows * row_h + 60
    title = ("LocalPress — Finance, Payment and Accounting (SV4, UC047 - UC060)",
             "LocalPress — Tài chính, Thanh toán và Kế toán (SV4, UC047 - UC060)")[li]
    cells.append(f'<mxCell id="title" value="&lt;b&gt;{esc(title)}&lt;/b&gt;" style="text;html=1;align=center;fontSize=16;" '
                 f'vertex="1" parent="1"><mxGeometry x="20" y="10" width="{sys_x * 2 + sys_w}" height="40" as="geometry"/></mxCell>')
    sys_name = ("LocalPress System", "Hệ thống LocalPress")[li]
    cells.append(f'<mxCell id="sys" value="{esc(sys_name)}" style="{SYS}" vertex="1" parent="1">'
                 f'<mxGeometry x="{sys_x}" y="{sys_y}" width="{sys_w}" height="{sys_h}" as="geometry"/></mxCell>')
    for uid, col, row, *labels in UC_LIST:
        x = sys_x + 40 + col * 400
        y = sys_y + 45 + row * row_h
        cells.append(f'<mxCell id="{uid}" value="{esc(labels[li])}" style="{UC}" vertex="1" parent="1">'
                     f'<mxGeometry x="{x}" y="{y}" width="{uc_w}" height="{uc_h}" as="geometry"/></mxCell>')
    for aid, side, row, *labels in ACTORS:
        x = 80 if side == "L" else sys_x + sys_w + 140
        y = sys_y + 30 + row * row_h
        cells.append(f'<mxCell id="{aid}" value="{esc(labels[li])}" style="{ACTOR}" vertex="1" parent="1">'
                     f'<mxGeometry x="{x}" y="{y}" width="30" height="60" as="geometry"/></mxCell>')
    for i, (a, b) in enumerate(UC_ASSOC):
        cells.append(f'<mxCell id="a{i}" style="{ASSOC}" edge="1" parent="1" source="{a}" target="{b}">'
                     f'<mxGeometry relative="1" as="geometry"/></mxCell>')
    col_of = {uid: col for uid, col, *_ in UC_LIST}
    for i, (a, b, kind) in enumerate(UC_DEPS):
        # same column: bracket out to the right so the arrow does not run over other use cases
        extra = ("edgeStyle=orthogonalEdgeStyle;exitX=1;exitY=0.5;entryX=1;entryY=0.5;"
                 if col_of.get(a) == col_of.get(b) else "")
        cells.append(f'<mxCell id="d{i}" value="&amp;lt;&amp;lt;{kind}&amp;gt;&amp;gt;" style="{DEP}{extra}" edge="1" parent="1" '
                     f'source="{a}" target="{b}"><mxGeometry relative="1" as="geometry"/></mxCell>')
    note = ("Solid lines: actor associations · Dashed arrows: include / extend.\n"
            "UC051 replaces manual bank transfer approval: complaint + bank statement + same idempotent webhook logic.\n"
            "UC055 Four-Eyes: proposer and approver are the logged-in users and must differ.",
            "Nét liền: tác nhân sử dụng · Nét đứt: include / extend.\n"
            "UC051 thay duyệt chuyển khoản thủ công: khiếu nại + sao kê + dùng chung logic webhook idempotent.\n"
            "UC055 4 mắt: người đề xuất và người duyệt lấy từ phiên đăng nhập, phải khác nhau.")[li]
    cells.append(f'<mxCell id="note" value="{esc(note)}" style="{STYLE["note"]}" vertex="1" parent="1">'
                 f'<mxGeometry x="{sys_x}" y="{sys_y + sys_h + 20}" width="{sys_w}" height="70" as="geometry"/></mxCell>')
    name = "usecase_sv4" + ("" if lang == "en" else "_vi")
    return wrap(name, cells, sys_x * 2 + sys_w + 200, sys_y + sys_h + 120)


# ---------------------------------------------------------------------------------------------
# ERD of the DB changes (V3, V4)
# ---------------------------------------------------------------------------------------------
TABLE = "swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=28;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;html=1;strokeColor=#000000;fontSize=12;"
ROW = "text;strokeColor=none;align=left;verticalAlign=middle;spacingLeft=6;html=1;fontSize=11;whiteSpace=wrap;"
REL = "edgeStyle=entityRelationEdgeStyle;html=1;strokeColor=#000000;fontSize=10;endArrow={end};startArrow={start};endFill=0;startFill=0;"

ERD_TABLES = [  # id, x, y, color, title(en, vi), rows: (text, highlight)
    ("users", 560, 80, "#66BBE2", ("users (existing)", "users (có sẵn)"),
     [("PK user_id BIGINT", ""), ("email, role, status ...", "")]),
    ("tx", 560, 260, "#66BBE2", ("transactions (existing, changed in V3)", "transactions (có sẵn, sửa ở V3)"),
     [("PK transaction_id BIGINT", ""), ("FK user_id -> users", ""),
      ("subscription_id / purchase_id / campaign_id / original_transaction_id", ""),
      ("transaction_type ENUM(..., REFUND, TOPUP)", "#FFF3C4"), ("amount DECIMAL(12,2)", ""),
      ("payment_method VARCHAR(50): SEPAY | WALLET", ""), ("gateway_transaction_id UNIQUE (order code LP...)", ""),
      ("description VARCHAR(255) NULL", "#C8E6C9"), ("status ENUM(PENDING, SUCCESS, FAILED, REFUNDED)", ""),
      ("expires_at DATETIME NULL (15 min)", "#C8E6C9"), ("CHECK chk_transactions_targets: TOPUP has no target", "#FFF3C4")]),
    ("wallets", 1080, 80, "#C8E6C9", ("wallets (NEW - V3)", "wallets (MỚI - V3)"),
     [("PK wallet_id BIGINT", ""), ("FK user_id -> users, UNIQUE", ""), ("balance DECIMAL(14,2) = 0", ""),
      ("created_at, updated_at", ""), ("CHECK balance >= 0", "")]),
    ("entries", 1080, 300, "#C8E6C9", ("wallet_entries (NEW - V3)", "wallet_entries (MỚI - V3)"),
     [("PK entry_id BIGINT", ""), ("FK wallet_id -> wallets", ""), ("FK transaction_id -> transactions", ""),
      ("direction ENUM(CREDIT, DEBIT)", ""), ("amount DECIMAL(14,2) > 0", ""), ("balance_after DECIMAL(14,2)", ""),
      ("reason VARCHAR(255), created_at", ""), ("UNIQUE (transaction_id, direction)", "")]),
    ("complaints", 40, 80, "#C8E6C9", ("payment_complaints (NEW - V4)", "payment_complaints (MỚI - V4)"),
     [("PK complaint_id BIGINT", ""), ("FK user_id -> users", ""), ("order_code VARCHAR(255) NULL", ""),
      ("amount DECIMAL(12,2) > 0", ""), ("transferred_at DATETIME", ""), ("bank_reference VARCHAR(100) UNIQUE", ""),
      ("note VARCHAR(500)", ""), ("status ENUM(OPEN, RESOLVED, REJECTED)", ""), ("resolution VARCHAR(50)", ""),
      ("resolution_note VARCHAR(500)", ""), ("FK resolved_by -> users NULL", ""), ("resolved_at, created_at", "")]),
]
ERD_RELS = [("users", "tx", "ERmandOne", "ERmany", ("pays", "thanh toán")),
            ("users", "wallets", "ERmandOne", "ERzeroToOne", ("owns", "sở hữu")),
            ("wallets", "entries", "ERmandOne", "ERmany", ("history", "lịch sử")),
            ("tx", "entries", "ERmandOne", "ERmany", ("1 CREDIT + 1 DEBIT max", "tối đa 1 CREDIT + 1 DEBIT")),
            ("users", "complaints", "ERmandOne", "ERmany", ("submits / resolves", "gửi / xử lý"))]


def erd(lang):
    li = 0 if lang == "en" else 1
    cells = []
    title = ("SV4 Database Changes - V3 (Wallet & Top-up), V4 (Payment Complaints)",
             "Thay đổi CSDL SV4 - V3 (Ví & Nạp tiền), V4 (Khiếu nại thanh toán)")[li]
    cells.append(f'<mxCell id="title" value="&lt;b&gt;{esc(title)}&lt;/b&gt;" style="text;html=1;align=center;fontSize=16;" '
                 f'vertex="1" parent="1"><mxGeometry x="40" y="20" width="1500" height="40" as="geometry"/></mxCell>')
    legend = ("Green = new table / column · Yellow = changed enum / constraint · Blue = existing",
              "Xanh lá = bảng / cột mới · Vàng = enum / ràng buộc bị sửa · Xanh dương = có sẵn")[li]
    cells.append(f'<mxCell id="legend" value="{esc(legend)}" style="{STYLE["note"]}" vertex="1" parent="1">'
                 f'<mxGeometry x="40" y="700" width="560" height="40" as="geometry"/></mxCell>')
    for tid, x, y, color, titles, rows in ERD_TABLES:
        w = 460
        cells.append(f'<mxCell id="{tid}" value="{esc(titles[li])}" style="{TABLE}fillColor={color};" vertex="1" parent="1">'
                     f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{28 + 24 * len(rows)}" as="geometry"/></mxCell>')
        for i, (text, hl) in enumerate(rows):
            fill = f"fillColor={hl};" if hl else "fillColor=none;"
            cells.append(f'<mxCell id="{tid}_r{i}" value="{esc(text)}" style="{ROW}{fill}" vertex="1" parent="{tid}">'
                         f'<mxGeometry y="{28 + 24 * i}" width="{w}" height="24" as="geometry"/></mxCell>')
    for i, (a, b, start, end, labels) in enumerate(ERD_RELS):
        cells.append(f'<mxCell id="r{i}" value="{esc(labels[li])}" style="{REL.format(start=start, end=end)}" edge="1" '
                     f'parent="1" source="{a}" target="{b}"><mxGeometry relative="1" as="geometry"/></mxCell>')
    name = "erd_sv4_db_changes" + ("" if lang == "en" else "_vi")
    return wrap(name, cells, 1620, 780)



def check_layout(name, d):
    """Report edges whose orthogonal route would pass through another shape (same rules as swimlane())."""
    lane_order = [k for k, *_ in d["lanes"]]
    rows = {}
    for nid, lane, col, sub, kind, *_ in d["nodes"]:
        rows[nid] = (col, lane_order.index(lane) * 100 + sub, kind)
    occ = {(c, r): nid for nid, (c, r, k) in rows.items()}
    problems = []
    for src, dst, *_ in d["edges"]:
        cs, rs, ks = rows[src]
        cd, rd, kd = rows[dst]
        segs = []
        if cd < cs:
            continue
        if kd == "merge" and ks != "dec":
            segs = [("h", rs, cs, cd), ("v", cd, rs, rd)]
        else:
            segs = [("v", cs, rs, rd), ("h", rd, cs, cd)]
        for kind, fixed, a, b in segs:
            lo, hi = sorted((a, b))
            for (c, r), nid in occ.items():
                if nid in (src, dst):
                    continue
                if kind == "h" and r == fixed and lo < c < hi:
                    problems.append(f"{name}: {src}->{dst} crosses {nid}")
                if kind == "v" and c == fixed and lo < r < hi:
                    problems.append(f"{name}: {src}->{dst} crosses {nid}")
    return problems


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, d in SWIMLANES.items():
        for p in check_layout(name, d):
            print("LAYOUT WARNING", p)
    count = 0
    for name, d in SWIMLANES.items():
        for lang in ("en", "vi"):
            fname = name + ("" if lang == "en" else "_vi") + ".drawio"
            (OUT / fname).write_text(swimlane(name, d["title"], d["lanes"], d["nodes"], d["edges"], lang), encoding="utf-8")
            count += 1
    for lang in ("en", "vi"):
        sfx = "" if lang == "en" else "_vi"
        (OUT / f"usecase_sv4{sfx}.drawio").write_text(usecase(lang), encoding="utf-8")
        (OUT / f"erd_sv4_db_changes{sfx}.drawio").write_text(erd(lang), encoding="utf-8")
        count += 2
    print(count, "draw.io files ->", OUT)


if __name__ == "__main__":
    main()
