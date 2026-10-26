package com.localpress.content.controller;

import com.localpress.content.dto.ArticleVersionSummaryResponse;
import com.localpress.content.service.ArticleVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.localpress.content.dto.ArticleVersionDetailResponse;
import com.localpress.content.dto.RestoreArticleVersionRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.localpress.content.dto.UpdateArticleVersionContentRequest;
import org.springframework.web.bind.annotation.PutMapping;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ArticleVersionController {
    private final ArticleVersionService articleVersionService;

    @GetMapping("/{articleId:\\d+}/versions")
    public ResponseEntity<List<ArticleVersionSummaryResponse>> getVersions(
            @PathVariable("articleId") Long articleId
    ) {
        List<ArticleVersionSummaryResponse> versions =
                articleVersionService.getVersions(articleId);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(versions);
    }

    @GetMapping("/{articleId:\\d+}/versions/{versionNumber:[1-9]\\d*}")
    public ResponseEntity<ArticleVersionDetailResponse> getVersion(
            @PathVariable("articleId") Long articleId,
            @PathVariable("versionNumber") Integer versionNumber
    ) {
        ArticleVersionDetailResponse version =
                articleVersionService.getVersion(
                        articleId,
                        versionNumber
                );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(version);
    }

    @PostMapping(
            value = "/{articleId:\\d+}/versions/{versionNumber:[1-9]\\d*}/restore",
            consumes = "application/json"
    )
    public ResponseEntity<ArticleVersionDetailResponse> restoreVersion(
            @PathVariable("articleId") Long articleId,
            @PathVariable("versionNumber") Integer versionNumber,
            @Valid @RequestBody RestoreArticleVersionRequest request
    ) {
        ArticleVersionDetailResponse restored =
                articleVersionService.restoreVersion(
                        articleId,
                        versionNumber,
                        request
                );

        URI location = URI.create(
                "/api/v1/articles/"
                        + articleId
                        + "/versions/"
                        + restored.versionNumber()
        );

        return ResponseEntity.created(location)
                .cacheControl(CacheControl.noStore())
                .body(restored);
    }

    @PutMapping(
            value = "/{articleId:\\d+}/versions/{versionNumber:[1-9]\\d*}/content",
            consumes = "application/json"
    )
    public ResponseEntity<ArticleVersionDetailResponse> updateVersionContent(
            @PathVariable("articleId") Long articleId,
            @PathVariable("versionNumber") Integer versionNumber,
            @Valid @RequestBody UpdateArticleVersionContentRequest request
    ) {
        ArticleVersionDetailResponse updated =
                articleVersionService.updateVersionContent(
                        articleId,
                        versionNumber,
                        request
                );

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(updated);
    }

    @PostMapping("/{articleId:\\d+}/versions/{versionNumber:[1-9]\\d*}/submit")
    public ResponseEntity<ArticleVersionDetailResponse> submitVersionForReview(
            @PathVariable("articleId") Long articleId,
            @PathVariable("versionNumber") Integer versionNumber
    ) {
        ArticleVersionDetailResponse submitted =
                articleVersionService.submitVersionForReview(articleId, versionNumber);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(submitted);
    }
}
