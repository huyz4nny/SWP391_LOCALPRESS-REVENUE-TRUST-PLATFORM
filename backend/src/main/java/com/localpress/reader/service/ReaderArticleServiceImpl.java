// package service của reader chứa logic nghiệp vụ nằm giữa controller và repository
package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.repository.ArticleProjection;
import com.localpress.reader.repository.ReaderArticleRepository;
import com.localpress.delivery.service.PaywallEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// service xử lý nghiệp vụ đọc bài và paywall phía server của SV3
// luồng đi là ReaderArticleController gọi vào đây -> gọi ReaderArticleRepository lấy dữ liệu -> đổi sang dto -> trả về controller
// mặc định mọi hàm chỉ đọc (readOnly) hàm nào có ghi dữ liệu thì tự đánh dấu @Transactional riêng
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReaderArticleServiceImpl implements ReaderArticleService {

    private final ReaderArticleRepository readerArticleRepository;
    private final PaywallEngine paywallEngine;

    // block lấy danh sách bài tóm tắt cho UC029 và UC030 ở màn hình II.3.1
    // chuỗi rỗng được đổi thành null trước để câu sql bỏ qua bộ lọc đó
    // luồng đi là repository trả Page projection -> map từng phần tử sang ArticleSummaryResponse -> trả lên controller
    @Override
    public Page<ArticleSummaryResponse> getArticles(String category, String search, String access, Pageable pageable) {
        return readerArticleRepository
                .findAllPublishedArticles(blankToNull(category), blankToNull(search), blankToNull(access), pageable)
                .map(ReaderArticleServiceImpl::mapToSummary);
    }

    // block lấy chi tiết bài và tăng lượt xem cho UC031 và UC032 ở màn hình II.3.2
    // hàm này có ghi dữ liệu (tăng view_count) nên phải mở @Transactional ghi đè readOnly
    // luồng đi là tìm bài theo slug -> không có thì ném 404 -> tăng lượt xem -> áp paywall -> trả chi tiết lên controller
    @Override
    @Transactional
    public ArticleReaderResponse getArticleBySlug(String slug) {
        // nếu không tìm thấy bài hoặc bài chưa xuất bản thì dừng luôn và trả lỗi 404
        ArticleProjection projection = readerArticleRepository.findPublishedBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy bài viết hoặc bài chưa được xuất bản"));
        // tăng lượt xem thêm 1 trong database
        readerArticleRepository.incrementViewCount(slug);
        // hỏi PaywallEngine của SV5 xem người đọc hiện tại có quyền đọc toàn văn không
        // engine tự xét bài free người đã mua lẻ hoặc người có gói còn hạn nên ở đây chỉ nhận kết quả đúng hay sai
        boolean allowed = paywallEngine.checkCurrentAccess(projection.getId()).allowed();
        // đẩy sang applyPaywall để quyết định trả toàn văn hay chỉ preview
        return applyPaywall(mapToDetail(projection), projection.getContent(), projection.getAccessType(), allowed);
    }

    // block tính vị trí cắt 30 phần trăm văn bản cho UC032 (rule 3)
    // kết quả trả về là chỉ số ký tự dùng để substring ở applyPaywall
    static int previewCut(String rawContent) {
        // lấy 30 phần trăm độ dài văn bản làm mốc cắt
        int cutIndex = (int) Math.floor(rawContent.length() * 0.3d);
        // nếu bài rỗng hoặc quá ngắn thì không cắt gì cả
        if (cutIndex <= 0) {
            return 0;
        }
        // tìm dấu cách hoặc xuống dòng gần nhất nằm trước mốc cắt để không bị cắt đứt đôi một từ
        int lastBreak = Math.max(rawContent.lastIndexOf(' ', cutIndex), rawContent.lastIndexOf('\n', cutIndex));
        // chỉ lùi về chỗ ngắt từ nếu nó không quá xa (còn lại trên nửa mốc cắt) còn không thì cắt thẳng ở mốc
        if (lastBreak > cutIndex / 2) {
            return lastBreak;
        }
        return cutIndex;
    }

    // block rào chắn paywall phía server cho UC031 và UC032 (rule 3)
    // luồng đi là nhận dto đã map và cờ allowed từ PaywallEngine -> được phép thì trả toàn văn còn không thì chỉ trả 30 phần trăm -> trả về getArticleBySlug
    private ArticleReaderResponse applyPaywall(ArticleReaderResponse response, String rawContent, String accessType, boolean allowed) {
        boolean premium = "PREMIUM".equalsIgnoreCase(accessType);
        response.setIsPremium(premium);
        // nhánh được phép đọc gồm bài free người đã mua lẻ hoặc người có gói còn hạn thì mở hết không khóa
        if (allowed) {
            response.setContent(rawContent);
            response.setPreviewContent(rawContent);
            response.setIsLocked(false);
            return response;
        }
        // nhánh không được phép chỉ gán đoạn preview 30 phần trăm và bài không có nội dung thì preview rỗng
        response.setPreviewContent(rawContent == null ? "" : rawContent.substring(0, previewCut(rawContent)));
        // xóa sạch toàn văn ở server để bấm F12 cũng không thấy phần còn lại
        response.setContent(null);
        // bật cờ khóa để frontend hiện khung paywall mời mua
        response.setIsLocked(true);
        return response;
    }

    // đổi dữ liệu projection từ sql sang dto tóm tắt cho danh sách bài
    // để static trong package vì danh sách bài đã lưu và feed theo dõi cũng dùng đúng cách đổi này cho số liệu khớp nhau
    static ArticleSummaryResponse mapToSummary(ArticleProjection projection) {
        return ArticleSummaryResponse.builder()
                .id(projection.getId())
                .title(projection.getTitle())
                .slug(projection.getSlug())
                .summary(projection.getSummary())
                .coverImageUrl(projection.getCoverImageUrl())
                .categoryName(projection.getCategoryName())
                .categorySlug(projection.getCategorySlug())
                // chỉ cần biết bài có premium hay không còn danh sách thì không trả nội dung
                .isPremium("PREMIUM".equalsIgnoreCase(projection.getAccessType()))
                // ngày xuất bản null thì để null để khỏi lỗi
                .publishedAt(projection.getPublishedAt() != null ? projection.getPublishedAt().toString() : null)
                .authorName(projection.getAuthorName())
                // lượt xem null thì coi như 0
                .viewCount(projection.getViewCount() == null ? 0L : projection.getViewCount())
                .price(projection.getSinglePrice())
                .build();
    }

    // đổi projection sang dto chi tiết bài đọc bằng cách mượn lại dto tóm tắt rồi thêm phần riêng
    private ArticleReaderResponse mapToDetail(ArticleProjection projection) {
        ArticleSummaryResponse summary = mapToSummary(projection);
        return ArticleReaderResponse.builder()
                .id(summary.getId())
                .title(summary.getTitle())
                .slug(summary.getSlug())
                .summary(summary.getSummary())
                .coverImageUrl(summary.getCoverImageUrl())
                .categoryName(summary.getCategoryName())
                .categorySlug(summary.getCategorySlug())
                .isPremium(summary.getIsPremium())
                .publishedAt(summary.getPublishedAt())
                .authorName(summary.getAuthorName())
                // cộng thêm 1 vì lượt xem trong projection được đọc trước lúc tăng nên trả về số đã tính lượt đọc này
                .viewCount(projection.getViewCount() == null ? 1L : projection.getViewCount() + 1)
                .price(summary.getPrice())
                .build();
    }

    // hàm tiện ích đổi chuỗi null hoặc toàn khoảng trắng thành null còn lại thì cắt khoảng trắng hai đầu
    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
