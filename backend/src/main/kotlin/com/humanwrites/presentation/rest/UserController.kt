package com.humanwrites.presentation.rest

import com.humanwrites.domain.user.UserService
import com.humanwrites.domain.user.UserSettingsEntity
import com.humanwrites.domain.user.UserSettingsUpdate
import com.humanwrites.infrastructure.security.CookieUtils
import com.humanwrites.presentation.dto.request.UserSettingsRequest
import com.humanwrites.presentation.dto.response.UserSettingsResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "사용자 관리 API")
class UserController(
    private val userService: UserService,
    private val cookieUtils: CookieUtils,
) {
    @GetMapping("/settings")
    @Operation(summary = "사용자 설정 조회", description = "현재 사용자의 설정을 조회")
    fun getSettings(): ResponseEntity<UserSettingsResponse> {
        val userId = currentUserId()
        val settings =
            userService.getSettings(userId)
                ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(settings.toResponse())
    }

    @PutMapping("/settings")
    @Operation(summary = "사용자 설정 수정", description = "현재 사용자의 설정을 수정")
    fun updateSettings(
        @Valid @RequestBody req: UserSettingsRequest,
    ): ResponseEntity<UserSettingsResponse> {
        val userId = currentUserId()
        val update =
            UserSettingsUpdate(
                theme = req.theme,
                fontSize = req.fontSize,
                editorWidth = req.editorWidth,
                autoSave = req.autoSave,
                focusMode = req.focusMode,
                language = req.language,
            )
        val settings =
            userService.updateSettings(userId, update)
                ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(settings.toResponse())
    }

    @PostMapping("/export")
    @Operation(summary = "사용자 데이터 내보내기", description = "GDPR 데이터 내보내기")
    fun exportData(): ResponseEntity<Any> {
        val userId = currentUserId()
        val exportData =
            userService.exportUserData(userId)
                ?: return ResponseEntity.notFound().build()

        return ResponseEntity.ok(exportData)
    }

    @DeleteMapping
    @Operation(summary = "계정 삭제", description = "GDPR 계정 삭제 및 인증 쿠키 제거")
    fun deleteAccount(response: HttpServletResponse): ResponseEntity<Void> {
        val userId = currentUserId()
        val deleted = userService.deleteUser(userId)

        if (!deleted) {
            return ResponseEntity.notFound().build()
        }

        cookieUtils.clearAuthCookies(response)
        return ResponseEntity.noContent().build()
    }

    private fun currentUserId(): UUID = SecurityContextHolder.getContext().authentication.principal as UUID

    private fun UserSettingsEntity.toResponse() =
        UserSettingsResponse(
            theme = theme,
            fontSize = fontSize,
            editorWidth = editorWidth,
            autoSave = autoSave,
            focusMode = focusMode,
            language = language,
        )
}
