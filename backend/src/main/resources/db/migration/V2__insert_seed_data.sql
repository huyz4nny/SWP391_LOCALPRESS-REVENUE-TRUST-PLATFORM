-- ====================================================================
-- LocalPress Database Seed Data - V2__insert_seed_data.sql
-- ====================================================================

-- 1. Initial Categories
INSERT INTO categories (name, slug, description) VALUES
('Thời sự - Chính trị', 'thoi-su-chinh-tri', 'Tin tức chính trị, thời sự Hà Tĩnh và toàn quốc'),
('Kinh tế - Đầu tư', 'kinh-te-dau-tu', 'Thị trường, doanh nghiệp, xúc tiến đầu tư địa phương'),
('Văn hóa - Xã hội', 'van-hoa-xa-hoi', 'Đời sống, phong tục, di sản văn hóa miền Trung'),
('Phóng sự điều tra', 'phong-su-dieu-tra', 'Tuyến bài phóng sự chuyên sâu độc quyền');

-- 2. Initial Ad Slots
INSERT INTO ad_slots (name, code, page_location, width, height, base_price_per_day, status) VALUES
('Top Header Banner', 'TOP_HEADER', 'Trang chủ - Đầu trang', 1200, 150, 1500000.00, 'AVAILABLE'),
('Sidebar Sticky Box', 'SIDEBAR_STICKY', 'Chi tiết bài viết - Cột phải', 300, 600, 800000.00, 'AVAILABLE'),
('In-feed Native Banner', 'IN_FEED_NATIVE', 'Danh sách bài viết - Giữa dòng tin', 800, 250, 1000000.00, 'AVAILABLE');
