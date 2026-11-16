package com.localpress.reader.dto;

// một thông báo trong app của độc giả (UC040 bài mới, UC046 kết quả hoàn tiền)
// linkUrl là đường dẫn trong frontend để bấm vào xem, có thể null
public record ReaderNotificationResponse(
        Long id,
        String type,
        String title,
        String content,
        String linkUrl,
        boolean read,
        String createdAt
) {
}
