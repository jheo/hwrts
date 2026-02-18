package com.humanwrites.presentation.dto.response

import io.swagger.v3.oas.annotations.media.Schema
import java.time.OffsetDateTime

@Schema(description = "문서 응답")
data class DocumentResponse(
    @Schema(description = "문서 ID")
    val id: String,
    @Schema(description = "제목")
    val title: String,
    @Schema(description = "내용")
    val content: String,
    @Schema(description = "단어 수")
    val wordCount: Int,
    @Schema(description = "상태")
    val status: String,
    @Schema(description = "생성일")
    val createdAt: OffsetDateTime,
    @Schema(description = "수정일")
    val updatedAt: OffsetDateTime,
)

@Schema(description = "문서 목록 응답")
data class DocumentListResponse(
    @Schema(description = "문서 목록")
    val documents: List<DocumentResponse>,
    @Schema(description = "총 개수")
    val totalCount: Long,
    @Schema(description = "페이지")
    val page: Int,
    @Schema(description = "페이지 크기")
    val size: Int,
)
