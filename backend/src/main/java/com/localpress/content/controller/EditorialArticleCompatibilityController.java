package com.localpress.content.controller;

import com.localpress.content.dto.EditorialArticleRequest;
import com.localpress.content.dto.CoverImageInfoRequest;
import com.localpress.content.dto.EditorialArticleResponse;
import com.localpress.content.dto.EditorialArticleUpdateRequest;
import com.localpress.content.service.EditorialArticleCompatibilityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/v1/editorial/articles")
@RequiredArgsConstructor
public class EditorialArticleCompatibilityController {
    private final EditorialArticleCompatibilityService service;

    @GetMapping
    public List<EditorialArticleResponse> getDrafts() { return service.getDrafts(); }

    @GetMapping("/{id}")
    public EditorialArticleResponse getDraft(@PathVariable Long id) { return service.getDraft(id); }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EditorialArticleResponse create(@Valid @RequestBody EditorialArticleRequest request) {
        return service.create(request);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public EditorialArticleResponse updateMetadata(@PathVariable Long id,
            @Valid @RequestBody EditorialArticleUpdateRequest request) {
        return service.updateMetadataAndImageInfo(id, request);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EditorialArticleResponse createWithCover(
            @Valid @RequestPart("article") EditorialArticleRequest request,
            @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("info") CoverImageInfoRequest info) {
        return service.createWithCoverImage(request, file, info);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public EditorialArticleResponse updateWithCover(@PathVariable Long id,
            @Valid @RequestPart("request") EditorialArticleUpdateRequest request,
            @RequestPart("file") MultipartFile file,
            @Valid @RequestPart("info") CoverImageInfoRequest info) {
        return service.updateWithCoverImage(id, request, file, info);
    }

    @PostMapping("/{id}/status")
    public void changeStatus(@PathVariable Long id) {
        service.getDraft(id);
        throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Iter 1 chỉ hỗ trợ lưu và đọc bản nháp; gửi duyệt/xuất bản thuộc luồng tiếp theo");
    }
}
