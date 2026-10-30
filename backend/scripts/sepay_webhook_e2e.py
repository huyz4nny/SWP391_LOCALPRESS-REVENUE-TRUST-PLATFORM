"""
KIỂM THỬ ĐẦU CUỐI WEBHOOK SEPAY (SV4 - UC048, UC049) với backend thật + MySQL.

Cần: MySQL80 đang chạy, backend profile dev ở cổng 8080, seed_data.sql đã nạp (reader.an@gmail.com / ketoan@localpress.vn, mật khẩu "password").
Backend phải bật localpress.payment.client-orders-enabled=true (ví dụ trong config/application-secrets.yml) vì script tạo đơn thử trực tiếp, mặc định bị chặn (Rule 4).
Chạy ở thư mục gốc repo:
    python backend/scripts/sepay_webhook_e2e.py backend/config/application-secrets.yml
Gửi payload đúng định dạng webhook của SePay (camelCase) vào /api/v1/finance/webhook/sepay và kiểm tra:
sai khóa 401, ghi nhận SUCCESS, mọi đơn trả qua ví (thiếu thì nạp bù đúng phần thiếu, tiền về tự trả đơn), gửi lại cùng id không cộng trùng (kể cả 2 lần đồng thời), chuyển thiếu vào ví rồi trả nốt bằng ví,
nạp ví, không có mã đơn vẫn trả success:true, tiền ra bị bỏ qua, phân quyền xem nhật ký, nút giả lập ghi nguồn SIMULATION.
Khóa webhook đọc từ file secrets, không in ra màn hình. Script tạo thêm vài đơn thử của user 6 trong DB dev.
"""
import base64, json, random, re, sys, threading, urllib.request, urllib.error, subprocess

BASE = "http://localhost:8080/api/v1"
SECRETS = sys.argv[1] if len(sys.argv) > 1 else 'backend/config/application-secrets.yml'
MYSQL = r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

key = None
for line in open(SECRETS, encoding="utf-8"):
    m = re.match(r'\s*webhook-api-key:\s*"?([^"#\s]+)"?', line)
    if m:
        key = m.group(1)
assert key and not key.startswith("<"), "Chưa có webhook-api-key trong application-secrets.yml"

def auth(email):
    return "Basic " + base64.b64encode(f"{email}:password".encode()).decode()

READER = auth("reader.an@gmail.com")
STAFF = auth("ketoan@localpress.vn")

def call(method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw.decode(errors="replace")

def data(resp):
    s, b = resp
    return b.get("data", b) if isinstance(b, dict) else b

def sql(q):
    out = subprocess.run([MYSQL, "-uroot", "-ppassword", "localpress_db", "-N", "-e", q], capture_output=True, text=True)
    return out.stdout.strip()

def webhook(payload, k=None):
    return call("POST", "/finance/webhook/sepay", payload, {"Authorization": f"Apikey {k or key}"})

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

def balance():
    return float(sql("SELECT balance FROM wallets WHERE user_id = 6") or 0)

def sepay_payload(sid, content, amount, ref=None, ttype="in"):
    # Đúng định dạng webhook biến động số dư của SePay (camelCase)
    return {"id": sid, "gateway": "Vietcombank", "transactionDate": "2026-10-22 01:40:00",
            "accountNumber": "0123499999", "subAccount": None, "code": None, "content": content,
            "transferType": ttype, "transferAmount": amount, "accumulated": 19077000,
            "referenceCode": ref or f"FT{sid}", "description": f"BankAPINotify {content}"}

base_id = random.randint(10_000_000, 90_000_000)

# 1. Tạo đơn mua bài thật
s, b = call("POST", "/finance/orders", {"orderType": "ARTICLE", "targetId": 1, "amount": 15000, "description": "E2E mua bài"}, {"Authorization": READER})
order = data((s, b))
code = order.get("orderCode") if isinstance(order, dict) else None
check("Tạo đơn ARTICLE 15.000", s == 200 and code, f"HTTP {s} {code}")

# 2. Sai khóa
s, b = webhook(sepay_payload(base_id, f"{code} chuyen tien", 15000), k="sai-khoa")
check("Sai khóa -> 401, không xử lý", s == 401 and sql(f"SELECT status FROM transactions WHERE gateway_transaction_id='{code}'") == "PENDING", f"HTTP {s}")

# 3. Webhook đúng định dạng SePay, nội dung CK có chữ bao quanh mã đơn
s, b = webhook(sepay_payload(base_id, f"CT DEN:0291 {code} chuyen tien mua bai", 15000))
check("Webhook thật -> 200 success:true SUCCESS", s == 200 and b.get("success") is True and b.get("status") == "SUCCESS", f"HTTP {s} {b.get('status')}")
check("DB: đơn SUCCESS, paid_at có giá trị", sql(f"SELECT CONCAT(status,'|',paid_at IS NOT NULL) FROM transactions WHERE gateway_transaction_id='{code}'") == "SUCCESS|1")

# 4. SePay gửi lại cùng id
s, b = webhook(sepay_payload(base_id, f"CT DEN:0291 {code} chuyen tien mua bai", 15000))
check("Gửi lại cùng id -> 200 ALREADY_PROCESSED", s == 200 and b.get("success") is True and b.get("status") == "ALREADY_PROCESSED", f"{b.get('status')}")
check("DB: log DUPLICATE_DELIVERY, chỉ 1 dòng có sepay_id", sql(f"SELECT COUNT(*) FROM sepay_webhook_logs WHERE sepay_id={base_id}") == "1"
      and sql(f"SELECT COUNT(*) FROM sepay_webhook_logs WHERE result_status='DUPLICATE_DELIVERY' AND order_code='{code}'") == "1")

# 5. Chuyển thiếu rồi trả nốt bằng ví
s, b = call("POST", "/finance/orders", {"orderType": "ARTICLE", "targetId": 1, "amount": 20000, "description": "E2E chuyển thiếu"}, {"Authorization": READER})
code2 = data((s, b)).get("orderCode")
bal0 = balance()
s, b = webhook(sepay_payload(base_id + 1, f"{code2}", 5000))
check("Chuyển thiếu 5.000/20.000 -> UNDERPAID, đơn vẫn PENDING", b.get("status") == "UNDERPAID_CREDITED_TO_WALLET"
      and sql(f"SELECT status FROM transactions WHERE gateway_transaction_id='{code2}'") == "PENDING", b.get("status"))
check("Ví +5.000", abs(balance() - bal0 - 5000) < 0.01, f"{bal0} -> {balance()}")
bal1 = balance()
s, b = call("POST", f"/finance/orders/code/{code2}/pay-with-wallet", None, {"Authorization": READER})
check("Trả nốt bằng ví -> SUCCESS, ví -20.000", s == 200 and sql(f"SELECT status FROM transactions WHERE gateway_transaction_id='{code2}'") == "SUCCESS"
      and abs(bal1 - balance() - 20000) < 0.01, f"HTTP {s} {bal1} -> {balance()}")

# 6. Nạp ví
s, b = call("POST", "/finance/wallet/topups", {"amount": 50000}, {"Authorization": READER})
tcode = data((s, b)).get("orderCode")
bal2 = balance()
s, b = webhook(sepay_payload(base_id + 2, f"NAP {tcode}", 50000))
check("Nạp ví 50.000 qua webhook -> SUCCESS, ví +50.000", b.get("status") == "SUCCESS" and abs(balance() - bal2 - 50000) < 0.01, f"{b.get('status')} {bal2} -> {balance()}")

# 7. Nội dung không có mã đơn
s, b = webhook(sepay_payload(base_id + 3, "chuyen tien khong ghi ma", 99000))
check("Không có mã đơn -> 200 success:true ORDER_NOT_FOUND (SePay không gửi lại)", s == 200 and b.get("success") is True and b.get("status") == "ORDER_NOT_FOUND", b.get("status"))

# 8. Tiền ra
s, b = webhook(sepay_payload(base_id + 4, f"chuyen di {code}", 10000, ttype="out"))
check("Tiền ra -> IGNORED_OUTGOING", b.get("status") == "IGNORED_OUTGOING", b.get("status"))

# 9. Hai lần gửi cùng id đến đồng thời
s, b = call("POST", "/finance/orders", {"orderType": "ARTICLE", "targetId": 1, "amount": 15000, "description": "E2E đồng thời"}, {"Authorization": READER})
code3 = data((s, b)).get("orderCode")
outs = []
p = sepay_payload(base_id + 5, code3, 15000)
ts = [threading.Thread(target=lambda: outs.append(webhook(p))) for _ in range(2)]
[t.start() for t in ts]; [t.join() for t in ts]
statuses = sorted(o[1].get("status") for o in outs)
check("2 lần đồng thời cùng id -> 1 SUCCESS + 1 ALREADY_PROCESSED", statuses == ["ALREADY_PROCESSED", "SUCCESS"], str(statuses))
check("DB: đúng 1 dòng log mang sepay_id đó", sql(f"SELECT COUNT(*) FROM sepay_webhook_logs WHERE sepay_id={base_id + 5}") == "1")

# 10. Nút "kiểm tra lại" (API SePay)
s, b = call("POST", f"/finance/orders/code/{code3}/check-sepay", None, {"Authorization": READER})
d = data((s, b))
check("check-sepay trả kết quả + trạng thái đơn", s == 200 and isinstance(d, dict) and "order" in d, f"HTTP {s} checked={d.get('checked') if isinstance(d, dict) else d} reason={d.get('reason') if isinstance(d, dict) else ''}")

# 11. Kế toán xem nhật ký; khách không xem được
s, b = call("GET", "/finance/sepay/logs?limit=20", None, {"Authorization": STAFF})
logs = data((s, b))
check("Kế toán xem nhật ký", s == 200 and isinstance(logs, list) and len(logs) >= 8, f"HTTP {s} {len(logs) if isinstance(logs, list) else logs}")
s, b = call("GET", "/finance/sepay/logs", None, {"Authorization": READER})
check("Khách xem nhật ký -> 403", s == 403, f"HTTP {s}")

# 12. Giả lập (profile dev) ghi nguồn SIMULATION
s, b = call("POST", "/finance/orders", {"orderType": "ARTICLE", "targetId": 1, "amount": 15000, "description": "E2E giả lập"}, {"Authorization": READER})
code4 = data((s, b)).get("orderCode")
s, b = call("POST", f"/finance/orders/code/{code4}/simulate-ipn", {}, {"Authorization": READER})
check("Giả lập -> SUCCESS, log nguồn SIMULATION", b.get("status") == "SUCCESS"
      and sql(f"SELECT source FROM sepay_webhook_logs WHERE order_code='{code4}' ORDER BY log_id DESC LIMIT 1") == "SIMULATION", b.get("status"))

# 13. MỌI THANH TOÁN QUA VÍ: ví thiếu -> mã nạp bù đúng phần thiếu -> tiền về tự trả đơn (V6)
bal = balance()
price = int(bal) + 37000
s, b = call("POST", "/finance/orders", {"orderType": "ARTICLE", "targetId": 1, "amount": price, "description": "E2E nạp bù"}, {"Authorization": READER})
code5 = data((s, b)).get("orderCode")
s, b = call("POST", f"/finance/orders/code/{code5}/shortfall-topup", None, {"Authorization": READER})
t1 = data((s, b))
check("Ví thiếu 37.000 -> mã nạp bù đúng 37.000, gắn đơn", s == 200 and float(t1.get("amount", 0)) == 37000 and t1.get("topupForOrder") == code5,
      f"HTTP {s} {t1.get('amount') if isinstance(t1, dict) else t1}")
s, b = call("POST", f"/finance/orders/code/{code5}/shortfall-topup", None, {"Authorization": READER})
check("Mở lại trang -> dùng lại đúng mã nạp bù cũ", data((s, b)).get("orderCode") == t1.get("orderCode"))
s, b = webhook(sepay_payload(base_id + 10, f"{t1['orderCode']} nap bu", 20000))
check("Nạp bù thiếu 20.000 -> tiền vào ví, autoPay INSUFFICIENT, đơn vẫn chờ", b.get("autoPay") == "INSUFFICIENT"
      and sql(f"SELECT status FROM transactions WHERE gateway_transaction_id='{code5}'") == "PENDING", f"{b.get('status')} {b.get('autoPay')}")
s, b = call("POST", f"/finance/orders/code/{code5}/shortfall-topup", None, {"Authorization": READER})
t2 = data((s, b))
check("Mã nạp bù mới cho phần còn thiếu 17.000", float(t2.get("amount", 0)) == 17000 and t2.get("orderCode") != t1.get("orderCode"), str(t2.get("amount")))
s, b = webhook(sepay_payload(base_id + 11, f"{t2['orderCode']}", 17000))
row = sql(f"SELECT CONCAT(status,'|',payment_method) FROM transactions WHERE gateway_transaction_id='{code5}'")
check("Nạp đủ -> tự trả đơn: SUCCESS | WALLET, ví về 0 so với trước", b.get("autoPay") == "PAID" and row == "SUCCESS|WALLET"
      and abs(balance() - (bal + 37000 - price)) < 0.01, f"{b.get('autoPay')} {row} ví {balance()}")
s, b = webhook(sepay_payload(base_id + 11, f"{t2['orderCode']}", 17000))
check("SePay gửi lại tiền nạp bù -> không cộng, không trừ lần 2", b.get("status") == "ALREADY_PROCESSED" and abs(balance() - (bal + 37000 - price)) < 0.01)
s, b = call("POST", "/finance/orders", {"orderType": "ARTICLE", "targetId": 1, "amount": 1000, "description": "E2E ví đủ"}, {"Authorization": READER})
code6 = data((s, b)).get("orderCode")
webhook(sepay_payload(base_id + 12, "NAP them de du", 5000))  # không ảnh hưởng
s, b = call("POST", "/finance/wallet/topups", {"amount": 10000}, {"Authorization": READER})
webhook(sepay_payload(base_id + 13, data((s, b)).get("orderCode"), 10000))
s, b = call("POST", f"/finance/orders/code/{code6}/shortfall-topup", None, {"Authorization": READER})
check("Ví đủ tiền -> không tạo mã nạp bù (409)", s == 409, f"HTTP {s}")
s, b = call("POST", f"/finance/orders/code/{code6}/pay-with-wallet", None, {"Authorization": READER})
check("Ví đủ -> 1 nút trả bằng ví thành công", s == 200 and sql(f"SELECT status FROM transactions WHERE gateway_transaction_id='{code6}'") == "SUCCESS", f"HTTP {s}")

print()
print(sql(f"SELECT log_id, source, IFNULL(sepay_id,'-'), result_status, IFNULL(order_code,'-'), transfer_amount FROM sepay_webhook_logs ORDER BY log_id DESC LIMIT 12"))
ok = sum(1 for _, r in results if r)
print(f"\n{ok}/{len(results)} PASS")
print("ORDERS", code, code2, tcode, code3, code4, code5, code6)
