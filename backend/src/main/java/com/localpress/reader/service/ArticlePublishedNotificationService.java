package com.localpress.reader.service;

import com.localpress.reader.repository.ReaderNotificationRepository;
import com.localpress.shared.event.ArticlePublishedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

// ghi thông báo bài mới sau khi transaction xuất bản đã commit
@Service
@RequiredArgsConstructor
public class ArticlePublishedNotificationService {

    static final int TITLE_LIMIT = 255;
    static final String FALLBACK_TITLE = "Bài mới";

    private final ReaderNotificationRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(ArticlePublishedEvent event) {
        if (event == null || !event.isFirstPublication()) {
            return;
        }
        if (event.getArticleId() == null || event.getArticleId() <= 0 || event.getCategoryId() == null) {
            return;
        }
        String title = titleOf(event.getTitle());
        String content = "Có bài mới trong chuyên mục bạn theo dõi.";
        for (Long userId : repository.findFollowerIds(event.getCategoryId())) {
            String dedupKey = "ARTICLE_PUBLISHED:" + event.getArticleId() + ":" + userId;
            repository.insertInApp(userId, title, content, dedupKey);
        }
    }

    private static String titleOf(String title) {
        String value = title == null ? "" : title.trim();
        if (value.isEmpty()) {
            return FALLBACK_TITLE;
        }
        return value.length() > TITLE_LIMIT ? value.substring(0, TITLE_LIMIT) : value;
    }
}
