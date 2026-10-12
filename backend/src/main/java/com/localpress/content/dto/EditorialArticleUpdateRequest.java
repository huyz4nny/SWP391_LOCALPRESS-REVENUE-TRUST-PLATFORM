package com.localpress.content.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EditorialArticleUpdateRequest(
        @NotNull @Valid EditorialArticleRequest article,
        @Size(max = 2000) String changelog,
        @Valid CoverImageInfoRequest imageInfo
) {}
