package com.humanwrites.domain.ai

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.humanwrites.config.AiConfig
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.security.MessageDigest
import java.time.Duration
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

@Service
class AiGatewayService(
    private val providerRouter: ProviderRouter,
    private val aiConfig: AiConfig,
    private val objectMapper: ObjectMapper,
) {
    private val logger = LoggerFactory.getLogger(AiGatewayService::class.java)

    @Autowired(required = false)
    private var redisTemplate: StringRedisTemplate? = null

    // In-memory rate limiting fallback when Redis is unavailable
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
            throw RateLimitExceededException()
        }

        // Check Redis cache
        val cacheKey = buildCacheKey(text, locale)
        val cached = getCachedResult(cacheKey)
        if (cached != null) {
            logger.debug("Cache hit for AI spelling analysis")
            return cached
        }

        return try {
            val provider =
                if (providerName != null) {
                    providerRouter.getProvider(providerName)
                } else {
                    providerRouter.getDefaultProvider()
                }
            val result = provider.analyzeSpelling(text, locale)

            // Cache the result
            cacheResult(cacheKey, result)

            result
        } catch (e: Exception) {
            logger.warn(
                "AI provider failed for spelling analysis, returning empty list: {}",
                e.message,
            )
            emptyList()
        }
    }

    internal fun buildCacheKey(
        text: String,
        locale: String,
    ): String {
        val input = "$text|$locale"
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(input.toByteArray()).joinToString("") { "%02x".format(it) }
        return "ai:spelling:$hash"
    }

    private fun getCachedResult(cacheKey: String): List<ReviewItem>? =
        try {
            redisTemplate?.opsForValue()?.get(cacheKey)?.let { json ->
                objectMapper.readValue<List<ReviewItem>>(json)
            }
        } catch (e: Exception) {
            logger.debug("Redis cache read failed, proceeding without cache: {}", e.message)
            null
        }

    private fun cacheResult(
        cacheKey: String,
        items: List<ReviewItem>,
    ) {
        try {
            val json = objectMapper.writeValueAsString(items)
            redisTemplate?.opsForValue()?.set(cacheKey, json, Duration.ofHours(CACHE_TTL_HOURS))
        } catch (e: Exception) {
            logger.debug("Redis cache write failed, continuing without cache: {}", e.message)
        }
    }

    internal fun checkRateLimit(userId: UUID): Boolean {
        // Try Redis-based rate limiting first
        val redisResult = checkRedisRateLimit(userId)
        if (redisResult != null) {
            return redisResult
        }

        // Fallback to in-memory rate limiting
        return checkInMemoryRateLimit(userId)
    }

    private fun checkRedisRateLimit(userId: UUID): Boolean? =
        try {
            val redis = redisTemplate ?: return null
            val now = System.currentTimeMillis()
            val minuteWindow = now / RATE_LIMIT_WINDOW_MS
            val key = "ratelimit:ai:$userId:$minuteWindow"

            val count = redis.opsForValue().increment(key) ?: return null
            if (count == 1L) {
                redis.expire(key, Duration.ofMillis(RATE_LIMIT_WINDOW_MS))
            }
            count <= aiConfig.rateLimitPerMinute
        } catch (e: Exception) {
            logger.debug("Redis rate limit check failed, falling back to in-memory: {}", e.message)
            null
        }

    private fun checkInMemoryRateLimit(userId: UUID): Boolean {
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

    @Scheduled(fixedRate = 300_000) // Every 5 minutes
    fun cleanupExpiredRateLimits() {
        val now = System.currentTimeMillis()
        val expired =
            rateLimitMap.entries
                .filter { now - it.value.windowStart.get() > RATE_LIMIT_WINDOW_MS * 2 }
                .map { it.key }
        expired.forEach { rateLimitMap.remove(it) }
        if (expired.isNotEmpty()) {
            logger.debug("Cleaned up {} expired rate limit entries", expired.size)
        }
    }

    private data class RateLimitEntry(
        val windowStart: AtomicLong,
        val count: AtomicInteger,
    )

    companion object {
        private const val RATE_LIMIT_WINDOW_MS = 60_000L
        private const val CACHE_TTL_HOURS = 24L
    }
}
