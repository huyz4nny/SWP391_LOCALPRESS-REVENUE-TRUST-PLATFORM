package com.localpress.editorial.repository;

import com.localpress.editorial.entity.EditorialComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository thao tác bảng 'comments' phục vụ UC026 (Kiểm duyệt bình luận).
 */
@Repository
public interface EditorialCommentRepository extends JpaRepository<EditorialComment, Long> {

    List<EditorialComment> findAllByOrderByCreatedAtDesc();

    List<EditorialComment> findByStatusOrderByCreatedAtDesc(EditorialComment.CommentStatus status);

    long countByStatus(EditorialComment.CommentStatus status);
}
