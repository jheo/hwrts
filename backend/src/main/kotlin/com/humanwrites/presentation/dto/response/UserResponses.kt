package com.humanwrites.presentation.dto.response

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "사용자 설정 응답")
data class UserSettingsResponse(
    @Schema(description = "테마")
    val theme: String,
    @Schema(description = "폰트 크기")
    val fontSize: Int,
    @Schema(description = "에디터 너비")
    val editorWidth: String,
    @Schema(description = "자동 저장")
    val autoSave: Boolean,
    @Schema(description = "집중 모드")
    val focusMode: Boolean,
    @Schema(description = "언어")
    val language: String,
)

@Schema(description = "사용자 프로필 응답")
data class UserProfileResponse(
    @Schema(description = "사용자 ID")
    val id: String,
    @Schema(description = "이메일")
    val email: String,
    @Schema(description = "표시 이름")
    val displayName: String,
    @Schema(description = "아바타 URL")
    val avatarUrl: String?,
)
