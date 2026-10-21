# Ảnh màn hình theo luồng swimlane SV4 (giao diện tối)

> Chụp tự động bằng `docs/sv4/03_tools/capture_screens.mjs` ở chế độ dữ liệu mock, 1440x1000. Chụp lại: chạy frontend mock rồi chạy script.

## 01. Trang thanh toán chung, mọi đơn trả qua ví (swimlane 01, UC047 - UC050)

**01_vi_thieu_qr_nap_bu**: Đơn 15.000 ₫, ví 0 ₫: trang tự tạo mã QR nạp bù đúng phần còn thiếu, nội dung CK là mã nạp (UC047, UC050)

![Đơn 15.000 ₫, ví 0 ₫: trang tự tạo mã QR nạp bù đúng phần còn thiếu, nội dung CK là mã nạp (UC047, UC050)](01_thanh_toan_chung/01_vi_thieu_qr_nap_bu.png)

**02_nap_bu_chua_du**: SePay báo về 7.000 ₫: tiền vào ví, đơn vẫn chờ, trang tạo mã nạp bù mới cho 8.000 ₫ còn lại

![SePay báo về 7.000 ₫: tiền vào ví, đơn vẫn chờ, trang tạo mã nạp bù mới cho 8.000 ₫ còn lại](01_thanh_toan_chung/02_nap_bu_chua_du.png)

**03_tu_thanh_toan**: Tiền nạp bù đủ: hệ thống tự trừ ví trả đơn, khách không bấm thêm (autoPay PAID, UC049)

![Tiền nạp bù đủ: hệ thống tự trừ ví trả đơn, khách không bấm thêm (autoPay PAID, UC049)](01_thanh_toan_chung/03_tu_thanh_toan.png)

**04_webhook_lap_lai**: Bắn lại webhook cùng mã giao dịch: ALREADY_PROCESSED, không cộng trùng (Rule 5)

![Bắn lại webhook cùng mã giao dịch: ALREADY_PROCESSED, không cộng trùng (Rule 5)](01_thanh_toan_chung/04_webhook_lap_lai.png)

**05_don_het_han**: Đơn quá 15 phút: "Đơn đã hết hạn thanh toán", tiền đã nạp vẫn nằm trong ví

![Đơn quá 15 phút: "Đơn đã hết hạn thanh toán", tiền đã nạp vẫn nằm trong ví](01_thanh_toan_chung/05_don_het_han.png)

## 02. Ví LocalPress & nạp tiền (swimlane 02)

**01_vi_localpress**: Ví LocalPress /wallet: số dư và biến động (2 lần nạp bù và 1 lần trừ ví ở luồng 01)

![Ví LocalPress /wallet: số dư và biến động (2 lần nạp bù và 1 lần trừ ví ở luồng 01)](02_vi_nap_tien/01_vi_localpress.png)

**02_nap_tien**: Nạp tiền /wallet/topup: chọn nhanh hoặc tự nhập, kiểm tra 10.000 - 50.000.000 ₫, bội số 1.000 (zod)

![Nạp tiền /wallet/topup: chọn nhanh hoặc tự nhập, kiểm tra 10.000 - 50.000.000 ₫, bội số 1.000 (zod)](02_vi_nap_tien/02_nap_tien.png)

**03_loi_validate**: Nhập 5.500 ₫: báo lỗi tiếng Việt, không tạo đơn

![Nhập 5.500 ₫: báo lỗi tiếng Việt, không tạo đơn](02_vi_nap_tien/03_loi_validate.png)

**04_qr_nap_vi**: Đơn TOPUP mở trang thanh toán chung, chỉ có QR (không có tab Ví)

![Đơn TOPUP mở trang thanh toán chung, chỉ có QR (không có tab Ví)](02_vi_nap_tien/04_qr_nap_vi.png)

**05_nap_thanh_cong**: SePay xác nhận: cộng đúng số tiền thực nhận vào ví

![SePay xác nhận: cộng đúng số tiền thực nhận vào ví](02_vi_nap_tien/05_nap_thanh_cong.png)

**06_vi_sau_khi_nap**: Số dư mới và dòng CREDIT trong lịch sử ví

![Số dư mới và dòng CREDIT trong lịch sử ví](02_vi_nap_tien/06_vi_sau_khi_nap.png)

**07_vi_du_tra_mot_nut**: Ví đủ tiền: chỉ một nút "Thanh toán bằng ví", không cần QR

![Ví đủ tiền: chỉ một nút "Thanh toán bằng ví", không cần QR](02_vi_nap_tien/07_vi_du_tra_mot_nut.png)

**08_tra_bang_vi_xong**: Trừ ví xong: đơn đã thanh toán, hiện số dư còn lại

![Trừ ví xong: đơn đã thanh toán, hiện số dư còn lại](02_vi_nap_tien/08_tra_bang_vi_xong.png)

## 03. Khiếu nại thanh toán chưa ghi nhận (swimlane 03, UC051)

**01_form_khieu_nai**: Khách gửi khiếu nại /wallet/complaints (điền sẵn mã đơn, số tiền khi mở từ trang thanh toán)

![Khách gửi khiếu nại /wallet/complaints (điền sẵn mã đơn, số tiền khi mở từ trang thanh toán)](03_khieu_nai/01_form_khieu_nai.png)

**02_da_gui**: Gửi thành công: khiếu nại ở trạng thái Chờ đối soát

![Gửi thành công: khiếu nại ở trạng thái Chờ đối soát](03_khieu_nai/02_da_gui.png)

**03_hang_cho_ke_toan**: Kế toán mở hàng chờ: Ghi nhận vào đơn / Cộng vào ví / Từ chối

![Kế toán mở hàng chờ: Ghi nhận vào đơn / Cộng vào ví / Từ chối](03_khieu_nai/03_hang_cho_ke_toan.png)

**04_xac_nhan_doi_chieu**: Xác nhận đã thấy khoản tiền trên sao kê trước khi ghi nhận

![Xác nhận đã thấy khoản tiền trên sao kê trước khi ghi nhận](03_khieu_nai/04_xac_nhan_doi_chieu.png)

**05_da_ghi_nhan**: Khiếu nại RESOLVED, kết quả "Đã cộng vào ví"

![Khiếu nại RESOLVED, kết quả "Đã cộng vào ví"](03_khieu_nai/05_da_ghi_nhan.png)

## 04. Đối soát kỳ (swimlane 04, UC054)

**01_ky_doi_soat**: Kỳ đối soát: hệ thống vs sao kê, khoản chênh lệch (UC054)

![Kỳ đối soát: hệ thống vs sao kê, khoản chênh lệch (UC054)](04_doi_soat/01_ky_doi_soat.png)

**02_xu_ly_chenh_lech**: Xử lý 1 khoản lệch: bắt buộc ghi chú biện pháp

![Xử lý 1 khoản lệch: bắt buộc ghi chú biện pháp](04_doi_soat/02_xu_ly_chenh_lech.png)

**03_da_xu_ly**: Khoản lệch chuyển Đã xử lý; nút Đóng kỳ chỉ cho Kế toán trưởng

![Khoản lệch chuyển Đã xử lý; nút Đóng kỳ chỉ cho Kế toán trưởng](04_doi_soat/03_da_xu_ly.png)

## 05. Hoàn tiền 4 mắt (swimlane 05, UC055, UC056)

**01_danh_sach_de_xuat**: Danh sách đề xuất hoàn tiền; người lập không có nút duyệt (UC055)

![Danh sách đề xuất hoàn tiền; người lập không có nút duyệt (UC055)](05_hoan_tien_4_mat/01_danh_sach_de_xuat.png)

**02_lap_de_xuat**: Mắt 1: kế toán viên lập đề xuất, tối đa bằng số khách đã trả (Rule 11)

![Mắt 1: kế toán viên lập đề xuất, tối đa bằng số khách đã trả (Rule 11)](05_hoan_tien_4_mat/02_lap_de_xuat.png)

**03_ke_toan_truong_duyet**: Mắt 2: kế toán trưởng xem và duyệt / từ chối (UC055, UC056)

![Mắt 2: kế toán trưởng xem và duyệt / từ chối (UC055, UC056)](05_hoan_tien_4_mat/03_ke_toan_truong_duyet.png)

## 06. Tổng quan, đơn, chứng từ, sổ quỹ, nhật ký SePay (swimlane 06, UC052, UC057, UC058, UC048, UC049)

**01_tong_quan**: Tổng quan tài chính: doanh thu thực thu, biểu đồ 14 ngày, việc cần xử lý (UC052)

![Tổng quan tài chính: doanh thu thực thu, biểu đồ 14 ngày, việc cần xử lý (UC052)](06_bao_cao_so_quy/01_tong_quan.png)

**02_don_thanh_toan**: Danh sách đơn thanh toán: lọc loại, trạng thái, tìm kiếm

![Danh sách đơn thanh toán: lọc loại, trạng thái, tìm kiếm](06_bao_cao_so_quy/02_don_thanh_toan.png)

**03_chi_tiet_don**: Chi tiết đơn đã thanh toán: các lần thanh toán, nút in chứng từ, lập đề xuất hoàn

![Chi tiết đơn đã thanh toán: các lần thanh toán, nút in chứng từ, lập đề xuất hoàn](06_bao_cao_so_quy/03_chi_tiet_don.png)

**04_hoa_don_dien_tu**: Hóa đơn điện tử (UC057)

![Hóa đơn điện tử (UC057)](06_bao_cao_so_quy/04_hoa_don_dien_tu.png)

**05_so_quy**: Sổ quỹ: bút toán Có / Nợ, số dư ròng tính từ các dòng (UC058)

![Sổ quỹ: bút toán Có / Nợ, số dư ròng tính từ các dòng (UC058)](06_bao_cao_so_quy/05_so_quy.png)

**06_nhat_ky_sepay**: Nhật ký SePay: mỗi khoản tiền SePay báo về có 1 dòng kèm payload gốc (UC048, UC049)

![Nhật ký SePay: mỗi khoản tiền SePay báo về có 1 dòng kèm payload gốc (UC048, UC049)](06_bao_cao_so_quy/06_nhat_ky_sepay.png)

**07_payload_sepay**: Xem payload gốc của 1 lần nhận

![Xem payload gốc của 1 lần nhận](06_bao_cao_so_quy/07_payload_sepay.png)

