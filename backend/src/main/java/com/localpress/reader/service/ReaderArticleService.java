// package service của reader khai báo nghiệp vụ đọc báo
package com.localpress.reader.service;

import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

// interface dịch vụ đọc báo và bảo vệ nội dung của SV3 phục vụ UC029 UC030 UC031 UC032
// controller chỉ gọi qua interface này còn phần chạy thật nằm ở ReaderArticleServiceImpl
public interface ReaderArticleService {

    // lấy danh sách bài phân trang theo chuyên mục từ khóa và loại truy cập (UC029 UC030)
    Page<ArticleSummaryResponse> getArticles(String category, String search, String access, Pageable pageable);

    // lấy chi tiết bài theo slug và áp paywall cắt 30 phần trăm nếu là bài premium (UC031 UC032)
    ArticleReaderResponse getArticleBySlug(String slug);
}
