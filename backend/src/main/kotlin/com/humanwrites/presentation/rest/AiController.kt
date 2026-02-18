package com.humanwrites.presentation.rest

import com.humanwrites.domain.ai.AiGatewayService
import com.humanwrites.domain.ai.AiUsageTracker
import com.humanwrites.presentation.dto.request.AcceptSuggestionsRequest
import com.humanwrites.presentation.dto.request.SpellingRequest
import com.humanwrites.presentation.dto.response.SpellingResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@Tag(name = "AI", description = "AI 리뷰 API")
@RestController
@RequestMapping("/api/ai")
class AiController(
    private val aiGatewayService: AiGatewayService,
    private val aiUsageTracker: AiUsageTracker,
) {
    @Operation(summary = "맞춤법/문법 검사", description = "텍스트의 맞춤법 및 문법 검사 수행")
    @PostMapping("/spelling")
    fun checkSpelling(
        @RequestBody request: SpellingRequest,
    ): ResponseEntity<SpellingResponse> {
        val userId = currentUserId()
        val items =
            aiGatewayService.analyzeSpelling(
                text = request.text,
                locale = request.locale,
                userId = userId,
            )

        // Track suggestions for this document
        if (items.isNotEmpty()) {
            val documentId = UUID.fromString(request.documentId)
            aiUsageTracker.recordSuggestions(
                documentId = documentId,
                count = items.size,
                provider = "default",
                model = "default",
            )
        }

        return ResponseEntity.ok(SpellingResponse(items = items))
    }

    @Operation(summary = "제안 수락 기록", description = "AI 제안 수락 횟수 기록")
    @PostMapping("/suggestions/accept")
    fun acceptSuggestions(
        @RequestBody request: AcceptSuggestionsRequest,
    ): ResponseEntity<Map<String, String>> {
        val documentId = UUID.fromString(request.documentId)
        aiUsageTracker.recordAcceptance(documentId, request.count)
        return ResponseEntity.ok(mapOf("status" to "recorded"))
    }

    private fun currentUserId(): UUID = SecurityContextHolder.getContext().authentication.principal as UUID
}
