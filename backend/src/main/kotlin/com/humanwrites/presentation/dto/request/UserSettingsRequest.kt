package com.humanwrites.presentation.dto.request

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "사용자 설정 수정 요청")
data class UserSettingsRequest(
    @Schema(description = "테마", example = "dark")
    val theme: String? = null,
    @Schema(description = "폰트 크기", example = "16")
    val fontSize: Int? = null,
    @Schema(description = "에디터 너비", example = "medium")
    val editorWidth: String? = null,
    @Schema(description = "자동 저장")
    val autoSave: Boolean? = null,
    @Schema(description = "집중 모드")
    val focusMode: Boolean? = null,
    @Schema(description = "언어", example = "ko")
    val language: String? = null,
)
