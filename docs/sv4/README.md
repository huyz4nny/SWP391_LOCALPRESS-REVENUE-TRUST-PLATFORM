# SV4 (Huy) — Tài liệu Kế toán, Thanh toán & Đối soát

## 01_output — FILE CẦN DÙNG (nộp, review, bảo vệ)

| File | Nội dung |
|---|---|
| `01_output/SWIMLANE_SV4.md` | 7 swimlane + bảng giải thích từng bước (tiếng Việt) |
| `01_output/USECASE_SV4.md` | Sơ đồ use case 14 UC + 2 sơ đồ tách theo phía, giải thích actor / UC |
| `01_output/DB_CHANGES_SV4.md` | Thay đổi database V3, V4: bảng, cột, ràng buộc, lý do, câu SQL kiểm tra |
| `01_output/diagrams/swimlane_sv4_00_overview.png` | Tổng quan: thanh toán → khiếu nại → hoàn tiền, 1 điểm kết thúc |
| `01_output/diagrams/swimlane_sv4_01_payment.png` | Trang thanh toán chung (ví / QR SePay, webhook) |
| `01_output/diagrams/swimlane_sv4_02_wallet_topup.png` | Nạp ví |
| `01_output/diagrams/swimlane_sv4_03_complaint.png` | Khiếu nại thanh toán chưa ghi nhận (UC051) |
| `01_output/diagrams/swimlane_sv4_04_reconciliation.png` | Đối soát ngân hàng, công nợ doanh nghiệp |
| `01_output/diagrams/swimlane_sv4_05_refund.png` | Hoàn tiền 4 mắt |
| `01_output/diagrams/swimlane_sv4_06_reports.png` | Dashboard, sổ quỹ, chứng từ, báo cáo, cảnh báo |
| `01_output/diagrams/usecase_sv4.png` | Use case chính (form chuẩn của nhóm) |
| `01_output/diagrams/usecase_sv4_customer.png` | Use case phía khách hàng |
| `01_output/diagrams/usecase_sv4_backoffice.png` | Use case phía kế toán, chia theo Iteration |
| `01_output/diagrams/erd_sv4_db_changes.png` | Sơ đồ ER các bảng mới / bị sửa |
| `01_output/drawio/*.drawio` | **Bản chỉnh sửa bằng tay** (draw.io) của 7 swimlane, use case chính, sơ đồ ER — tiếng Anh và `_vi` tiếng Việt (18 file) |
| `01_output/diagrams_vi/*_vi.png` | **Bản tiếng Việt** của toàn bộ 11 sơ đồ trên (cùng tên, thêm hậu tố `_vi`) |

## 02_source — mã nguồn sơ đồ (sửa ở đây rồi render lại)

`02_source/*.puml` — PlantUML bản tiếng Anh, cùng tên với file PNG.
`02_source/vi/*_vi.puml` — PlantUML bản tiếng Việt (render ra `01_output/diagrams_vi/`). Sửa nghiệp vụ thì sửa cả 2 bản.

## Chỉnh sửa bằng tay (draw.io)

1. Mở https://app.diagrams.net (hoặc cài draw.io Desktop, hoặc extension "Draw.io Integration" trong VS Code / Cursor).
2. File → Open from → Device → chọn file trong `01_output/drawio/`.
3. Kéo thả hộp, sửa chữ (double-click), kéo làn; mũi tên tự bám theo hình.
4. Lưu lại file `.drawio` (Ctrl+S) và xuất ảnh: File → Export as → PNG.

Lưu ý: sau khi sửa tay trong draw.io thì bản `.drawio` là bản chính; bản PlantUML (`02_source`) sẽ không tự cập nhật theo.
Chạy lại `03_tools/gen_drawio.py` sẽ GHI ĐÈ các file `.drawio` — chỉ chạy khi muốn tạo lại từ đầu.

## 03_tools — công cụ tự sinh

`03_tools/gen_puml.py` — **nguồn gốc của 7 swimlane**: mỗi sơ đồ định nghĩa 1 lần, song ngữ (`«english§tiếng việt»`), sinh ra 14 file `.puml` (EN + VI luôn cùng cấu trúc). Sửa swimlane thì sửa ở đây rồi chạy lại.
`03_tools/gen_drawio.py` — sinh 18 file `.drawio` (có tự kiểm tra mũi tên không cắt qua hộp).
`03_tools/render_puml.py` — render toàn bộ `.puml` ra PNG qua server plantuml.com (không cần cài Java / Graphviz):

```bash
python docs/sv4/03_tools/gen_puml.py
python docs/sv4/03_tools/render_puml.py docs/sv4/02_source/*.puml docs/sv4/02_source/vi/*.puml
```

## Các file hỗ trợ khác do AI sinh (ngoài thư mục này)

| File | Mục đích | Có commit không |
|---|---|---|
| `backend/scripts/sv4_finance_e2e.sh` | Test end-to-end 57 kịch bản API thật + MySQL (chạy khi demo) | Có |
| `backend/config/application-secrets.example.yml` | Mẫu cấu hình khóa SePay | Có |
| `backend/config/application-secrets.yml` | **Khóa SePay thật, chỉ ở máy local** | **Không** (đã `.gitignore`) |

## Khóa SePay

- Không còn khóa nào trong `application-dev.yml`. Backend tự đọc `backend/config/application-secrets.yml` nếu có (`spring.config.import: optional:file:./config/application-secrets.yml`), hoặc biến môi trường `SEPAY_*`.
- Máy khác clone repo: copy `application-secrets.example.yml` thành `application-secrets.yml` rồi điền giá trị.
- Khóa live cũ đã từng bị push lên GitHub (commit `4d624b6`, nhánh `origin/Huy`), nên **phải đổi khóa trên dashboard SePay**.
