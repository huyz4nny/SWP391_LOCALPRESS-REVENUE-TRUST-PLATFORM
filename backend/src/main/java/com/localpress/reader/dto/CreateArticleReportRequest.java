package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateArticleReportRequest {
    private Long articleId;
    private String reason;
    private String description;
}
