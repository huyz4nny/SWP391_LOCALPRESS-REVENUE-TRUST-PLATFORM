package com.localpress.content.controller;

import com.localpress.content.dto.*;
import com.localpress.content.service.ArticleDraftSaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ArticleDraftSaveController {
    private final ArticleDraftSaveService articleDraftSaveService;

    @PostMapping(value = "/drafts", consumes = "application/json")
    @ResponseStatus(HttpStatus.CREATED)
    public ArticleDraftDetailResponse createEditorDraft(
            @Valid @RequestBody SaveArticleDraftRequest request) {
        return articleDraftSaveService.create(request, null, null);
    }

    @PostMapping(value = "/drafts", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public ArticleDraftDetailResponse createEditorDraftWithCover(
            @Valid @RequestPart("request") SaveArticleDraftRequest request,
            @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("info") CoverImageInfoRequest info) {
        return articleDraftSaveService.create(request, file, info);
    }

    @PutMapping(value = "/{id:\\d+}", consumes = "application/json")
    public ArticleDraftDetailResponse updateDraft(
            @PathVariable("id") Long id,
            @Valid @RequestBody SaveArticleDraftRequest request) {
        return articleDraftSaveService.update(id, request, null, null);
    }

    @PutMapping(value = "/{id:\\d+}", consumes = "multipart/form-data")
    public ArticleDraftDetailResponse updateDraftWithCover(
            @PathVariable("id") Long id,
            @Valid @RequestPart("request") SaveArticleDraftRequest request,
            @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("info") CoverImageInfoRequest info) {
        return articleDraftSaveService.update(id, request, file, info);
    }

}
