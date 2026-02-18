package com.humanwrites.domain.ai

import java.util.UUID

data class ReviewItem(
    val id: String = UUID.randomUUID().toString(),
    val type: String,
    val severity: String,
    val range: TextRange,
    val message: String,
    val suggestion: String? = null,
    val source: String = "ai_model",
)

data class TextRange(
    val from: Int,
    val to: Int,
)
