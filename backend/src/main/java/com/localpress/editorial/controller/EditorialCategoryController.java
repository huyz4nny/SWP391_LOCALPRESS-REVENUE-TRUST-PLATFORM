package com.localpress.editorial.controller;

import com.localpress.content.entity.Category;
import com.localpress.content.repository.CategoryRepository;
import com.localpress.editorial.dto.CategoryOptionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/editorial/categories")
@RequiredArgsConstructor
public class EditorialCategoryController {
    private final CategoryRepository categoryRepository;

    @GetMapping
    public List<CategoryOptionResponse> getActiveCategories(){
        return categoryRepository
                .findByStatusOrderByNameAsc(Category.Status.ACTIVE)
                .stream()
                .map(CategoryOptionResponse::from)
                .toList();
    }
}
