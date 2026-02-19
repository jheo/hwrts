package com.humanwrites.unit

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.humanwrites.config.AiConfig
import com.humanwrites.domain.ai.AiGatewayService
import com.humanwrites.domain.ai.AiProvider
import com.humanwrites.domain.ai.ProviderRouter
import com.humanwrites.domain.ai.RateLimitExceededException
import com.humanwrites.domain.ai.ReviewItem
import com.humanwrites.domain.ai.TextRange
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldStartWith
import io.mockk.every
import io.mockk.mockk
import java.util.UUID

class RedisRateLimiterTest :
    FunSpec({

        val objectMapper: ObjectMapper = jacksonObjectMapper()

        val aiConfig =
            AiConfig(
                claudeApiKey = "test-key",
                openaiApiKey = "test-key",
                defaultProvider = "claude",
                rateLimitPerMinute = 3,
            )

        val mockProvider =
            mockk<AiProvider> {
                every { providerName } returns "claude"
                every { modelName } returns "claude-haiku-4-5-20251001"
                every { analyzeSpelling(any(), any()) } returns
                    listOf(
                        ReviewItem(
                            type = "spelling",
                            severity = "warning",
                            range = TextRange(from = 0, to = 4),
                            message = "test review",
                        ),
                    )
            }

        val providerRouter =
            mockk<ProviderRouter> {
                every { getDefaultProvider() } returns mockProvider
            }

        test("fallback: in-memory rate limiting works when Redis is null") {
            // AiGatewayService with no Redis injected (redisTemplate remains null)
            val service = AiGatewayService(providerRouter, aiConfig, objectMapper)
            val userId = UUID.randomUUID()

            // Should allow up to rateLimitPerMinute (3) requests
            val result1 = service.analyzeSpelling("text1", "en", userId)
            val result2 = service.analyzeSpelling("text2", "en", userId)
            val result3 = service.analyzeSpelling("text3", "en", userId)

            result1 shouldHaveSize 1
            result2 shouldHaveSize 1
            result3 shouldHaveSize 1

            // Fourth request exceeds the limit
            shouldThrow<RateLimitExceededException> {
                service.analyzeSpelling("text4", "en", userId)
            }
        }

        test("fallback: different users have independent rate limits") {
            val service = AiGatewayService(providerRouter, aiConfig, objectMapper)
            val userA = UUID.randomUUID()
            val userB = UUID.randomUUID()

            // Exhaust userA's limit
            repeat(3) { service.analyzeSpelling("text$it", "en", userA) }
            shouldThrow<RateLimitExceededException> {
                service.analyzeSpelling("extra", "en", userA)
            }

            // userB should still be allowed
            val userBResult = service.analyzeSpelling("text", "en", userB)
            userBResult shouldHaveSize 1
        }

        test("fallback: caching is skipped when Redis is null") {
            val service = AiGatewayService(providerRouter, aiConfig, objectMapper)
            val userId = UUID.randomUUID()

            // Same text twice should still call the provider both times (no cache without Redis)
            val result1 = service.analyzeSpelling("same text", "en", userId)
            val result2 = service.analyzeSpelling("same text", "en", userId)

            result1 shouldHaveSize 1
            result2 shouldHaveSize 1
        }

        test("cache key generation is deterministic") {
            val service = AiGatewayService(providerRouter, aiConfig, objectMapper)

            val key1 = service.buildCacheKey("hello world", "en")
            val key2 = service.buildCacheKey("hello world", "en")
            val key3 = service.buildCacheKey("hello world", "ko")

            key1 shouldBe key2
            key1 shouldStartWith "ai:spelling:"
            // Different locale should produce different key
            (key1 != key3) shouldBe true
        }

        test("checkRateLimit falls back to in-memory when Redis is null") {
            val service = AiGatewayService(providerRouter, aiConfig, objectMapper)
            val userId = UUID.randomUUID()

            // Without Redis, in-memory rate limiter should work
            val allowed1 = service.checkRateLimit(userId)
            val allowed2 = service.checkRateLimit(userId)
            val allowed3 = service.checkRateLimit(userId)
            val denied = service.checkRateLimit(userId)

            allowed1 shouldBe true
            allowed2 shouldBe true
            allowed3 shouldBe true
            denied shouldBe false
        }
    })
