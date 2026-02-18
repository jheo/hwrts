package com.humanwrites.domain.ai

import com.humanwrites.config.AiConfig
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

@Service
class AiGatewayService(
    private val providerRouter: ProviderRouter,
    private val aiConfig: AiConfig,
) {
    private val logger = LoggerFactory.getLogger(AiGatewayService::class.java)

    // Simple in-memory rate limiting per user
    private val rateLimitMap = ConcurrentHashMap<UUID, RateLimitEntry>()

    fun analyzeSpelling(
        text: String,
        locale: String,
        userId: UUID,
        providerName: String? = null,
    ): List<ReviewItem> {
        // Rate limiting check
        if (!checkRateLimit(userId)) {
            logger.warn("Rate limit exceeded for user {}", userId)
            return emptyList()
        }

        // TODO: Add Redis caching when Redis dependency is available
        return try {
            val provider =
                if (providerName != null) {
                    providerRouter.getProvider(providerName)
                } else {
                    providerRouter.getDefaultProvider()
                }
            provider.analyzeSpelling(text, locale)
        } catch (e: Exception) {
            logger.warn(
                "AI provider failed for spelling analysis, returning empty list: {}",
                e.message,
            )
            emptyList()
        }
    }

    private fun checkRateLimit(userId: UUID): Boolean {
        val now = System.currentTimeMillis()
        val entry =
            rateLimitMap.compute(userId) { _, existing ->
                if (existing == null || now - existing.windowStart.get() > RATE_LIMIT_WINDOW_MS) {
                    RateLimitEntry(AtomicLong(now), AtomicInteger(1))
                } else {
                    existing.count.incrementAndGet()
                    existing
                }
            }
        return (entry?.count?.get() ?: 0) <= aiConfig.rateLimitPerMinute
    }

    private data class RateLimitEntry(
        val windowStart: AtomicLong,
        val count: AtomicInteger,
    )

    companion object {
        private const val RATE_LIMIT_WINDOW_MS = 60_000L
    }
}
