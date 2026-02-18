package com.humanwrites.presentation.dto.response

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "인증 응답")
data class AuthResponse(
    @Schema(description = "사용자 ID")
    val userId: String,
    @Schema(description = "이메일")
    val email: String,
    @Schema(description = "표시 이름")
    val displayName: String,
)
