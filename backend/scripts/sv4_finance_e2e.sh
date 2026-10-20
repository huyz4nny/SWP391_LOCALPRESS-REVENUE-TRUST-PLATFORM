#!/usr/bin/env bash
# Usage: start backend (profile dev) + MySQL, then: bash backend/scripts/sv4_finance_e2e.sh
# E2E smoke test SV4 finance against running backend + MySQL (seed users, password "password").
B=http://localhost:8080/api/v1/finance
AN="-u reader.an@gmail.com:password"; MAI="-u reader.mai@gmail.com:password"
ADV="-u adv.canghaiphong@gmail.com:password"; KT="-u ketoan@localpress.vn:password"
# Webhook key: env SEPAY_WEBHOOK_API_KEY, else read from backend/config/application-secrets.yml (gitignored). Never hardcode it.
WEBHOOK_KEY=${SEPAY_WEBHOOK_API_KEY:-$(sed -n 's/^ *webhook-api-key: *"\{0,1\}\([^"]*\)"\{0,1\} *$/\1/p' "$(dirname "$0")/../config/application-secrets.yml" 2>/dev/null)}
[ -z "$WEBHOOK_KEY" ] && { echo "Missing webhook key: set SEPAY_WEBHOOK_API_KEY or create backend/config/application-secrets.yml"; exit 1; }
H='-H Content-Type:application/json'; KEY=(-H "Authorization: Apikey $WEBHOOK_KEY")
NOW=$(date +%Y-%m-%dT%H:%M:%S); RUN=$(date +%s)
PASS=0; FAIL=0
ok(){ if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1 ($3)"; else FAIL=$((FAIL+1)); echo "FAIL  $1 expected=$2 got=$3"; fi; }
code(){ curl -s -o /dev/null -w "%{http_code}" "$@"; }
field(){ python -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1"; }
balance(){ curl -s $1 $B/wallet/me | field "['data']['balance']"; }
sql(){ mysql -uroot -ppassword localpress_db -N -e "$1" 2>/dev/null; }

echo "== WALLET TOP-UP"
B0=$(balance "$AN")
T=$(curl -s $AN $H -X POST $B/wallet/topups -d '{"amount":100000}' | field "['data']['orderCode']")
ok "topup order created" LP "${T:0:2}"
ok "topup below min -> 400" 400 $(code $AN $H -X POST $B/wallet/topups -d '{"amount":5000}')
ok "topup above max -> 400" 400 $(code $AN $H -X POST $B/wallet/topups -d '{"amount":60000000}')
ok "guest topup -> 401" 401 $(code $H -X POST $B/wallet/topups -d '{"amount":100000}')
ok "webhook wrong key -> 401" 401 $(code $H -H "Authorization: Apikey wrong" -X POST $B/webhook/sepay -d "{\"content\":\"$T\",\"amount\":100000,\"referenceCode\":\"R$RUN\"}")
ok "webhook no key -> 401" 401 $(code $H -X POST $B/webhook/sepay -d "{\"content\":\"$T\",\"amount\":100000}")
ok "webhook topup SUCCESS" SUCCESS $(curl -s $H "${KEY[@]}" -X POST $B/webhook/sepay -d "{\"content\":\"CK $T\",\"amount\":100000,\"referenceCode\":\"R$RUN\"}" | field "['status']")
ok "webhook replay ALREADY_PROCESSED" ALREADY_PROCESSED $(curl -s $H "${KEY[@]}" -X POST $B/webhook/sepay -d "{\"content\":\"CK $T\",\"amount\":100000,\"referenceCode\":\"R$RUN\"}" | field "['status']")
B1=$(balance "$AN"); ok "balance +100000 exactly once" 100000.0 $(python -c "print(float($B1)-float($B0))")
ok "webhook unknown order" ORDER_NOT_FOUND $(curl -s $H "${KEY[@]}" -X POST $B/webhook/sepay -d '{"content":"LP0000000000ZZZZ","amount":1000}' | field "['status']")

echo "== READER PAYS ARTICLE (purchase_id=1)"
A=$(curl -s $AN $H -X POST $B/checkout -d '{"orderType":"ARTICLE_PURCHASE","targetId":1,"amount":15000,"targetTitle":"E2E article","paymentMethod":"BANK_TRANSFER"}' | field "['data']['orderCode']")
ok "article order payment method forced SEPAY" SEPAY $(sql "SELECT payment_method FROM transactions WHERE gateway_transaction_id='$A'")
ok "payment view has QR" True $(curl -s $AN $B/orders/code/$A | field "['data']['qrCodeUrl'] is not None")
ok "other reader view -> 403 (IDOR)" 403 $(code $MAI $B/orders/code/$A)
ok "other reader status poll -> 403" 403 $(code $MAI $B/orders/code/$A/status)
ok "other reader pay-with-wallet -> 403" 403 $(code $MAI -X POST $B/orders/code/$A/pay-with-wallet)
ok "pay with wallet" WALLET $(curl -s $AN -X POST $B/orders/code/$A/pay-with-wallet | field "['data']['paymentMethod']")
B2=$(balance "$AN"); ok "balance -15000" -15000.0 $(python -c "print(float($B2)-float($B1))")
curl -s $AN -X POST $B/orders/code/$A/pay-with-wallet > /dev/null
B3=$(balance "$AN"); ok "double click pay -> no second debit" 0.0 $(python -c "print(float($B3)-float($B2))")
ok "poll status paid" SUCCESS $(curl -s $AN $B/orders/code/$A/status | field "['data']['status']")

echo "== QR OVERPAY / UNDERPAY"
O=$(curl -s $AN $H -X POST $B/orders -d '{"orderType":"ARTICLE","targetId":1,"amount":15000}' | field "['data']['orderCode']")
ok "overpay 20000 -> SUCCESS" SUCCESS $(curl -s $H "${KEY[@]}" -X POST $B/webhook/sepay -d "{\"content\":\"$O\",\"amount\":20000,\"referenceCode\":\"O$RUN\"}" | field "['status']")
ok "excess 5000 credited" 5000.00 $(sql "SELECT amount FROM transactions WHERE gateway_transaction_id='$O-EXCESS'")
U=$(curl -s $AN $H -X POST $B/orders -d '{"orderType":"ARTICLE","targetId":1,"amount":900000}' | field "['data']['orderCode']")
ok "wallet insufficient -> 402" 402 $(code $AN -X POST $B/orders/code/$U/pay-with-wallet)
ok "underpay -> credited to wallet" UNDERPAID_CREDITED_TO_WALLET $(curl -s $AN $H -X POST $B/orders/code/$U/simulate-ipn -d "{\"amount\":1000,\"referenceCode\":\"U$RUN\"}" | field "['status']")
ok "underpaid order still PENDING" PENDING $(sql "SELECT status FROM transactions WHERE gateway_transaction_id='$U'")
ok "same partial replay not credited twice" ALREADY_PROCESSED $(curl -s $AN $H -X POST $B/orders/code/$U/simulate-ipn -d "{\"amount\":1000,\"referenceCode\":\"U$RUN\"}" | field "['status']")

echo "== ADVERTISER BOOKING (campaign_id=1)"
D=$(curl -s $ADV $H -X POST $B/orders -d '{"orderType":"AD_CAMPAIGN","targetId":1,"amount":2000000,"targetTitle":"E2E banner"}' | field "['data']['orderCode']")
ok "reader cannot see advertiser order -> 403" 403 $(code $AN $B/orders/code/$D)
sql "UPDATE transactions SET expires_at = NOW() - INTERVAL 1 MINUTE WHERE gateway_transaction_id='$D'"
ok "pay expired order with wallet -> 410" 410 $(code $ADV -X POST $B/orders/code/$D/pay-with-wallet)
ok "late ad payment -> wallet (Rule 6)" LATE_PAYMENT_CREDITED_TO_WALLET $(curl -s $H "${KEY[@]}" -X POST $B/webhook/sepay -d "{\"content\":\"$D\",\"amount\":2000000,\"referenceCode\":\"D$RUN\"}" | field "['status']")
ok "late ad order FAILED" FAILED $(sql "SELECT status FROM transactions WHERE gateway_transaction_id='$D'")
D2=$(curl -s $ADV $H -X POST $B/orders -d '{"orderType":"AD_CAMPAIGN","targetId":1,"amount":500000}' | field "['data']['orderCode']")
ok "advertiser on-time QR -> SUCCESS" SUCCESS $(curl -s $H "${KEY[@]}" -X POST $B/webhook/sepay -d "{\"content\":\"$D2\",\"amount\":500000,\"referenceCode\":\"E$RUN\"}" | field "['status']")

echo "== COMPLAINT (UC051)"
C=$(curl -s $AN $H -X POST $B/orders -d '{"orderType":"ARTICLE","targetId":1,"amount":15000}' | field "['data']['orderCode']")
CID=$(curl -s $AN $H -X POST $B/complaints -d "{\"orderCode\":\"$C\",\"amount\":15000,\"transferredAt\":\"$NOW\",\"bankReference\":\"FTC$RUN\"}" | field "['data']['complaintId']")
ok "duplicate bank ref -> 409" 409 $(code $AN $H -X POST $B/complaints -d "{\"amount\":15000,\"transferredAt\":\"$NOW\",\"bankReference\":\"ftc$RUN\"}")
ok "complain on other's order -> 403" 403 $(code $MAI $H -X POST $B/complaints -d "{\"orderCode\":\"$C\",\"amount\":15000,\"transferredAt\":\"$NOW\",\"bankReference\":\"FTX$RUN\"}")
ok "reader cannot open queue -> 403" 403 $(code $AN $B/complaints)
ok "reader cannot resolve -> 403" 403 $(code $AN $H -X POST $B/complaints/$CID/resolve -d '{}')
ok "wallet target while order pending -> 409" 409 $(code $KT $H -X POST "$B/complaints/$CID/resolve?target=WALLET" -d '{}')
ok "resolve into order" SUCCESS $(curl -s $KT $H -X POST "$B/complaints/$CID/resolve?target=ORDER" -d '{"note":"matched statement"}' | field "['data']['resolution']")
ok "order paid after complaint" SUCCESS $(sql "SELECT status FROM transactions WHERE gateway_transaction_id='$C'")
ok "real webhook later -> no double" ALREADY_PROCESSED $(curl -s $H "${KEY[@]}" -X POST $B/webhook/sepay -d "{\"content\":\"$C\",\"amount\":15000,\"referenceCode\":\"FTC$RUN\"}" | field "['status']")
ok "resolve again -> 409" 409 $(code $KT $H -X POST $B/complaints/$CID/resolve -d '{}')
R=$(curl -s $AN $H -X POST $B/complaints -d "{\"amount\":50000,\"transferredAt\":\"$NOW\",\"bankReference\":\"FTR$RUN\"}" | field "['data']['complaintId']")
ok "reject without reason -> 400" 400 $(code $KT $H -X POST $B/complaints/$R/reject -d '{"note":""}')
ok "reject with reason" REJECTED $(curl -s $KT $H -X POST $B/complaints/$R/reject -d '{"note":"not on statement"}' | field "['data']['status']")
W=$(curl -s $AN $H -X POST $B/complaints -d "{\"amount\":30000,\"transferredAt\":\"$NOW\",\"bankReference\":\"FTW$RUN\"}" | field "['data']['complaintId']")
ok "no-order complaint -> wallet" CREDITED_WALLET $(curl -s $KT $H -X POST $B/complaints/$W/resolve -d '{}' | field "['data']['resolution']")
ok "old manual-transfer API removed" 404 $(code $KT $B/manual-transfers/pending)

echo "== FOUR-EYES REFUND (UC055/UC056)"
ADM="-u admin@localpress.vn:password"
TXID=$(sql "SELECT transaction_id FROM transactions WHERE gateway_transaction_id='$A'")
RID=$(curl -s $KT $H -X POST $B/refunds/propose -d "{\"orderId\":$TXID,\"refundAmount\":15000,\"reason\":\"E2E refund\"}" | field "['data']['id']")
ok "refund proposed by logged-in accountant" 2 $(sql "SELECT proposed_by FROM refund_requests WHERE refund_id=$RID")
ok "refund cap (Rule 11) -> 400" 400 $(code $KT $H -X POST $B/refunds/propose -d "{\"orderId\":$TXID,\"refundAmount\":1000,\"reason\":\"over cap\"}")
ok "same person approves -> 403 (four-eyes)" 403 $(code $KT $H -X POST $B/refunds/$RID/review-refund -d '{"approved":true,"reviewNotes":"self"}')
ok "forged X-User-Id ignored -> still 403" 403 $(code $KT -H "X-User-Id: 1" $H -X POST $B/refunds/$RID/review-refund -d '{"approved":true,"reviewNotes":"forged"}')
ok "second person approves" COMPLETED $(curl -s $ADM $H -X POST $B/refunds/$RID/review-refund -d '{"approved":true,"reviewNotes":"ok"}' | field "['data']['status']")
ok "original transaction REFUNDED" REFUNDED $(sql "SELECT status FROM transactions WHERE transaction_id=$TXID")

echo "== ALERTS"
curl -s $AN $H -X POST $B/complaints -d "{\"amount\":12000,\"transferredAt\":\"$NOW\",\"bankReference\":\"FTA$RUN\"}" > /dev/null
ok "open complaint raises COMPLAINT_OPEN alert" True $(curl -s $KT $B/alerts | python -c "import sys,json;d=json.load(sys.stdin);d=d.get('data',d);print(any(a.get('type')=='COMPLAINT_OPEN' for a in d))")

echo "== ACCOUNTING VIEWS"
ok "ledger list" 200 $(code $KT "$B/ledger")
ok "dashboard" 200 $(code $KT "$B/dashboard")
ok "reconciliation" 200 $(code $KT "$B/reconciliation")
ok "refunds" 200 $(code $KT "$B/refunds")
ok "reader cannot open ledger -> 403" 403 $(code $AN "$B/ledger")
ok "wallet balances never negative" 0 $(sql "SELECT COUNT(*) FROM wallets WHERE balance < 0")
ok "wallet = sum of entries" 0 $(sql "SELECT COUNT(*) FROM wallets w WHERE w.balance <> (SELECT COALESCE(SUM(CASE direction WHEN 'CREDIT' THEN amount ELSE -amount END),0) FROM wallet_entries e WHERE e.wallet_id=w.wallet_id)")

echo; echo "RESULT: $PASS passed, $FAIL failed"
