package com.humanwrites.presentation.dto.response

import com.humanwrites.domain.ai.AiUsageData
import com.humanwrites.domain.ai.ReviewItem

data class SpellingResponse(
    val items: List<ReviewItem>,
)

data class AiUsageResponse(
    val usage: AiUsageData,
)
