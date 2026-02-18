package com.humanwrites.domain.ai

interface AiProvider {
    fun analyzeSpelling(
        text: String,
        locale: String,
    ): List<ReviewItem>

    val providerName: String

    val modelName: String
}
