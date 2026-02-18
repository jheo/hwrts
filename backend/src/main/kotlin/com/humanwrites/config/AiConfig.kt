package com.humanwrites.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.ai")
data class AiConfig(
    val claudeApiKey: String = "",
    val openaiApiKey: String = "",
    val defaultProvider: String = "claude",
    val rateLimitPerMinute: Int = 20,
)
