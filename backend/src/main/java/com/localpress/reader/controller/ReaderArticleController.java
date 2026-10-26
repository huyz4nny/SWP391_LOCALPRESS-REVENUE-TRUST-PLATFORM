// package controller của reader là lớp ngoài cùng nhận request http từ frontend rồi đẩy xuống service
package com.localpress.reader.controller;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.service.ReaderArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// class này là api đọc báo công khai của SV3 phục vụ UC029 UC030 UC031 UC032
// route gốc là /api/v1/articles và đã được SecurityConfig mở permitAll nên khách không cần đăng nhập (rule 1)
// luồng đi là frontend gọi vào đây -> ReaderArticleService -> ReaderArticleRepository -> bảng articles và article_versions
@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ReaderArticleController {

    // giới hạn số bài tối đa mỗi trang để người ta không gọi size quá lớn làm tràn bộ nhớ
    private static final int MAX_PAGE_SIZE = 50;

    // service xử lý nghiệp vụ được spring tự tiêm vào qua constructor
    private final ReaderArticleService readerArticleService;

    // block lấy danh sách bài có phân trang kèm lọc chuyên mục và tìm kiếm
    // phục vụ UC029 duyệt trang chủ chuyên mục và UC030 tìm kiếm ở màn hình II.3.1
    // luồng đi là nhận tham số -> chuẩn hóa access và phân trang -> gọi service getArticles -> trả Page về cho frontend
    @GetMapping
    public ResponseEntity<Page<ArticleSummaryResponse>> getArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String access,
            @RequestParam(required = false) Boolean isPremium,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        String resolvedAccess = access;
        // nếu frontend cũ không gửi access mà gửi cờ isPremium thì đổi sang chuỗi PREMIUM hoặc FREE để repository lọc được
        if ((resolvedAccess == null || resolvedAccess.isBlank()) && isPremium != null) {
            resolvedAccess = isPremium ? "PREMIUM" : "FREE";
        }
        // ép số trang không âm và size nằm trong khoảng 1 đến 50 rồi mới tạo pageable
        // không nhận tham số sort từ client vì câu sql đã cố định bài mới nhất lên đầu
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        // đẩy sang service rồi bọc kết quả vào http 200
        return ResponseEntity.ok(readerArticleService.getArticles(category, search, resolvedAccess, pageable));
    }

    // block đọc chi tiết một bài theo slug
    // phục vụ UC031 đọc bài free và UC032 xem preview 30 phần trăm bài premium ở màn hình II.3.2
    // regex \D trong đường dẫn bắt buộc slug có ít nhất một ký tự không phải số
    // để không đụng với api cms của SV5 là /api/v1/articles/{id} chỉ có số
    // luồng đi là nhận slug -> gọi service getArticleBySlug -> service tự áp paywall -> trả chi tiết về frontend
    @GetMapping("/{slug:.*\\D.*}")
    public ResponseEntity<ArticleReaderResponse> getArticleBySlug(@PathVariable String slug) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).varyBy("Authorization")
                .body(readerArticleService.getArticleBySlug(slug));
    }
}
