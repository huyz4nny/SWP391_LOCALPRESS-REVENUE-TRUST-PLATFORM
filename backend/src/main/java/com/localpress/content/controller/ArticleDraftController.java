package com.localpress.content.controller;

import com.localpress.content.entity.Article;
import com.localpress.content.dto.ArticleDraftResponse;
import com.localpress.content.dto.CreateArticleDraftRequest;
import com.localpress.content.service.ArticleDraftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import com.localpress.content.dto.ArticleDraftDetailResponse;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ArticleDraftController {
    private final ArticleDraftService articleDraftService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ArticleDraftResponse createDraft(@Valid @RequestBody CreateArticleDraftRequest request) {
        Article article = articleDraftService.createDraft(request);
        return ArticleDraftResponse.from(article);
    }

    @GetMapping("/{id}")
    public ArticleDraftDetailResponse getDraft(@PathVariable("id") Long articleId) {
        return articleDraftService.getDraft(articleId);
    }
}
