package com.localpress.reader.service;

import com.localpress.shared.event.ArticlePublishedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// chỉ chạy sau khi transaction xuất bản commit. Lỗi ghi thông báo không kéo lại trạng thái PUBLISHED.
@Slf4j
@Component
@RequiredArgsConstructor
public class ArticlePublishedNotificationListener {

    private final ArticlePublishedNotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onArticlePublished(ArticlePublishedEvent event) {
        try {
            notificationService.record(event);
        } catch (RuntimeException exception) {
            log.error("Không ghi được thông báo bài mới articleId={}",
                    event == null ? null : event.getArticleId(), exception);
        }
    }
}
