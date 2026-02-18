package com.humanwrites.presentation.dto.response

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "에러 응답")
data class ErrorResponse(
    @Schema(description = "에러 코드")
    val error: String,
    @Schema(description = "에러 메시지")
    val message: String,
    @Schema(description = "HTTP 상태 코드")
    val status: Int,
)
