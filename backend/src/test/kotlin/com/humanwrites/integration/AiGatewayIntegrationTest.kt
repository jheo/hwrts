package com.humanwrites.integration

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.humanwrites.config.AiConfig
import com.humanwrites.domain.ai.AiGatewayService
import com.humanwrites.domain.ai.AiProvider
import com.humanwrites.domain.ai.AiUsageTracker
import com.humanwrites.domain.ai.ProviderRouter
import com.humanwrites.domain.ai.RateLimitExceededException
import com.humanwrites.domain.ai.ReviewItem
import com.humanwrites.domain.ai.TextRange
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.util.UUID

/**
 * Integration tests for the AI gateway pipeline.
 *
 * Tests provider routing, graceful degradation, rate limiting,
 * and AiUsageTracker recording — all without a real AI API or Redis.
 */
class AiGatewayIntegrationTest :
    FunSpec({

        // ── Shared review item fixture ────────────────────────────────────
        fun spellingItem(message: String = "Misspelled word") =
            ReviewItem(
                type = "spelling",
                severity = "error",
                range = TextRange(from = 0, to = 5),
                message = message,
                suggestion = "Corrected",
            )

        // ── Provider routing ─────────────────────────────────────────────

        test("gateway routes to Claude provider by default") {
            val claudeProvider =
                mockk<AiProvider> {
                    every { providerName } returns "claude"
                    every { modelName } returns "claude-haiku-4-5-20251001"
                    every { analyzeSpelling(any(), any()) } returns listOf(spellingItem("Claude result"))
                }
            val openAiProvider =
                mockk<AiProvider> {
                    every { providerName } returns "openai"
                    every { modelName } returns "gpt-4o-mini"
                }

            val router =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } returns claudeProvider
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 20)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())

            val result = gateway.analyzeSpelling("Helo world", "en", UUID.randomUUID())

            result shouldHaveSize 1
            result[0].message shouldBe "Claude result"
            verify(exactly = 0) { openAiProvider.analyzeSpelling(any(), any()) }
        }

        test("gateway routes to OpenAI provider when explicitly requested") {
            val claudeProvider =
                mockk<AiProvider> {
                    every { providerName } returns "claude"
                    every { modelName } returns "claude-haiku-4-5-20251001"
                }
            val openAiProvider =
                mockk<AiProvider> {
                    every { providerName } returns "openai"
                    every { modelName } returns "gpt-4o-mini"
                    every { analyzeSpelling(any(), any()) } returns listOf(spellingItem("OpenAI result"))
                }

            val router =
                mockk<ProviderRouter> {
                    every { getProvider("openai") } returns openAiProvider
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 20)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())

            val result =
                gateway.analyzeSpelling("Helo world", "en", UUID.randomUUID(), providerName = "openai")

            result shouldHaveSize 1
            result[0].message shouldBe "OpenAI result"
            verify(exactly = 0) { claudeProvider.analyzeSpelling(any(), any()) }
        }

        test("gateway calls Claude when providerName is null (uses default)") {
            val claudeProvider =
                mockk<AiProvider> {
                    every { providerName } returns "claude"
                    every { modelName } returns "claude-haiku-4-5-20251001"
                    every { analyzeSpelling("test text", "ko") } returns listOf(spellingItem("한국어 결과"))
                }

            val router =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } returns claudeProvider
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 20)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())

            val result = gateway.analyzeSpelling("test text", "ko", UUID.randomUUID(), providerName = null)

            result shouldHaveSize 1
            verify(exactly = 1) { claudeProvider.analyzeSpelling("test text", "ko") }
        }

        // ── Graceful degradation ─────────────────────────────────────────

        test("graceful degradation: provider throws → returns empty list") {
            val failingProvider =
                mockk<AiProvider> {
                    every { providerName } returns "claude"
                    every { modelName } returns "claude-haiku-4-5-20251001"
                    every { analyzeSpelling(any(), any()) } throws RuntimeException("API timeout")
                }

            val router =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } returns failingProvider
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 20)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())

            val result = gateway.analyzeSpelling("text", "en", UUID.randomUUID())

            result.shouldBeEmpty()
        }

        test("graceful degradation: router throws → returns empty list") {
            val router =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } throws IllegalStateException("No providers configured")
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 20)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())

            val result = gateway.analyzeSpelling("text", "en", UUID.randomUUID())

            result.shouldBeEmpty()
        }

        test("graceful degradation: named provider not found → returns empty list") {
            val router =
                mockk<ProviderRouter> {
                    every { getProvider("unknown") } throws
                        IllegalArgumentException("AI provider 'unknown' not found")
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 20)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())

            val result =
                gateway.analyzeSpelling("text", "en", UUID.randomUUID(), providerName = "unknown")

            result.shouldBeEmpty()
        }

        // ── Rate limiting integration ─────────────────────────────────────

        test("rate limiter allows requests up to the per-minute limit") {
            val provider =
                mockk<AiProvider> {
                    every { providerName } returns "claude"
                    every { modelName } returns "claude-haiku-4-5-20251001"
                    every { analyzeSpelling(any(), any()) } returns listOf(spellingItem())
                }

            val router =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } returns provider
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 3)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())
            val userId = UUID.randomUUID()

            val r1 = gateway.analyzeSpelling("t1", "en", userId)
            val r2 = gateway.analyzeSpelling("t2", "en", userId)
            val r3 = gateway.analyzeSpelling("t3", "en", userId)

            r1 shouldHaveSize 1
            r2 shouldHaveSize 1
            r3 shouldHaveSize 1
        }

        test("rate limiter blocks requests after exceeding per-minute limit") {
            val provider =
                mockk<AiProvider> {
                    every { providerName } returns "claude"
                    every { modelName } returns "claude-haiku-4-5-20251001"
                    every { analyzeSpelling(any(), any()) } returns listOf(spellingItem())
                }

            val router =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } returns provider
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 2)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())
            val userId = UUID.randomUUID()

            gateway.analyzeSpelling("t1", "en", userId)
            gateway.analyzeSpelling("t2", "en", userId)

            shouldThrow<RateLimitExceededException> {
                gateway.analyzeSpelling("t3", "en", userId)
            }
        }

        test("rate limiter is per-user: different users have independent limits") {
            val provider =
                mockk<AiProvider> {
                    every { providerName } returns "claude"
                    every { modelName } returns "claude-haiku-4-5-20251001"
                    every { analyzeSpelling(any(), any()) } returns listOf(spellingItem())
                }

            val router =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } returns provider
                }

            val config = AiConfig(defaultProvider = "claude", rateLimitPerMinute = 1)
            val gateway = AiGatewayService(router, config, jacksonObjectMapper())

            val user1 = UUID.randomUUID()
            val user2 = UUID.randomUUID()

            // user1 exhausts their limit
            gateway.analyzeSpelling("t1", "en", user1)
            shouldThrow<RateLimitExceededException> {
                gateway.analyzeSpelling("t2", "en", user1)
            }

            // user2 should still be allowed
            val user2Result = gateway.analyzeSpelling("t1", "en", user2)
            user2Result shouldHaveSize 1
        }

        // ── AiUsageTracker integration ────────────────────────────────────

        test("AiUsageTracker records suggestions when gateway returns items") {
            val docId = UUID.randomUUID()
            val tracker = AiUsageTracker()

            // Simulate the controller/service recording after gateway call
            tracker.recordSuggestions(docId, 3, "claude", "claude-haiku-4-5-20251001")

            val usage = tracker.getAiUsageData(docId)
            usage.enabled shouldBe true
            usage.totalSuggestions shouldBe 3
            usage.featuresUsed shouldBe listOf("spelling")
        }

        test("AiUsageTracker accumulates across multiple gateway calls for same document") {
            val docId = UUID.randomUUID()
            val tracker = AiUsageTracker()

            tracker.recordSuggestions(docId, 2, "claude", "claude-haiku-4-5-20251001")
            tracker.recordSuggestions(docId, 4, "claude", "claude-haiku-4-5-20251001")
            tracker.recordAcceptance(docId, 3)

            val usage = tracker.getAiUsageData(docId)
            usage.totalSuggestions shouldBe 6
            usage.suggestionsAccepted shouldBe 3
            usage.suggestionsRejected shouldBe 3
        }

        test("gateway result combined with tracker: no suggestions leaves tracker empty") {
            val docId = UUID.randomUUID()
            val tracker = AiUsageTracker()

            // If provider returned empty (e.g. no issues found), nothing gets recorded
            val usage = tracker.getAiUsageData(docId)

            usage.enabled shouldBe false
            usage.totalSuggestions shouldBe 0
        }

        test("multiple documents tracked independently via gateway flow") {
            val doc1 = UUID.randomUUID()
            val doc2 = UUID.randomUUID()
            val tracker = AiUsageTracker()

            tracker.recordSuggestions(doc1, 5, "claude", "claude-haiku-4-5-20251001")
            tracker.recordSuggestions(doc2, 2, "openai", "gpt-4o-mini")
            tracker.recordAcceptance(doc1, 4)

            val usage1 = tracker.getAiUsageData(doc1)
            val usage2 = tracker.getAiUsageData(doc2)

            usage1.totalSuggestions shouldBe 5
            usage1.suggestionsAccepted shouldBe 4
            usage2.totalSuggestions shouldBe 2
            usage2.suggestionsAccepted shouldBe 0
        }
    })
