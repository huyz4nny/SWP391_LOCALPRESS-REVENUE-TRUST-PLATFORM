-- ====================================================================
-- LocalPress Database Seed Data - V2__insert_seed_data.sql
-- Bối cảnh: Báo điện tử địa phương TP. Hải Phòng
-- Tương thích 100% với V1__create_tables.sql & Frontend React
-- Password chung cho mọi tài khoản: password
-- ====================================================================

USE localpress_db;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS (Tài khoản người dùng các vai trò)
INSERT INTO users (user_id, email, password_hash, full_name, phone, avatar_url, role, status) VALUES
(1, 'admin@localpress.vn', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Vũ Quản Trị Hệ Thống', '0909999999', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120', 'SYSTEM_ADMIN', 'ACTIVE'),
(2, 'ketoan@localpress.vn', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Lê Kế Toán (SV4 Leader)', '0903456789', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120', 'ACCOUNTANT', 'ACTIVE'),
(3, 'bientap@localpress.vn', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Nguyễn Văn Biên Tập (SV2)', '0902345678', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120', 'EDITOR', 'ACTIVE'),
(4, 'phongvien@localpress.vn', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Hoàng Minh Phóng Viên (SV5)', '0901234567', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', 'AUTHOR', 'ACTIVE'),
(5, 'adv.canghaiphong@gmail.com', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Đặng Quang Huy (Logistics SV1)', '0934567890', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120', 'ADVERTISER', 'ACTIVE'),
(6, 'reader.an@gmail.com', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Nguyễn Văn An (Độc giả Free SV3)', '0912345678', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120', 'READER', 'ACTIVE'),
(7, 'reader.mai@gmail.com', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Trần Thị Mai (Độc giả VIP SV3)', '0988776655', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120', 'READER', 'ACTIVE'),
(8, 'kiemduyet@localpress.vn', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Phạm Kiểm Duyệt Bình Luận', '0907778899', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120', 'STAFF', 'ACTIVE');

-- 1.0.1 Kế toán trưởng (SV4, mắt 2 duyệt hoàn tiền / chốt kỳ đối soát). Bảng users không có role FINANCE_MANAGER
-- (thuộc module identity), nhóm thống nhất SYSTEM_ADMIN giữ vai Kế toán trưởng (FinanceCurrentUser.FINANCE_MANAGER_ROLES).
-- Không ghi user_id để không trùng id với dữ liệu seed của module khác; mật khẩu "password".
INSERT INTO users (email, password_hash, full_name, phone, avatar_url, role, status) VALUES
('ketoantruong@localpress.vn', '$2a$10$uUo2QJyp3FinXNd8TdhkfuZewBo/MxYQU918uS9BacWR7MYGr4Lfa', 'Trần Kế Toán Trưởng (SV4)', '0903456790', NULL, 'SYSTEM_ADMIN', 'ACTIVE');

-- 1.1 USER DEVICES (Khống chế tối đa 2 thiết bị - Độc giả Mai)
INSERT INTO user_devices (device_id, user_id, device_name, device_type, device_token, ip_address) VALUES
(1, 7, 'iPhone 15 Pro Max (iOS)', 'MOBILE', 'TOKEN_MAI_IPHONE_15_PRO', '118.70.128.45'),
(2, 7, 'MacBook Air M2 (macOS)', 'DESKTOP', 'TOKEN_MAI_MACBOOK_AIR_M2', '14.232.208.12');

-- 2. CATEGORIES (Chuyên mục báo địa phương Hải Phòng)
INSERT INTO categories (category_id, parent_id, name, slug, description, status) VALUES
(1, NULL, 'Thời sự & Chính trị', 'thoi-su', 'Tin tức thời sự nổi bật của thành phố Hải Phòng và duyên hải Bắc Bộ', 'ACTIVE'),
(2, NULL, 'Kinh tế & Đầu tư', 'kinh-te', 'Cảng biển, dịch vụ logistics, khu kinh tế Đình Vũ - Cát Hải', 'ACTIVE'),
(3, NULL, 'Pháp luật & Điều tra', 'phap-luat', 'Phóng sự điều tra độc quyền, an ninh trật tự cửa biển Đất Cảng', 'ACTIVE'),
(4, NULL, 'Văn hóa & Đời sống', 'van-hoa', 'Lễ hội chọi trâu Đồ Sơn, danh thắng Cát Bà, ẩm thực Hải Phòng', 'ACTIVE'),
(5, NULL, 'Nông nghiệp Xanh', 'nong-nghiep', 'Mô hình OCOP, lúa rươi Kiến Thụy, sinh thái tuần hoàn', 'ACTIVE'),
(6, NULL, 'Công nghệ & Chuyển đổi số', 'cong-nghe', 'Cảng biển thông minh Smart Port và sáng kiến số Hải Phòng', 'ACTIVE');

-- 3. TAGS (Thẻ chủ đề nóng)
INSERT INTO tags (tag_id, name, slug) VALUES
(1, 'Cảng Hải Phòng', 'cang-hai-phong'),
(2, 'Phóng sự điều tra', 'phong-su-dieu-tra'),
(3, 'Thu hút FDI', 'thu-hut-fdi'),
(4, 'Đất Cảng', 'dat-cang');

-- 4. AD SLOTS (Vị trí quảng cáo - Khớp 100% với SlotCode của Frontend React)
INSERT INTO ad_slots (slot_id, slot_code, name, page_location, category_id, device_type, dimensions, capacity, inventory_mode, base_price, pricing_type, status) VALUES
(1, 'SLOT-TOP-LEADERBOARD', 'Top Leaderboard (Đầu trang chủ)', 'Trang chủ, ngay dưới Header', NULL, 'ALL', '1140x120', 1, 'EXCLUSIVE', 1500000.00, 'CPD', 'ACTIVE'),
(2, 'SLOT-ARTICLE-INLINE', 'Inline Banner (Thân bài viết)', 'Nội dung chi tiết mỗi bài viết', NULL, 'ALL', '728x90', 2, 'ROTATING', 800000.00, 'CPD', 'ACTIVE'),
(3, 'SLOT-SIDEBAR-STICKY', 'Sidebar Sticky (Cột phải đọc báo)', 'Cột bên phải trang đọc báo', NULL, 'DESKTOP', '300x600', 1, 'EXCLUSIVE', 1200000.00, 'CPD', 'ACTIVE');

-- 5. SUBSCRIPTION PLANS (Gói cước hội viên Paywall)
INSERT INTO subscription_plans (plan_id, name, price, duration_days, has_ad_free, has_audio, status) VALUES
(1, 'Gói Tháng (Tiêu chuẩn)', 50000.00, 30, FALSE, FALSE, 'ACTIVE'),
(2, 'Gói Quý (Tiết kiệm)', 135000.00, 90, TRUE, FALSE, 'ACTIVE'),
(3, 'Gói Năm (Hội viên VIP)', 480000.00, 365, TRUE, TRUE, 'ACTIVE');

-- 6. ADVERTISERS (Hồ sơ doanh nghiệp B2B)
INSERT INTO advertisers (advertiser_id, user_id, company_name, business_sector, invoice_name, invoice_tax_code, invoice_address, invoice_email, tax_code, contact_person, email, phone, address, business_license_url, verification_status) VALUES
(1, 5, 'Công ty CP Logistics & Cảng Quốc tế Đình Vũ', 'Logistics và dịch vụ cảng biển', 'Công ty CP Logistics & Cảng Quốc tế Đình Vũ', '0201988888', 'Khu kinh tế Đình Vũ - Cát Hải, Đông Hải 2, Hải An, Hải Phòng', 'adv.canghaiphong@gmail.com', '0201988888', 'Đặng Quang Huy', 'adv.canghaiphong@gmail.com', '0934567890', 'Khu kinh tế Đình Vũ - Cát Hải, Đông Hải 2, Hải An, Hải Phòng', 'https://example.com/licenses/dinhvu_port_license.pdf', 'VERIFIED');

-- 7. ARTICLES & ARTICLE_VERSIONS (Bài viết & Phiên bản biên tập)
-- Bài 1: Premium (15.000đ)
INSERT INTO articles (article_id, category_id, author_id, slug, access_type, single_price, status, published_version, latest_version, view_count, published_at) VALUES
(1, 2, 4, 'khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen', 'PREMIUM', 15000.00, 'PUBLISHED', 1, 1, 3420, '2026-09-20 07:30:00');

INSERT INTO article_versions (version_id, article_id, edited_by, reviewed_by, version_number, title, summary, content, cover_image_url, review_status, review_feedback, submitted_at, reviewed_at) VALUES
(1, 1, 4, 3, 1, 
 'Khai thác tiềm năng Cảng nước sâu Lạch Huyện: Đòn bẩy đưa kinh tế Hải Phòng vươn ra biển lớn',
 'Với luồng hàng hải tự nhiên sâu nhất miền Bắc, cụm cảng quốc tế Lạch Huyện đang hình thành trung tâm logistics toàn cầu, mở cánh cửa giao thương chiến lược cho vùng kinh tế trọng điểm Bắc Bộ.',
 'Khu bến cảng Lạch Huyện (Cát Hải) những ngày này tấp nập những chuyến tàu container siêu trọng tải trên 132.000 DWT cập cảng. Sự phát triển vượt bậc của hệ thống logistics cảng biển không chỉ là điểm tựa công nghiệp cho Hải Phòng, mà còn là mũi nhọn đột phá kinh tế của toàn vùng duyên hải Bắc Bộ trong tầm nhìn đến năm 2030.',
 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1000',
 'APPROVED', 'Đạt chuẩn duyệt xuất bản trang nhất', '2026-09-19 14:00:00', '2026-09-20 07:00:00');

-- Bài 2: Phóng sự điều tra Premium (25.000đ)
INSERT INTO articles (article_id, category_id, author_id, slug, access_type, single_price, status, published_version, latest_version, view_count, published_at) VALUES
(2, 3, 4, 'tham-nhap-duong-day-buon-lau-qua-duong-bien-bach-long-vi', 'PREMIUM', 25000.00, 'PUBLISHED', 1, 1, 5890, '2026-09-22 08:00:00');

INSERT INTO article_versions (version_id, article_id, edited_by, reviewed_by, version_number, title, summary, content, cover_image_url, review_status, review_feedback, submitted_at, reviewed_at) VALUES
(2, 2, 4, 3, 1,
 'Thâm nhập đường dây buôn lậu qua đường biển Bạch Long Vĩ: Phóng sự điều tra độc quyền',
 'Suốt 3 tháng ròng bám theo những chiếc tàu cá vỏ sắt không biển số, nhóm phóng viên điều tra LocalPress đã ghi lại thủ đoạn buôn lậu khoáng sản và hàng tiêu dùng tinh vi trên vùng biển Đông Bắc.',
 'Giữa trùng khơi đêm đen của vùng biển giáp ranh huyện đảo Bạch Long Vĩ, tiếng động cơ diesel gầm rú xé toạc màn đêm. Sau hơn 90 ngày phối hợp cùng lực lượng trinh sát Bộ đội Biên phòng và Cảnh sát biển vùng 1, nhóm phóng viên LocalPress đã ghi nhận toàn bộ quá trình sang mạn hàng lậu trái phép.',
 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1000',
 'APPROVED', 'Tư liệu điều tra xuất sắc, đồng ý phát hành', '2026-09-21 16:30:00', '2026-09-22 07:45:00');

-- Bài 3: Tin tức Free
INSERT INTO articles (article_id, category_id, author_id, slug, access_type, single_price, status, published_version, latest_version, view_count, published_at) VALUES
(3, 2, 4, 'hai-phong-thu-hut-hon-2-8-ty-usd-von-fdi', 'FREE', 0.00, 'PUBLISHED', 1, 1, 2150, '2026-09-24 10:15:00');

INSERT INTO article_versions (version_id, article_id, edited_by, reviewed_by, version_number, title, summary, content, cover_image_url, review_status, review_feedback, submitted_at, reviewed_at) VALUES
(3, 3, 4, 3, 1,
 'Hải Phòng thu hút hơn 2,8 tỷ USD vốn FDI 9 tháng đầu năm 2026: Kỷ lục từ các dự án công nghệ cao',
 'Dòng vốn đầu trực tiếp nước ngoài đổ mạnh vào các khu công nghiệp DEEP C, Tràng Duệ và VSIP khẳng định vị thế dẫn đầu miền Bắc về thu hút công nghệ bán dẫn và điện tử.',
 'Theo báo cáo mới nhất từ Sở Kế hoạch và Đầu tư TP. Hải Phòng, lũy kế 9 tháng đầu năm 2026, toàn thành phố đã thu hút 2,83 tỷ USD vốn FDI, đạt 118% kế hoạch năm và tăng 26,5% so với cùng kỳ năm trước.',
 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000',
 'APPROVED', 'Đạt yêu cầu xuất bản', '2026-09-24 09:00:00', '2026-09-24 10:00:00');

-- Bài 4: Văn hóa Free
INSERT INTO articles (article_id, category_id, author_id, slug, access_type, single_price, status, published_version, latest_version, view_count, published_at) VALUES
(4, 4, 4, 'doc-dao-di-san-hat-dum-thuy-nguyen', 'FREE', 0.00, 'PUBLISHED', 1, 1, 1480, '2026-09-25 15:30:00');

INSERT INTO article_versions (version_id, article_id, edited_by, reviewed_by, version_number, title, summary, content, cover_image_url, review_status, review_feedback, submitted_at, reviewed_at) VALUES
(4, 4, 4, 3, 1,
 'Độc đáo Di sản Hát Đúm Thủy Nguyên: Gìn giữ điệu hò trao duyên bên dòng sông Giá',
 'Câu hát giao duyên mộc mạc, giấu nụ cười sau chiếc khăn mỏ quạ của các liền anh liền chị Thủy Nguyên đang được hồi sinh mạnh mẽ trong đời sống đương đại.',
 'Về với tổng Phục Lễ, Phả Lễ (huyện Thủy Nguyên) vào những ngày hội xuân hay đêm trăng rằm, người ta lại đắm chìm trong không gian của làn điệu hát Đúm - Di sản văn hóa phi vật thể quốc gia.',
 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1000',
 'APPROVED', 'Hình ảnh đẹp, văn phong mượt mà', '2026-09-25 14:00:00', '2026-09-25 15:00:00');

-- 8. ARTICLE TAGS (Gắn nhãn bài viết)
INSERT INTO article_tags (article_id, tag_id) VALUES
(1, 1),
(1, 4),
(2, 2),
(2, 4),
(3, 3),
(3, 1),
(4, 4);

-- 9. COMMENTS (Bình luận độc giả)
INSERT INTO comments (comment_id, article_id, user_id, parent_id, moderated_by, content, status, created_at) VALUES
(1, 1, 6, NULL, 3, 'Bài viết phân tích rất sâu về tiềm năng logistics cụm cảng Lạch Huyện!', 'APPROVED', '2026-09-20 09:15:00'),
(2, 1, 7, 1, 3, 'Đúng vậy, hệ thống hạ tầng kết nối của Hải Phòng hiện nay quá đồng bộ.', 'APPROVED', '2026-09-20 10:00:00');

-- 10. SAVED ARTICLES & CATEGORY FOLLOWS (Tủ sách & Theo dõi)
INSERT INTO saved_articles (user_id, article_id, saved_at) VALUES
(6, 1, '2026-09-21 08:00:00'),
(7, 2, '2026-09-23 11:30:00');

INSERT INTO category_follows (user_id, category_id, followed_at) VALUES
(6, 2, '2026-09-01 10:00:00'),
(7, 3, '2026-09-05 14:00:00');

-- 11. SUBSCRIPTIONS (Độc giả Mai đăng ký gói năm)
INSERT INTO subscriptions (subscription_id, user_id, plan_id, start_date, end_date, status, auto_renew) VALUES
(1, 7, 3, '2026-09-01', '2027-09-01', 'ACTIVE', TRUE);

-- 12. ARTICLE PURCHASES (Độc giả An mua lẻ bài điều tra)
INSERT INTO article_purchases (purchase_id, user_id, article_id, purchase_price, access_status, purchased_at) VALUES
(1, 6, 2, 25000.00, 'ACTIVE', '2026-09-23 14:20:00');

-- 13. AD CAMPAIGNS, CREATIVES & STATS (Quảng cáo B2B)
INSERT INTO ad_campaigns (campaign_id, advertiser_id, slot_id, reviewed_by, campaign_name, start_date, end_date, quoted_amount, quotation_status, contract_reference, contract_file_url, payment_status, status) VALUES
(1, 1, 1, 3, 'Chiến dịch Quảng bá Logistics Cảng Đình Vũ 2026', '2026-09-01', '2026-09-30', 45000000.00, 'ACCEPTED', 'HD-2026-DV-001', 'https://example.com/contracts/HD-2026-DV-001.pdf', 'PAID', 'ACTIVE'),
(2, 1, 2, NULL, 'Chiến dịch Khai trương Trung tâm Logistics Cát Hải', '2026-11-20', '2026-12-20', 25000000.00, 'PENDING', NULL, NULL, 'UNPAID', 'PENDING');

INSERT INTO ad_creatives (creative_id, campaign_id, reviewed_by, version_number, media_url, target_url, resolved_url, review_status, scan_status, approved_at) VALUES
(1, 1, 3, 1, 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1140', 'https://dinhvuport.com.vn', 'https://dinhvuport.com.vn', 'APPROVED', 'SAFE', '2026-08-31 16:00:00'),
(2, 2, NULL, 1, 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1140', 'https://cathailogistics.com.vn', 'https://cathailogistics.com.vn', 'PENDING', 'SAFE', NULL);

INSERT INTO ad_stats (stat_id, campaign_id, creative_id, stat_date, impressions, clicks, ctr) VALUES
(1, 1, 1, '2026-09-28', 15200, 684, 4.5000);

-- 13.1 AD CONTRACTS (Hợp đồng B2B SV2 - Trọng Phan)
INSERT INTO ad_contracts (contract_id, campaign_id, advertiser_id, contract_number, signing_date, contract_value, contract_file_url, status, notes) VALUES
(1, 1, 1, 'HD-2026-DV-001', '2026-08-25', 45000000.00, 'https://example.com/contracts/HD-2026-DV-001.pdf', 'SIGNED', 'Hợp đồng quảng cáo B2B Cảng Logistics Đình Vũ 2026')
ON DUPLICATE KEY UPDATE contract_number = VALUES(contract_number);

-- 14. TRANSACTIONS (Sổ cái thu tiền)
-- Giao dịch 1: Độc giả Mai mua gói năm 480k
INSERT INTO transactions (transaction_id, user_id, subscription_id, transaction_type, amount, currency, payment_method, gateway_transaction_id, bank_code, status, paid_at, reconciled_at, reconciled_by) VALUES
(1, 7, 1, 'SUBSCRIPTION', 480000.00, 'VND', 'SEPAY', 'LP2609010830S001', 'VCB', 'SUCCESS', '2026-09-01 08:30:00', '2026-09-01 17:00:00', 2);

-- Giao dịch 2: Độc giả An mua bài điều tra Bạch Long Vĩ 25k
INSERT INTO transactions (transaction_id, user_id, purchase_id, transaction_type, amount, currency, payment_method, gateway_transaction_id, bank_code, status, paid_at, reconciled_at, reconciled_by) VALUES
(2, 6, 1, 'ARTICLE', 25000.00, 'VND', 'SEPAY', 'LP2609231420A002', 'VCB', 'SUCCESS', '2026-09-23 14:20:00', '2026-09-23 18:00:00', 2);

-- Giao dịch 3: Doanh nghiệp thanh toán hợp đồng quảng cáo 45tr
INSERT INTO transactions (transaction_id, user_id, campaign_id, transaction_type, amount, currency, payment_method, gateway_transaction_id, bank_code, status, paid_at, reconciled_at, reconciled_by) VALUES
(3, 5, 1, 'AD', 45000000.00, 'VND', 'SEPAY', 'LP2608311700D003', 'VCB', 'SUCCESS', '2026-08-31 17:00:00', '2026-08-31 18:00:00', 2);

-- 15. REFUND REQUESTS (Dữ liệu mẫu cho SV4 demo luồng Hoàn tiền 4 mắt)
INSERT INTO refund_requests (refund_id, transaction_id, user_id, refund_amount, reason, evidence_url, status, proposed_by, reviewed_by, review_notes) VALUES
(1, 2, 6, 25000.00, 'Độc giả chuyển khoản trùng 2 lần khi mua bài lẻ', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600', 'PENDING', 2, NULL, 'Kế toán viên Lê Kế Toán đã kiểm tra số dư và lập phiếu');

-- 16. CHỨNG TỪ TÀI CHÍNH (SV4 - UC057): seed nạp sau Flyway nên phát hành bù cho các đơn đã thu ở trên
-- Phát hành bù chứng từ cho đơn đã thu trước UC057 (đơn SUCCESS / REFUNDED chưa có chứng từ), VAT 8%.
-- Đánh số tiếp theo dãy hiện có của từng loại / năm, theo thời điểm thu tiền. Đơn đã hoàn toàn phần -> VOIDED.
INSERT INTO financial_documents (document_no, document_type, transaction_id, user_id, buyer_name, buyer_tax_code,
                                 buyer_address, vat_rate, amount_before_vat, vat_amount, total_amount, status,
                                 issued_at, voided_at)
SELECT CONCAT(IF(x.doc_type = 'INVOICE', 'HD', 'BN'), '-', x.doc_year, '-',
              LPAD(COALESCE(s.last_no, 0) + x.rn, 6, '0')),
       x.doc_type, x.transaction_id, x.user_id, x.buyer_name, x.buyer_tax_code, x.buyer_address,
       8.00, x.before_vat, x.amount - x.before_vat, x.amount,
       IF(x.status = 'REFUNDED', 'VOIDED', 'ISSUED'), x.issued_at,
       IF(x.status = 'REFUNDED', COALESCE(x.refunded_at, x.issued_at), NULL)
FROM (
    SELECT t.transaction_id, t.user_id, t.amount, t.status,
           IF(t.transaction_type = 'AD', 'INVOICE', 'RECEIPT') AS doc_type,
           YEAR(COALESCE(t.paid_at, t.created_at)) AS doc_year,
           COALESCE(t.paid_at, t.created_at) AS issued_at,
           ROUND(t.amount * 100 / 108, 0) AS before_vat,
           ROW_NUMBER() OVER (PARTITION BY IF(t.transaction_type = 'AD', 'INVOICE', 'RECEIPT'),
                                           YEAR(COALESCE(t.paid_at, t.created_at))
                              ORDER BY COALESCE(t.paid_at, t.created_at), t.transaction_id) AS rn,
           COALESCE(NULLIF(a.invoice_name, ''), a.company_name, u.full_name) AS buyer_name,
           COALESCE(NULLIF(a.invoice_tax_code, ''), a.tax_code) AS buyer_tax_code,
           COALESCE(NULLIF(a.invoice_address, ''), a.address) AS buyer_address,
           (SELECT MAX(r.paid_at) FROM transactions r
            WHERE r.transaction_type = 'REFUND' AND r.original_transaction_id = t.transaction_id) AS refunded_at
    FROM transactions t
    JOIN users u ON u.user_id = t.user_id
    LEFT JOIN advertisers a ON a.user_id = t.user_id AND t.transaction_type = 'AD'
    WHERE t.transaction_type IN ('AD', 'ARTICLE', 'SUBSCRIPTION')
      AND t.status IN ('SUCCESS', 'REFUNDED')
      AND NOT EXISTS (SELECT 1 FROM financial_documents d WHERE d.transaction_id = t.transaction_id)
) x
LEFT JOIN financial_document_sequences s ON s.document_type = x.doc_type AND s.document_year = x.doc_year;

-- Dãy số tiếp tục từ số lớn nhất đã phát hành; tạo sẵn dòng năm nay và năm sau (last_no = 0) để lần phát hành
-- đầu năm chỉ UPDATE 1 dòng có sẵn, không chèn dòng mới cùng lúc.
INSERT INTO financial_document_sequences (document_type, document_year, last_no)
SELECT d.document_type, d.doc_year, MAX(d.doc_seq)
FROM (SELECT document_type,
             CAST(SUBSTRING(document_no, 4, 4) AS UNSIGNED) AS doc_year,
             CAST(SUBSTRING(document_no, 9) AS UNSIGNED) AS doc_seq
      FROM financial_documents) d
GROUP BY d.document_type, d.doc_year
ON DUPLICATE KEY UPDATE last_no = GREATEST(last_no, VALUES(last_no));

INSERT IGNORE INTO financial_document_sequences (document_type, document_year, last_no)
SELECT k.document_type, YEAR(CURDATE()) + y.n, 0
FROM (SELECT 'INVOICE' AS document_type UNION ALL SELECT 'RECEIPT') k
CROSS JOIN (SELECT 0 AS n UNION ALL SELECT 1) y;

SET FOREIGN_KEY_CHECKS = 1;
