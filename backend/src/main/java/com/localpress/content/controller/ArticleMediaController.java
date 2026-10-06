package com.localpress.content.controller;

import com.localpress.content.dto.ArticleDraftDetailResponse;
import com.localpress.content.dto.ArticleCoverImageResponse;
import com.localpress.content.dto.CoverImageInfoRequest;
import com.localpress.content.service.ArticleMediaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/articles")
@RequiredArgsConstructor
public class ArticleMediaController {
    private final ArticleMediaService articleMediaService;

    @PutMapping(value = "/{id}/cover-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ArticleCoverImageResponse uploadCoverImage(
            @PathVariable("id") Long articleId,
            @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("info") CoverImageInfoRequest request
    ){
        String imageUrl = articleMediaService.uploadCoverImage(articleId, file, request);

        return new ArticleCoverImageResponse(imageUrl);
    }

    @PutMapping(
            value = "/{id}/cover-image/info",
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ArticleDraftDetailResponse updateCoverImageInfo(
            @PathVariable("id") Long articleId,
            @Valid @RequestBody CoverImageInfoRequest request
    ) {
        return articleMediaService.updateCoverImageInfo(
                articleId,
                request
        );
    }
}
