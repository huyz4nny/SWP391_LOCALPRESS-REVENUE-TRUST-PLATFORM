# =============================================================================
# MỞ URL CÔNG KHAI CHO WEBHOOK SEPAY (SV4 - UC049)
# =============================================================================
# SePay ở ngoài Internet không gọi được http://localhost:8080. Script này dùng Cloudflare Quick Tunnel
# (miễn phí, không cần tài khoản) để có 1 địa chỉ https://xxxx.trycloudflare.com trỏ về backend local.
#
# Cách dùng (PowerShell, backend đang chạy ở cổng 8080):
#   powershell -ExecutionPolicy Bypass -File backend/scripts/sepay-tunnel.ps1
# Rồi vào https://my.sepay.vn > Webhooks > Thêm webhook:
#   - Gọi đến URL:      https://<địa-chỉ-in-ra>/api/v1/finance/webhook/sepay
#   - Kiểu chứng thực:  API Key  (dán đúng localpress.sepay.webhook-api-key trong backend/config/application-secrets.yml)
#   - Sự kiện:          Có tiền vào
# Mỗi lần chạy lại tunnel địa chỉ đổi, phải sửa URL trên SePay. Không dùng tunnel thì vẫn có nút "Đồng bộ từ SePay".
# =============================================================================

$ErrorActionPreference = "Stop"
$port = if ($args.Count -gt 0) { $args[0] } else { 8080 }

$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cf) {
    Write-Host "Chưa có cloudflared. Cài bằng 1 trong 2 lệnh:" -ForegroundColor Yellow
    Write-Host "  winget install --id Cloudflare.cloudflared"
    Write-Host "  (hoặc tải file .exe ở https://github.com/cloudflare/cloudflared/releases)"
    exit 1
}

try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$port/actuator/health" -TimeoutSec 3 | Out-Null
} catch {
    Write-Host "Backend chưa chạy ở cổng $port. Chạy backend trước rồi mở tunnel." -ForegroundColor Yellow
}

Write-Host "Đang mở tunnel tới http://localhost:$port ..." -ForegroundColor Cyan
Write-Host "Chép địa chỉ https://....trycloudflare.com bên dưới, thêm /api/v1/finance/webhook/sepay rồi dán vào SePay." -ForegroundColor Cyan
& cloudflared tunnel --url "http://localhost:$port" --no-autoupdate
