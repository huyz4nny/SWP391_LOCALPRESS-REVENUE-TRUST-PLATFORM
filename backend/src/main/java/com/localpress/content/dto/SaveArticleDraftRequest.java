package com.localpress.content.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

/** Editor fields only; owner, status and version are controlled by the server. */
public record SaveArticleDraftRequest(
        @NotNull @Positive Long categoryId,
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String sapo,
        @NotNull @Size(max = 100000) String content,
        @Size(max = 1000) String coverImageUrl,
        @Size(max = 50) List<@NotBlank @Size(max = 100) String> tags,
        Boolean isPremium,
        @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal price,
        @Size(max = 2000) String changelog,
        @Valid CoverImageInfoRequest imageInfo
) {}
