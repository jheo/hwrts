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
import io.kotest.matchers.collections.shouldBeEmpty
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import java.util.UUID

class AiGatewayServiceTest :
    FunSpec({

        val objectMapper: ObjectMapper = jacksonObjectMapper()

        val aiConfig =
            AiConfig(
                claudeApiKey = "test-key",
                openaiApiKey = "test-key",
                defaultProvider = "claude",
                rateLimitPerMinute = 20,
            )

        val mockProvider =
            mockk<AiProvider> {
                every { providerName } returns "claude"
                every { modelName } returns "claude-haiku-4-5-20251001"
            }

        val providerRouter =
            mockk<ProviderRouter> {
                every { getDefaultProvider() } returns mockProvider
                every { getProvider("claude") } returns mockProvider
            }

        test("analyzeSpelling returns review items from provider") {
            val expectedItems =
                listOf(
                    ReviewItem(
                        type = "spelling",
                        severity = "error",
                        range = TextRange(from = 0, to = 5),
                        message = "Misspelled word",
                        suggestion = "Hello",
                    ),
                )

            every { mockProvider.analyzeSpelling("Helo world", "en") } returns expectedItems

            val service = AiGatewayService(providerRouter, aiConfig, objectMapper)
            val result = service.analyzeSpelling("Helo world", "en", UUID.randomUUID())

            result shouldHaveSize 1
            result[0].type shouldBe "spelling"
            result[0].message shouldBe "Misspelled word"
            result[0].suggestion shouldBe "Hello"
        }

        test("graceful degradation: returns empty list when provider throws") {
            every {
                mockProvider.analyzeSpelling(any(), any())
            } throws RuntimeException("API down")

            val service = AiGatewayService(providerRouter, aiConfig, objectMapper)
            val result = service.analyzeSpelling("Some text", "en", UUID.randomUUID())

            result.shouldBeEmpty()
        }

        test("graceful degradation: returns empty list when provider router throws") {
            val failingRouter =
                mockk<ProviderRouter> {
                    every { getDefaultProvider() } throws
                        IllegalStateException("No providers configured")
                }

            val service = AiGatewayService(failingRouter, aiConfig, objectMapper)
            val result = service.analyzeSpelling("Some text", "en", UUID.randomUUID())

            result.shouldBeEmpty()
        }

        test("rate limiting: throws RateLimitExceededException after exceeding limit") {
            val limitedConfig =
                AiConfig(
                    claudeApiKey = "test-key",
                    openaiApiKey = "test-key",
                    defaultProvider = "claude",
                    rateLimitPerMinute = 2,
                )

            every { mockProvider.analyzeSpelling(any(), any()) } returns
                listOf(
                    ReviewItem(
                        type = "spelling",
                        severity = "warning",
                        range = TextRange(from = 0, to = 1),
                        message = "test",
                    ),
                )

            val service = AiGatewayService(providerRouter, limitedConfig, objectMapper)
            val userId = UUID.randomUUID()

            // First two requests should succeed
            val result1 = service.analyzeSpelling("text1", "en", userId)
            val result2 = service.analyzeSpelling("text2", "en", userId)

            result1 shouldHaveSize 1
            result2 shouldHaveSize 1

            // Third request should throw RateLimitExceededException
            shouldThrow<RateLimitExceededException> {
                service.analyzeSpelling("text3", "en", userId)
            }
        }

        test("routing: uses specified provider name") {
            val openAiProvider =
                mockk<AiProvider> {
                    every { providerName } returns "openai"
                    every { modelName } returns "gpt-4o-mini"
                    every { analyzeSpelling(any(), any()) } returns
                        listOf(
                            ReviewItem(
                                type = "grammar",
                                severity = "info",
                                range = TextRange(from = 0, to = 3),
                                message = "OpenAI result",
                            ),
                        )
                }

            val routerWithOpenAi =
                mockk<ProviderRouter> {
                    every { getProvider("openai") } returns openAiProvider
                }

            val service = AiGatewayService(routerWithOpenAi, aiConfig, objectMapper)
            val result =
                service.analyzeSpelling(
                    "text",
                    "en",
                    UUID.randomUUID(),
                    providerName = "openai",
                )

            result shouldHaveSize 1
            result[0].message shouldBe "OpenAI result"
        }
    })
