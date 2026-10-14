package com.localpress.content.controller;

import com.localpress.content.service.ArticleMediaService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/content/images")
@RequiredArgsConstructor
public class ArticleImageController {
    private final ArticleMediaService articleMediaService;

    @GetMapping(value = "/{filename}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<Resource> getCoverImage(@PathVariable("filename") String filename){
        Resource image = articleMediaService.getCoverImage(filename);

        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore()).body(image);
    }
}
