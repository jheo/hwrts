package com.humanwrites.domain.ai

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.humanwrites.config.AiConfig
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

@Component
class ClaudeProvider(
    private val aiConfig: AiConfig,
    private val objectMapper: ObjectMapper,
) : AiProvider {
    private val logger = LoggerFactory.getLogger(ClaudeProvider::class.java)

    override val providerName: String = "claude"
    override val modelName: String = "claude-haiku-4-5-20251001"

    private val restClient: RestClient by lazy {
        RestClient
            .builder()
            .baseUrl("https://api.anthropic.com")
            .defaultHeader("x-api-key", aiConfig.claudeApiKey)
            .defaultHeader("anthropic-version", "2023-06-01")
            .build()
    }

    override fun analyzeSpelling(
        text: String,
        locale: String,
    ): List<ReviewItem> {
        val prompt = buildPrompt(text, locale)

        val requestBody =
            mapOf(
                "model" to modelName,
                "max_tokens" to 2048,
                "messages" to
                    listOf(
                        mapOf(
                            "role" to "user",
                            "content" to prompt,
                        ),
                    ),
            )

        val response =
            restClient
                .post()
                .uri("/v1/messages")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Map::class.java)

        return parseResponse(response)
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseResponse(response: Map<*, *>?): List<ReviewItem> {
        if (response == null) return emptyList()

        val content = response["content"] as? List<Map<String, Any>> ?: return emptyList()
        val textBlock = content.firstOrNull { it["type"] == "text" } ?: return emptyList()
        val text = textBlock["text"] as? String ?: return emptyList()

        return try {
            val jsonText = extractJson(text)
            val items: List<Map<String, Any>> = objectMapper.readValue(jsonText)
            items.map { item ->
                val range = item["range"] as? Map<String, Any> ?: mapOf("from" to 0, "to" to 0)
                ReviewItem(
                    type = item["type"] as? String ?: "spelling",
                    severity = item["severity"] as? String ?: "warning",
                    range =
                        TextRange(
                            from = (range["from"] as? Number)?.toInt() ?: 0,
                            to = (range["to"] as? Number)?.toInt() ?: 0,
                        ),
                    message = item["message"] as? String ?: "",
                    suggestion = item["suggestion"] as? String,
                )
            }
        } catch (e: Exception) {
            logger.warn("Failed to parse Claude response: {}", e.message)
            emptyList()
        }
    }

    private fun extractJson(text: String): String {
        val trimmed = text.trim()
        val start = trimmed.indexOf('[')
        val end = trimmed.lastIndexOf(']')
        return if (start >= 0 && end > start) {
            trimmed.substring(start, end + 1)
        } else {
            trimmed
        }
    }

    private fun buildPrompt(
        text: String,
        locale: String,
    ): String =
        """
        |Analyze the following text for spelling and grammar errors.
        |Locale: $locale
        |
        |Return ONLY a JSON array of issues found. Each issue should have:
        |- "type": "spelling" or "grammar"
        |- "severity": "info", "warning", or "error"
        |- "range": {"from": <start_char_index>, "to": <end_char_index>}
        |- "message": description of the issue
        |- "suggestion": suggested correction (optional)
        |
        |If no issues are found, return an empty array: []
        |
        |Text to analyze:
        |$text
        """.trimMargin()
}
