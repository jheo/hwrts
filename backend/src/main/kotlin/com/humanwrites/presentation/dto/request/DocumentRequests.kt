package com.humanwrites.presentation.dto.request

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Size

@Schema(description = "문서 생성 요청")
data class DocumentCreateRequest(
    @field:Size(max = 500)
    @Schema(description = "문서 제목")
    val title: String = "",
    @Schema(description = "문서 내용")
    val content: String = "",
)

@Schema(description = "문서 수정 요청")
data class DocumentUpdateRequest(
    @field:Size(max = 500)
    @Schema(description = "문서 제목")
    val title: String? = null,
    @Schema(description = "문서 내용")
    val content: String? = null,
    @Schema(description = "단어 수")
    val wordCount: Int? = null,
)
