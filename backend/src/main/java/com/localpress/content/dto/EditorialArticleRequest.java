package com.localpress.content.dto;

import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EditorialArticleRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String sapo,
        @NotNull @Size(max = 100000) String content,
        @Size(max = 1000) String coverImage,
        @NotBlank @Size(max = 180) String categoryId,
        List<@NotBlank @Size(max = 100) String> tags,
        Boolean isPremium,
        @DecimalMin("0.00") @DecimalMax("9999999999.99") @Digits(integer = 10, fraction = 2) BigDecimal price,
        String status,
        @Size(max = 1000) String source
) {}
