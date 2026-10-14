package com.localpress.content.service;

import com.localpress.content.repository.ArticleVersionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArticleImageCleanupService {
    private static final String IMAGE_PREFIX = "/api/v1/content/images/";

    private final ArticleVersionRepository articleVersionRepository;
    private final ImageStorageService imageStorageService;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteIfUnused(String imageUrl) {
        if(imageUrl == null || !imageUrl.startsWith(IMAGE_PREFIX)) {
            return;
        }

        String filename = imageUrl.substring(IMAGE_PREFIX.length());
        if(!filename.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
                + "[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\.png")){
            log.warn("Bỏ qua đường dẫn ảnh không hợp lệ: {}", imageUrl);
            return;
        }

        if(articleVersionRepository.existsByCoverImageUrl(imageUrl)){
            return;
        }

        try{
            imageStorageService.delete(filename);
        } catch(IOException exception){
            log.error("Không dọn được ảnh không còn sử dụng:{}", filename, exception);
        }
    }
}
