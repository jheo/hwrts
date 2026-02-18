package com.humanwrites.presentation.dto.request

import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

@Schema(description = "회원가입 요청")
data class RegisterRequest(
    @field:NotBlank
    @field:Email
    @Schema(description = "이메일", example = "user@example.com")
    val email: String,
    @field:NotBlank
    @field:Size(min = 2, max = 100)
    @Schema(description = "표시 이름", example = "홍길동")
    val displayName: String,
    @field:NotBlank
    @field:Size(min = 8, max = 100)
    @Schema(description = "비밀번호 (8자 이상)")
    val password: String,
)

@Schema(description = "로그인 요청")
data class LoginRequest(
    @field:NotBlank
    @field:Email
    @Schema(description = "이메일")
    val email: String,
    @field:NotBlank
    @Schema(description = "비밀번호")
    val password: String,
)
