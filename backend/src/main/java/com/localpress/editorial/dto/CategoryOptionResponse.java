package com.localpress.editorial.dto;

import com.localpress.content.entity.Category;

public record CategoryOptionResponse(String id, String name, String slug) {
    public static CategoryOptionResponse from(Category category) {
        return new CategoryOptionResponse(
                category.getId().toString(),
                category.getName(),
                category.getSlug()
        );
    }
}
