package com.localpress.editorial.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * DTO nhận dữ liệu khi soạn hoặc cập nhật bài viết phía Tòa soạn (SV2 - Trọng Phan).
 * Hỗ trợ linh hoạt cả request trực tiếp lẫn payload lồng gói trong trường 'article'.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SaveEditorialArticleRequest {
    private String title;
    private String sapo;
    private String content;
    private Object categoryId;
    private String categorySlug;
    private String coverImage;
    private String coverImageUrl;
    private List<String> tags;
    private Boolean isPremium;
    private BigDecimal price;
    private String status;
    private String changelog;
    private Map<String, Object> article;
    private Map<String, Object> imageInfo;

    public String resolveTitle() {
        if (title != null && !title.isBlank()) return title.trim();
        if (article != null && article.get("title") != null) {
            String t = String.valueOf(article.get("title")).trim();
            if (!t.isBlank()) return t;
        }
        return "Bản thảo chưa đặt tên";
    }

    public String resolveSapo() {
        if (sapo != null) return sapo.trim();
        if (article != null && article.get("sapo") != null) {
            return String.valueOf(article.get("sapo")).trim();
        }
        return "";
    }

    public String resolveContent() {
        if (content != null) return content;
        if (article != null && article.get("content") != null) {
            return String.valueOf(article.get("content"));
        }
        return "";
    }

    public Object resolveCategoryId() {
        if (categoryId != null) return categoryId;
        if (article != null && article.get("categoryId") != null) {
            return article.get("categoryId");
        }
        return 1L;
    }

    public String resolveCoverImageUrl() {
        if (coverImageUrl != null && !coverImageUrl.isBlank()) return coverImageUrl.trim();
        if (coverImage != null && !coverImage.isBlank()) return coverImage.trim();
        if (article != null) {
            if (article.get("coverImageUrl") != null) return String.valueOf(article.get("coverImageUrl")).trim();
            if (article.get("coverImage") != null) return String.valueOf(article.get("coverImage")).trim();
        }
        return null;
    }

    public boolean resolveIsPremium() {
        if (isPremium != null) return isPremium;
        if (article != null && article.get("isPremium") != null) {
            Object val = article.get("isPremium");
            if (val instanceof Boolean b) return b;
            return Boolean.parseBoolean(String.valueOf(val));
        }
        return false;
    }

    public BigDecimal resolvePrice() {
        if (price != null) return price;
        if (article != null && article.get("price") != null) {
            Object val = article.get("price");
            if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
            try {
                return new BigDecimal(String.valueOf(val));
            } catch (Exception ignored) {
            }
        }
        return BigDecimal.ZERO;
    }

    public String resolveStatus() {
        if (status != null && !status.isBlank()) return status.trim().toUpperCase();
        if (article != null && article.get("status") != null) {
            return String.valueOf(article.get("status")).trim().toUpperCase();
        }
        return "DRAFT";
    }

    public String resolveChangelog() {
        if (changelog != null && !changelog.isBlank()) return changelog.trim();
        if (article != null && article.get("changelog") != null) {
            return String.valueOf(article.get("changelog")).trim();
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    public List<String> resolveTags() {
        if (tags != null) return tags;
        if (article != null && article.get("tags") instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return List.of();
    }
}
