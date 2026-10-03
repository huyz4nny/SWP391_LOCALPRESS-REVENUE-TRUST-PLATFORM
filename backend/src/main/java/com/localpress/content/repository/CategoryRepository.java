package com.localpress.content.repository;

import com.localpress.content.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByStatusOrderByNameAsc(Category.Status status);
}
