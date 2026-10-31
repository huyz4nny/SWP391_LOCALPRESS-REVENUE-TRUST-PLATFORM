package com.localpress.reader.service;

import com.localpress.reader.dto.ReadingHistoryItemResponse;
import com.localpress.reader.repository.ReaderHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// service lịch sử đọc của SV3 phục vụ UC039 ở màn hình II.3.6
// luồng đi là đọc bài thành công thì ghi lại -> trang /account/history lấy danh sách hoặc xóa từng dòng
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReaderHistoryService {

    private final ReaderHistoryRepository historyRepository;

    // block ghi lịch sử sau khi mở bài, lỗi ghi không làm hỏng việc đọc bài
    @Transactional
    public void recordQuietly(Long userId, Long articleId) {
        try {
            historyRepository.upsert(userId, articleId);
        } catch (Exception exception) {
            log.warn("Không ghi được lịch sử đọc user {} bài {}: {}", userId, articleId, exception.getMessage());
        }
    }

    public Page<ReadingHistoryItemResponse> getHistory(Long userId, Pageable pageable) {
        long total = historyRepository.countPublished(userId);
        List<ReadingHistoryItemResponse> items = historyRepository.findPage(
                userId, pageable.getPageSize(), (int) pageable.getOffset());
        return new PageImpl<>(items, pageable, total);
    }

    public long count(Long userId) {
        return historyRepository.countPublished(userId);
    }

    @Transactional
    public void remove(Long userId, Long articleId) {
        historyRepository.remove(userId, articleId);
    }
}
