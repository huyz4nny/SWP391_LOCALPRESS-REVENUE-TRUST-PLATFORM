package com.localpress.editorial.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO đại diện cho một creative/banner quảng cáo được nộp (Màn II.2.6 - UC020, UC021, UC022).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorialCreativeDto {
    private String id;
    private String campaignId;
    private int versionNumber;
    private String title;
    private String imageUrl;
    private String targetUrl;
    private Integer width;
    private Integer height;
    private Integer fileSizeKb;
    private String status;
    private String reviewNotes;
    private LocalDateTime uploadedAt;
    private LocalDateTime reviewedAt;
    private String reviewedBy;

    @JsonProperty("isActiveServing")
    private boolean isActiveServing;
}
