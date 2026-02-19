package com.humanwrites.presentation.dto.request

import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.util.UUID

data class SpellingRequest(
    @field:Size(max = 50000, message = "Text must be at most 50,000 characters")
    val text: String,
    @field:Pattern(regexp = "^(ko|en)$", message = "Locale must be 'ko' or 'en'")
    val locale: String,
    val documentId: UUID,
)

data class AcceptSuggestionsRequest(
    val documentId: UUID,
    val count: Int,
)
