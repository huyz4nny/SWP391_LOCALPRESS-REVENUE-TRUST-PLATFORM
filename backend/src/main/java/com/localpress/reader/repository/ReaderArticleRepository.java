// package repository của reader là lớp cuối cùng nói chuyện trực tiếp với database
package com.localpress.reader.repository;

import com.localpress.reader.domain.ArticleEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// repository truy vấn native sql các bài đã xuất bản cho SV3
// luồng đi là ReaderArticleServiceImpl gọi vào đây -> chạy sql lên mysql -> trả ArticleProjection ngược lại cho service
@Repository("readerArticleRepository")
public interface ReaderArticleRepository extends JpaRepository<ArticleEntity, Long> {

    // block lấy danh sách bài đã xuất bản có phân trang phục vụ UC029 và UC030 ở màn hình II.3.1
    // join article_versions theo published_version để chỉ lấy đúng bản đang xuất bản
    // điều kiện dạng (:param IS NULL OR ...) nghĩa là không truyền thì bỏ qua bộ lọc đó
    // tìm kiếm không phân biệt hoa thường trên tiêu đề và sapo
    // sắp xếp published_at giảm dần nên bài mới nhất lên đầu
    @Query(value = """
        SELECT a.article_id AS id, v.title AS title, a.slug AS slug, v.summary AS summary,
               v.cover_image_url AS coverImageUrl, c.name AS categoryName, c.slug AS categorySlug,
               a.access_type AS accessType, a.published_at AS publishedAt, u.full_name AS authorName,
               a.view_count AS viewCount, a.single_price AS singlePrice
        FROM articles a
        JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number
        LEFT JOIN categories c ON a.category_id = c.category_id
        LEFT JOIN users u ON a.author_id = u.user_id
        WHERE a.status = 'PUBLISHED'
          AND (:category IS NULL OR LOWER(c.slug) = LOWER(:category) OR LOWER(c.name) = LOWER(:category))
          AND (:search IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.summary) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:access IS NULL OR a.access_type = :access)
        ORDER BY a.published_at DESC
        """,
            // câu đếm tổng bài cùng điều kiện để spring tính ra tổng số trang
            countQuery = """
        SELECT COUNT(a.article_id) FROM articles a
        JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number
        LEFT JOIN categories c ON a.category_id = c.category_id
        WHERE a.status = 'PUBLISHED'
          AND (:category IS NULL OR LOWER(c.slug) = LOWER(:category) OR LOWER(c.name) = LOWER(:category))
          AND (:search IS NULL OR LOWER(v.title) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(v.summary) LIKE LOWER(CONCAT('%', :search, '%')))
          AND (:access IS NULL OR a.access_type = :access)
        """,
            nativeQuery = true)
    Page<ArticleProjection> findAllPublishedArticles(@Param("category") String category,
                                                     @Param("search") String search,
                                                     @Param("access") String access,
                                                     Pageable pageable);

    // block lấy chi tiết một bài theo slug phục vụ UC031 và UC032 ở màn hình II.3.2
    // có lấy cột content toàn văn nhưng service sẽ quyết định có trả ra ngoài hay không
    // không thấy bài hoặc bài chưa xuất bản thì trả Optional rỗng để service ném lỗi 404
    @Query(value = """
        SELECT a.article_id AS id, v.title AS title, a.slug AS slug, v.summary AS summary,
               v.content AS content, v.cover_image_url AS coverImageUrl,
               c.name AS categoryName, c.slug AS categorySlug, a.access_type AS accessType,
               a.published_at AS publishedAt, u.full_name AS authorName, a.view_count AS viewCount,
               a.single_price AS singlePrice
        FROM articles a
        JOIN article_versions v ON a.article_id = v.article_id AND a.published_version = v.version_number
        LEFT JOIN categories c ON a.category_id = c.category_id
        LEFT JOIN users u ON a.author_id = u.user_id
        WHERE a.slug = :slug AND a.status = 'PUBLISHED'
        """, nativeQuery = true)
    Optional<ArticleProjection> findPublishedBySlug(@Param("slug") String slug);

    // block tăng lượt xem thêm 1 ngay trong database để nhiều người đọc cùng lúc không bị mất số đếm
    // COALESCE để nếu view_count đang null thì tính từ 0
    @Modifying
    @Query(value = "UPDATE articles SET view_count = COALESCE(view_count, 0) + 1 WHERE slug = :slug AND status = 'PUBLISHED'",
            nativeQuery = true)
    int incrementViewCount(@Param("slug") String slug);
}
