package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.dto.FollowStateResponse;
import com.localpress.reader.dto.FollowedCategoryResponse;
import com.localpress.reader.repository.ReaderArticleRepository;
import com.localpress.reader.repository.ReaderFollowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

// service theo dõi chuyên mục của SV3 phục vụ UC040 ở màn hình II.3.8
// luồng đi là ReaderFollowController gọi vào đây -> kiểm tra chuyên mục -> ghi category_follows hoặc đọc feed -> trả dto
// phần nhận thông báo khi có bài mới chưa làm vì chưa có sự kiện bài vừa xuất bản từ module biên tập
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReaderFollowService {

    private final ReaderFollowRepository followRepository;
    private final ReaderArticleRepository readerArticleRepository;

    // block danh sách chuyên mục đang theo dõi
    public List<FollowedCategoryResponse> getFollowedCategories(Long userId) {
        return followRepository.findFollowedCategories(userId);
    }

    // block theo dõi chuyên mục, chuyên mục không tồn tại hoặc đã ngừng hoạt động thì trả 404
    @Transactional
    public FollowStateResponse follow(Long userId, Long categoryId) {
        if (!followRepository.isActiveCategory(categoryId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Không tìm thấy chuyên mục hoặc chuyên mục đã ngừng hoạt động");
        }
        followRepository.follow(userId, categoryId);
        return new FollowStateResponse(categoryId, true);
    }

    // block bỏ theo dõi, không kiểm tra chuyên mục để độc giả vẫn bỏ được chuyên mục đã ngừng hoạt động
    @Transactional
    public FollowStateResponse unfollow(Long userId, Long categoryId) {
        followRepository.unfollow(userId, categoryId);
        return new FollowStateResponse(categoryId, false);
    }

    // block feed cá nhân hóa gồm bài mới của các chuyên mục đang theo dõi
    public Page<ArticleSummaryResponse> getFeed(Long userId, Pageable pageable) {
        return readerArticleRepository.findFollowedFeed(userId, pageable)
                .map(ReaderArticleServiceImpl::mapToSummary);
    }
}
