package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.dto.BookmarkStateResponse;
import com.localpress.reader.repository.ReaderArticleRepository;
import com.localpress.reader.repository.ReaderBookmarkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

// service lưu bài của SV3 phục vụ UC038 ở màn hình II.3.6
// luồng đi là ReaderLibraryController gọi vào đây -> kiểm tra bài -> ghi saved_articles hoặc đọc danh sách -> trả dto
// lưu và bỏ lưu đều idempotent nên bấm hai lần liên tiếp không làm đảo trạng thái
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReaderBookmarkService {

    private final ReaderBookmarkRepository bookmarkRepository;
    private final ReaderArticleRepository readerArticleRepository;

    // block danh sách bài đã lưu có phân trang, bài vừa lưu lên đầu
    public Page<ArticleSummaryResponse> getSavedArticles(Long userId, Pageable pageable) {
        return readerArticleRepository.findSavedArticles(userId, pageable)
                .map(ReaderArticleServiceImpl::mapToSummary);
    }

    // block id các bài đã lưu để frontend tô icon lưu trên thẻ bài
    public List<Long> getSavedArticleIds(Long userId) {
        return bookmarkRepository.findSavedArticleIds(userId);
    }

    // block lưu bài, chỉ bài đang xuất bản mới được lưu còn bài nháp hoặc đã gỡ thì trả 404
    @Transactional
    public BookmarkStateResponse save(Long userId, Long articleId) {
        if (!bookmarkRepository.isPublishedArticle(articleId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Không tìm thấy bài viết hoặc bài chưa được xuất bản");
        }
        bookmarkRepository.save(userId, articleId);
        return new BookmarkStateResponse(articleId, true);
    }

    // block bỏ lưu, không kiểm tra bài còn xuất bản không để độc giả vẫn dọn được bài đã bị gỡ
    @Transactional
    public BookmarkStateResponse remove(Long userId, Long articleId) {
        bookmarkRepository.remove(userId, articleId);
        return new BookmarkStateResponse(articleId, false);
    }
}
