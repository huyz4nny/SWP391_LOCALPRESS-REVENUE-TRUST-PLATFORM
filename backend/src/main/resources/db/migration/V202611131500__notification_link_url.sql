-- SV3 (UC040, UC046): thông báo của độc giả có đường dẫn để bấm vào xem
-- (bài mới trong chuyên mục theo dõi -> /articles/{slug}, kết quả hoàn tiền -> /account/orders).
-- Cột cho phép NULL nên thông báo của các module khác (SV1) không bị ảnh hưởng.
ALTER TABLE notifications
    ADD COLUMN link_url VARCHAR(500) NULL AFTER content;

-- bù đường dẫn cho thông báo bài mới đã ghi trước đây (dedup_key dạng ARTICLE_PUBLISHED:{articleId}:{userId})
UPDATE notifications n
    JOIN articles a
      ON a.article_id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(n.dedup_key, ':', 2), ':', -1) AS UNSIGNED)
SET n.link_url = CONCAT('/articles/', a.slug)
WHERE n.notification_type = 'ARTICLE_PUBLISHED'
  AND n.link_url IS NULL
  AND n.dedup_key LIKE 'ARTICLE_PUBLISHED:%';
