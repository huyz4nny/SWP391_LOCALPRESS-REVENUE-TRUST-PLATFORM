-- ====================================================================
-- LocalPress Database Seed Data - V2__insert_seed_data.sql
-- Bối cảnh: Báo điện tử địa phương TP. Hải Phòng
-- Đồng bộ 100% với dữ liệu Frontend (seed.ts)
-- ====================================================================

-- 1. Initial Users
INSERT INTO users (id, username, email, password_hash, full_name, phone_number, avatar_url, role, status) VALUES
(1, 'reader.an', 'reader.an@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Nguyễn Văn An', '0912345678', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120', 'ROLE_READER', 'ACTIVE'),
(2, 'reader.mai', 'mai.tran@gmail.com', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Trần Thị Mai (Premium)', '0988776655', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120', 'ROLE_READER', 'ACTIVE'),
(3, 'adv.canghaiphong', 'huy.dang@logisticshaiphong.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Đặng Quang Huy (Logistics Cảng Hải Phòng)', '0934567890', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120', 'ROLE_ADVERTISER', 'ACTIVE'),
(4, 'adv.datcang', 'phong.le@datcanghaiphong.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Lê Hồng Phong (BĐS Đất Cảng Hải Phòng)', '0977665544', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120', 'ROLE_ADVERTISER', 'ACTIVE'),
(5, 'journalist.minh', 'phongvien@localpress.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Hoàng Minh Phóng Viên', '0901234567', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120', 'ROLE_JOURNALIST', 'ACTIVE'),
(6, 'editor.lan', 'bientap@localpress.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Nguyễn Văn Biên Tập', '0902345678', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120', 'ROLE_EDITOR', 'ACTIVE'),
(7, 'accountant.hoa', 'ketoan@localpress.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Lê Kế Toán', '0903456789', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120', 'ROLE_ACCOUNTANT', 'ACTIVE'),
(8, 'admin.vu', 'admin@localpress.vn', '$2a$10$7EqJtq98hPqEX7fNZaFWoO.KjEaQGz1Q8m1uB1Q1F2lMv9vG5eT9a', 'Vũ Quản Trị Hệ Thống', '0909999999', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120', 'ROLE_ADMIN', 'ACTIVE');

-- 2. Initial Categories (Chuẩn Hải Phòng)
INSERT INTO categories (id, name, slug, description) VALUES
(1, 'Thời sự & Chính trị', 'thoi-su', 'Tin tức thời sự nóng bỏng, chỉ đạo điều hành và sự kiện nổi bật của thành phố Hải Phòng và vùng duyên hải Bắc Bộ'),
(2, 'Kinh tế & Đầu tư', 'kinh-te', 'Doanh nghiệp cảng biển, dịch vụ logistics, khu kinh tế Đình Vũ - Cát Hải và thị trường đầu tư Hải Phòng'),
(3, 'Pháp luật & Điều tra', 'phap-luat', 'Phóng sự điều tra độc quyền, an ninh trật tự cửa biển và tư vấn pháp lý địa phương Hải Phòng'),
(4, 'Văn hóa & Đời sống', 'van-hoa', 'Di sản hát Đúm Thủy Nguyên, lễ hội chọi trâu Đồ Sơn, danh thắng Cát Bà và nét đẹp con người Đất Cảng'),
(5, 'Nông nghiệp Xanh', 'nong-nghiep', 'Mô hình OCOP, lúa rươi Kiến Thụy, ngao Bàng La, tu hài Cát Bà và nông nghiệp sinh thái tuần hoàn Đất Cảng'),
(6, 'Công nghệ & Chuyển đổi số', 'cong-nghe', 'Cảng biển số Smart Port, chuyển đổi số hành chính công và các sáng kiến công nghệ tại thành phố Hải Phòng');

-- 3. Initial Ad Slots (Khớp với Frontend SLOT definitions)
INSERT INTO ad_slots (id, name, code, page_location, width, height, base_price_per_day, status) VALUES
(1, 'Top Leaderboard (Đầu trang chủ)', 'SLOT-TOP-LEADERBOARD', 'Trang chủ, ngay dưới Header', 1140, 120, 1500000.00, 'AVAILABLE'),
(2, 'Inline Banner (Thân bài viết)', 'SLOT-ARTICLE-INLINE', 'Nội dung chi tiết mỗi bài viết', 728, 90, 800000.00, 'AVAILABLE'),
(3, 'Sidebar Halfpage (Cột phải đọc báo)', 'SLOT-SIDEBAR-HALFPAGE', 'Cột bên phải trang đọc báo', 300, 600, 1200000.00, 'AVAILABLE'),
(4, 'Sticky Footer (Chân màn hình di động & web)', 'SLOT-STICKY-FOOTER', 'Cố định đáy màn hình', 970, 90, 950000.00, 'AVAILABLE');

-- 4. Initial Sample Articles (Hải Phòng)
INSERT INTO articles (id, title, slug, summary, content, cover_image_url, author_id, category_id, is_premium, price, status, view_count, published_at) VALUES
(1, 
 'Khai thác tiềm năng Cảng nước sâu Lạch Huyện: Đòn bẩy đưa kinh tế Hải Phòng vươn ra biển lớn',
 'khai-thac-tiem-nang-cang-nuoc-sau-lach-huyen',
 'Với luồng hàng hải tự nhiên sâu nhất miền Bắc, cụm cảng quốc tế Lạch Huyện đang hình thành trung tâm logistics toàn cầu, mở cánh cửa giao thương chiến lược cho vùng kinh tế trọng điểm Bắc Bộ.',
 'Khu bến cảng Lạch Huyện (Cát Hải) những ngày này tấp nập những chuyến tàu container siêu trọng tải trên 132.000 DWT cập cảng. Sự phát triển vượt bậc của hệ thống logistics cảng biển không chỉ là điểm tựa công nghiệp cho Hải Phòng, mà còn là mũi nhọn đột phá kinh tế của toàn vùng duyên hải Bắc Bộ trong tầm nhìn đến năm 2030.',
 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1000',
 6, 2, TRUE, 15000.00, 'PUBLISHED', 3420, '2026-09-20 07:30:00'),

(2, 
 'Thâm nhập đường dây buôn lậu qua đường biển Bạch Long Vĩ: Phóng sự điều tra độc quyền',
 'tham-nhap-duong-day-buon-lau-qua-duong-bien-bach-long-vi',
 'Suốt 3 tháng ròng bám theo những chiếc tàu cá vỏ sắt không biển số, nhóm phóng viên điều tra LocalPress đã ghi lại thủ đoạn buôn lậu khoáng sản và hàng tiêu dùng tinh vi trên vùng biển Đông Bắc.',
 'Giữa trùng khơi đêm đen của vùng biển giáp ranh huyện đảo Bạch Long Vĩ, tiếng động cơ diesel gầm rú xé toạc màn đêm. Sau hơn 90 ngày phối hợp cùng lực lượng trinh sát Bộ đội Biên phòng và Cảnh sát biển vùng 1, nhóm phóng viên LocalPress đã ghi nhận toàn bộ quá trình sang mạn hàng lậu trái phép.',
 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1000',
 5, 3, TRUE, 25000.00, 'PUBLISHED', 5890, '2026-09-22 08:00:00'),

(3, 
 'Hải Phòng thu hút hơn 2,8 tỷ USD vốn FDI 9 tháng đầu năm 2026: Kỷ lục từ các dự án công nghệ cao',
 'hai-phong-thu-hut-hon-2-8-ty-usd-von-fdi',
 'Dòng vốn đầu tư trực tiếp nước ngoài đổ mạnh vào các khu công nghiệp DEEP C, Tràng Duệ và VSIP khẳng định vị thế dẫn đầu miền Bắc về thu hút công nghệ bán dẫn và điện tử.',
 'Theo báo cáo mới nhất từ Sở Kế hoạch và Đầu tư TP. Hải Phòng, lũy kế 9 tháng đầu năm 2026, toàn thành phố đã thu hút 2,83 tỷ USD vốn FDI, đạt 118% kế hoạch năm và tăng 26,5% so với cùng kỳ năm trước.',
 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1000',
 6, 2, FALSE, 0.00, 'PUBLISHED', 2150, '2026-09-24 10:15:00'),

(4, 
 'Độc đáo Di sản Hát Đúm Thủy Nguyên: Gìn giữ điệu hò trao duyên bên dòng sông Giá',
 'doc-dao-di-san-hat-dum-thuy-nguyen',
 'Câu hát giao duyên mộc mạc, giấu nụ cười sau chiếc khăn mỏ quạ của các liền anh liền chị Thủy Nguyên đang được hồi sinh mạnh mẽ trong đời sống đương đại.',
 'Về với tổng Phục Lễ, Phả Lễ (huyện Thủy Nguyên) vào những ngày hội xuân hay đêm trăng rằm, người ta lại đắm chìm trong không gian của làn điệu hát Đúm - Di sản văn hóa phi vật thể quốc gia.',
 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1000',
 5, 4, FALSE, 0.00, 'PUBLISHED', 1480, '2026-09-25 15:30:00');
