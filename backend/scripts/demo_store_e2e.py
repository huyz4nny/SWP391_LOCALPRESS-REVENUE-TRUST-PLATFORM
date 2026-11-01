"""E2E cửa hàng thử (finance.demostore): bấm Mua -> đơn tạo từ server -> trả tiền -> paywall mở -> hoàn toàn bộ -> thu hồi.

Cần: MySQL80, seed_data.sql, backend profile dev với localpress.demo-store.enabled=true (backend/config/application-local.yml),
KHÔNG cần bật client-orders-enabled (đơn tạo từ server nên trình duyệt vẫn bị 403 khi tự tạo đơn).
Chạy: python backend/scripts/demo_store_e2e.py [base_url]   (mặc định http://localhost:8080/api/v1)
Dùng reader.an@gmail.com (user 6: chưa mua bài 1, không có gói, nên thấy được paywall đóng / mở);
giả lập tiền về qua simulate-ipn (chỉ có ở profile dev). Đầu và cuối script tự dọn dữ liệu thử của user 6.
"""
import base64
import json
import subprocess
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/api/v1"
MYSQL = r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
ARTICLE_ID, SLUG = 1, "khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen"
DEMO_PREFIX_HEX = "5B5468E1BBAD5D"  # "[Thử]" (so bằng hex vì dòng lệnh Windows làm sai mã hóa chữ có dấu)
PLAN_ID = 1


def auth(email):
    return "Basic " + base64.b64encode(f"{email}:password".encode()).decode()


READER, READER_ID = auth("reader.an@gmail.com"), 6
STAFF, CHIEF = auth("ketoan@localpress.vn"), auth("admin@localpress.vn")


def call(method, path, body=None, who=READER):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("Content-Type", "application/json")
    if who:
        req.add_header("Authorization", who)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = json.loads(r.read() or b"{}")
            return r.status, raw.get("data", raw) if isinstance(raw, dict) else raw
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw.decode(errors="replace")


def sql(q):
    return subprocess.run([MYSQL, "-uroot", "-ppassword", "localpress_db", "-N", "-e", q],
                          capture_output=True, text=True).stdout.strip()


results = []


def check(name, cond, detail=""):
    results.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


def full_content_len():
    s, b = call("GET", f"/articles/{SLUG}")
    return len((b or {}).get("content") or "") if s == 200 else -1


def pay(order_code, amount):
    """Trả đơn qua ví; ví thiếu thì tạo mã nạp bù và giả lập SePay báo tiền về cho mã nạp bù (tự trả đơn)."""
    s, b = call("POST", f"/finance/orders/code/{order_code}/pay-with-wallet")
    if s == 200:
        return "WALLET"
    s, topup = call("POST", f"/finance/orders/code/{order_code}/shortfall-topup")
    assert s == 200, (s, topup)
    s, b = call("POST", f"/finance/orders/code/{topup['orderCode']}/simulate-ipn", {"amount": float(topup["amount"])})
    return f"TOPUP {topup['orderCode']} autoPay={b.get('autoPay')}"


def cleanup():
    """Chỉ dọn dữ liệu cửa hàng thử của user này: thu hồi bài thử, hủy gói thử, để paywall về trạng thái ban đầu."""
    sql(f"UPDATE article_purchases SET access_status='REVOKED' WHERE user_id={READER_ID} AND article_id={ARTICLE_ID}")
    sql(f"UPDATE subscriptions s JOIN transactions t ON t.subscription_id = s.subscription_id SET s.status='CANCELLED' "
        f"WHERE s.user_id={READER_ID} AND HEX(LEFT(t.description, 5)) = '{DEMO_PREFIX_HEX}'")


cleanup()

# 1. Trước khi mua: chỉ thấy preview
before = full_content_len()
s, cat = call("GET", "/finance/dev/demo-store")
check("Cửa hàng thử mở được (dev + cờ bật)", s == 200 and any(a["id"] == ARTICLE_ID for a in cat.get("articles", [])), s)

# 2. Trình duyệt tự tạo đơn với giá tự đặt -> 403 (Rule 4)
s, _ = call("POST", "/finance/orders", {"orderType": "ARTICLE", "targetId": 1, "amount": 1000})
check("Trình duyệt tự tạo đơn -> 403", s == 403, s)

# 3. Bấm Mua: chỉ gửi loại + id, giá lấy từ DB
s, order = call("POST", "/finance/dev/demo-store/purchase", {"type": "ARTICLE", "itemId": ARTICLE_ID, "amount": 1})
code = order.get("orderCode") if isinstance(order, dict) else None
price = sql(f"SELECT single_price FROM articles WHERE article_id={ARTICLE_ID}")
row = sql(f"SELECT t.transaction_type, t.status, t.amount, p.access_status, p.user_id FROM transactions t "
          f"JOIN article_purchases p ON p.purchase_id = t.purchase_id WHERE t.gateway_transaction_id='{code}'").split("\t")
check("Mua bài -> đơn ARTICLE PENDING gắn lượt mua PENDING của đúng user", s == 200 and row[:2] == ["ARTICLE", "PENDING"]
      and row[3] == "PENDING" and row[4] == str(READER_ID), row)
check("Giá lấy từ DB, bỏ qua amount trình duyệt gửi", row[2] == price, f"{row[2]} vs {price}")

# 3b. Bấm Mua lần nữa khi đơn chưa trả -> trả lại đúng đơn cũ, không tạo đơn thứ 2
s, again = call("POST", "/finance/dev/demo-store/purchase", {"type": "ARTICLE", "itemId": ARTICLE_ID})
n_pending = sql(f"SELECT COUNT(*) FROM transactions WHERE purchase_id = (SELECT purchase_id FROM article_purchases "
                f"WHERE user_id={READER_ID} AND article_id={ARTICLE_ID}) AND status='PENDING'")
check("Mua lại khi đơn còn chờ -> dùng lại đơn cũ", s == 200 and again.get("orderCode") == code and n_pending == "1",
      f"{again.get('orderCode') if isinstance(again, dict) else again} vs {code}; pending={n_pending}")

# 4. Trả tiền -> PaymentSuccessEvent -> mở bài
how = pay(code, float(price))
st = sql(f"SELECT status FROM transactions WHERE gateway_transaction_id='{code}'")
acc = sql(f"SELECT access_status FROM article_purchases WHERE user_id={READER_ID} AND article_id={ARTICLE_ID}")
check("Trả tiền -> đơn SUCCESS, lượt mua ACTIVE", st == "SUCCESS" and acc == "ACTIVE", f"{how}; {st}/{acc}")
after = full_content_len()
check("Paywall mở: content toàn văn (trước đó bị cắt, content rỗng)", after > before >= 0, f"{before} -> {after}")

# 5. Mua lại bài đã có quyền -> 409
s, _ = call("POST", "/finance/dev/demo-store/purchase", {"type": "ARTICLE", "itemId": ARTICLE_ID})
check("Mua lại bài đã có -> 409", s == 409, s)

# 6. Hoàn toàn bộ 4 mắt -> RefundCompletedEvent -> thu hồi
tx_id = sql(f"SELECT transaction_id FROM transactions WHERE gateway_transaction_id='{code}'")
s, ref = call("POST", "/finance/refunds/propose", {"orderId": int(tx_id), "refundAmount": float(price),
                                                   "reason": "E2E cửa hàng thử: hoàn toàn bộ"}, STAFF)
check("Kế toán lập đề xuất hoàn", s == 200, s)
s, _ = call("POST", f"/finance/refunds/{ref['id']}/review-refund", {"approved": True, "reviewNotes": "E2E"}, CHIEF)
acc = sql(f"SELECT access_status FROM article_purchases WHERE user_id={READER_ID} AND article_id={ARTICLE_ID}")
check("Kế toán trưởng duyệt -> lượt mua REVOKED", s == 200 and acc == "REVOKED", f"{s} {acc}")
check("Paywall khóa lại: về bản preview", full_content_len() == before, full_content_len())

# 7. Mua gói hội viên
s, order = call("POST", "/finance/dev/demo-store/purchase", {"type": "SUBSCRIPTION", "itemId": PLAN_ID})
code = order.get("orderCode") if isinstance(order, dict) else None
s, again = call("POST", "/finance/dev/demo-store/purchase", {"type": "SUBSCRIPTION", "itemId": PLAN_ID})
check("Mua lại gói khi đơn còn chờ -> dùng lại đơn cũ", s == 200 and again.get("orderCode") == code, s)
how = pay(code, float(order.get("amount", 0)) if isinstance(order, dict) else 0)
row = sql(f"SELECT t.status, s.status, s.end_date > s.start_date FROM transactions t "
          f"JOIN subscriptions s ON s.subscription_id = t.subscription_id WHERE t.gateway_transaction_id='{code}'").split("\t")
check("Mua gói -> đơn SUCCESS, gói ACTIVE có hạn dùng", row == ["SUCCESS", "ACTIVE", "1"], f"{how}; {row}")
s, _ = call("POST", "/finance/dev/demo-store/purchase", {"type": "SUBSCRIPTION", "itemId": PLAN_ID})
check("Mua lại gói đang dùng -> 409", s == 409, s)
s, _ = call("POST", "/finance/dev/demo-store/purchase", {"type": "ARTICLE", "itemId": "abc"})
check("Mã món hàng không phải số -> 400", s == 400, s)

# 8. Kiểm tra sổ: ví không âm, ví = tổng bút toán
neg = sql("SELECT COUNT(*) FROM wallets WHERE balance < 0")
diff = sql("SELECT COUNT(*) FROM wallets w WHERE w.balance <> (SELECT COALESCE(SUM(CASE direction WHEN 'CREDIT' THEN amount "
           "ELSE -amount END), 0) FROM wallet_entries e WHERE e.wallet_id = w.wallet_id)")
check("Ví không âm và khớp tổng bút toán", neg == "0" and diff == "0", f"{neg}/{diff}")

cleanup()

print(f"\n{sum(results)}/{len(results)} PASS")
sys.exit(0 if all(results) else 1)
