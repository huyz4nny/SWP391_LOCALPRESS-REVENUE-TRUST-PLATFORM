package com.localpress.editorial.repository;

import com.localpress.editorial.entity.EditorialArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository truy vấn bảng articles và các thông tin liên quan (chuyên mục, tác giả, audit log)
 * phục vụ màn hình Article Review and Publishing (UC025) của SV2.
 */
@Repository
public interface EditorialArticleRepository extends JpaRepository<EditorialArticle, Long> {

    /**
     * Lấy toàn bộ bài viết sắp xếp theo thời gian cập nhật mới nhất
     */
    List<EditorialArticle> findAllByOrderByUpdatedAtDesc();

    /**
     * Lọc bài viết theo trạng thái (DRAFT, PENDING, PUBLISHED, REJECTED, TAKEN_DOWN)
     */
    List<EditorialArticle> findByStatusOrderByUpdatedAtDesc(String status);

    /**
     * Tìm bài viết theo slug
     */
    Optional<EditorialArticle> findBySlug(String slug);

    /**
     * Lấy tên chuyên mục từ bảng categories (độc lập, không phụ thuộc package của SV khác)
     */
    @Query(value = "SELECT name FROM categories WHERE category_id = :categoryId", nativeQuery = true)
    String findCategoryNameById(@Param("categoryId") Long categoryId);

    /**
     * Lấy slug chuyên mục từ bảng categories
     */
    @Query(value = "SELECT slug FROM categories WHERE category_id = :categoryId", nativeQuery = true)
    String findCategorySlugById(@Param("categoryId") Long categoryId);

    /**
     * Lấy họ tên tác giả / người duyệt từ bảng users
     */
    @Query(value = "SELECT full_name FROM users WHERE user_id = :userId", nativeQuery = true)
    String findUserFullNameById(@Param("userId") Long userId);

    /**
     * Lấy danh sách các thẻ tag của bài viết
     */
    @Query(value = "SELECT t.name FROM tags t JOIN article_tags at ON t.tag_id = at.tag_id WHERE at.article_id = :articleId", nativeQuery = true)
    List<String> findTagNamesByArticleId(@Param("articleId") Long articleId);

    /**
     * Ghi nhật ký kiểm toán (audit_logs) mỗi khi SV2 duyệt/xuất bản/từ chối/gỡ bài viết
     */
    @Modifying
    @Query(value = "INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value) " +
                   "VALUES (:userId, :action, 'ARTICLE', :targetId, :oldValue, :newValue)", nativeQuery = true)
    void insertAuditLog(
            @Param("userId") Long userId,
            @Param("action") String action,
            @Param("targetId") Long targetId,
            @Param("oldValue") String oldValue,
            @Param("newValue") String newValue
    );
}
