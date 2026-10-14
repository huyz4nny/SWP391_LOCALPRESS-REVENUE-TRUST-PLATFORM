package com.localpress.content.controller;

import com.localpress.content.dto.ArticleDraftDetailResponse;
import com.localpress.content.dto.UpdateArticleMetadataRequest;
import com.localpress.content.service.ArticleMetadataService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ArticleMetadataController {

    private final ArticleMetadataService articleMetadataService;

    @PutMapping("/{id}/metadata")
    public ArticleDraftDetailResponse updateMetadata(
            @PathVariable("id") Long articleId,
            @Valid @RequestBody UpdateArticleMetadataRequest request
    ) {
        return articleMetadataService.updateMetadata(articleId, request);
    }
}
