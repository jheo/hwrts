package com.humanwrites.domain.ai

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.humanwrites.config.AiConfig
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

@Component
class OpenAiProvider(
    private val aiConfig: AiConfig,
    private val objectMapper: ObjectMapper,
) : AiProvider {
    private val logger = LoggerFactory.getLogger(OpenAiProvider::class.java)

    override val providerName: String = "openai"
    override val modelName: String = "gpt-4o-mini"

    private val restClient: RestClient by lazy {
        RestClient
            .builder()
            .baseUrl("https://api.openai.com")
            .defaultHeader("Authorization", "Bearer ${aiConfig.openaiApiKey}")
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
                "messages" to
                    listOf(
                        mapOf(
                            "role" to "system",
                            "content" to
                                "You are a spelling and grammar checker. " +
                                "Return only valid JSON arrays.",
                        ),
                        mapOf(
                            "role" to "user",
                            "content" to prompt,
                        ),
                    ),
                "temperature" to 0.1,
                "max_tokens" to 2048,
            )

        val response =
            restClient
                .post()
                .uri("/v1/chat/completions")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Map::class.java)

        return parseResponse(response)
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseResponse(response: Map<*, *>?): List<ReviewItem> {
        if (response == null) return emptyList()

        val choices = response["choices"] as? List<Map<String, Any>> ?: return emptyList()
        val firstChoice = choices.firstOrNull() ?: return emptyList()
        val message = firstChoice["message"] as? Map<String, Any> ?: return emptyList()
        val content = message["content"] as? String ?: return emptyList()

        return try {
            val jsonText = extractJson(content)
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
            logger.warn("Failed to parse OpenAI response: {}", e.message)
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
