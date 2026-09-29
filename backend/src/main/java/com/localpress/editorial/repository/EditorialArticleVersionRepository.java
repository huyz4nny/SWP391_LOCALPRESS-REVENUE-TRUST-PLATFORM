package com.localpress.editorial.repository;

import com.localpress.editorial.entity.EditorialArticleVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository truy vấn bảng article_versions (lịch sử phiên bản và nội dung bài viết)
 * phục vụ quy trình kiểm duyệt nhiều phiên bản của SV2 (Quy tắc 8).
 */
@Repository
public interface EditorialArticleVersionRepository extends JpaRepository<EditorialArticleVersion, Long> {

    /**
     * Lấy một phiên bản cụ thể của bài viết theo article_id và version_number
     */
    Optional<EditorialArticleVersion> findByArticleIdAndVersionNumber(Long articleId, Integer versionNumber);

    /**
     * Lấy toàn bộ lịch sử phiên bản của một bài viết (từ mới nhất về cũ nhất)
     */
    List<EditorialArticleVersion> findByArticleIdOrderByVersionNumberDesc(Long articleId);

    /**
     * Lấy danh sách các phiên bản đang chờ duyệt (PENDING)
     */
    List<EditorialArticleVersion> findByReviewStatusOrderBySubmittedAtAsc(String reviewStatus);
}
