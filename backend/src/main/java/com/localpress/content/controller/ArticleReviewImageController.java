package com.localpress.content.controller;

import com.localpress.content.service.ArticleMediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/content/articles")
@RequiredArgsConstructor
public class ArticleReviewImageController {
    private final ArticleMediaService media;

    @GetMapping(value="/{articleId:\\d+}/versions/{versionNumber:[1-9]\\d*}/cover-image", produces=MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> cover(@PathVariable Long articleId, @PathVariable Integer versionNumber) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore()).varyBy("Authorization")
                .body(media.getReviewCoverImage(articleId, versionNumber));
    }
}
