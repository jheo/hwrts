package com.humanwrites.unit

import com.humanwrites.domain.ai.AiUsageTracker
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import java.util.UUID

class AiUsageTrackerTest :
    FunSpec({

        test("getAiUsageData returns default values for unknown document") {
            val tracker = AiUsageTracker()
            val data = tracker.getAiUsageData(UUID.randomUUID())

            data.enabled shouldBe false
            data.featuresUsed shouldBe emptyList()
            data.suggestionsAccepted shouldBe 0
            data.suggestionsRejected shouldBe 0
            data.totalSuggestions shouldBe 0
        }

        test("recordSuggestions tracks total suggestions and enables usage") {
            val tracker = AiUsageTracker()
            val docId = UUID.randomUUID()

            tracker.recordSuggestions(docId, 5, "claude", "claude-haiku-4-5-20251001")

            val data = tracker.getAiUsageData(docId)
            data.enabled shouldBe true
            data.totalSuggestions shouldBe 5
            data.featuresUsed shouldBe listOf("spelling")
        }

        test("recordSuggestions accumulates across multiple calls") {
            val tracker = AiUsageTracker()
            val docId = UUID.randomUUID()

            tracker.recordSuggestions(docId, 3, "claude", "claude-haiku-4-5-20251001")
            tracker.recordSuggestions(docId, 2, "claude", "claude-haiku-4-5-20251001")

            val data = tracker.getAiUsageData(docId)
            data.totalSuggestions shouldBe 5
        }

        test("recordAcceptance tracks accepted suggestions") {
            val tracker = AiUsageTracker()
            val docId = UUID.randomUUID()

            tracker.recordSuggestions(docId, 10, "claude", "claude-haiku-4-5-20251001")
            tracker.recordAcceptance(docId, 3)

            val data = tracker.getAiUsageData(docId)
            data.suggestionsAccepted shouldBe 3
            data.suggestionsRejected shouldBe 7
            data.totalSuggestions shouldBe 10
        }

        test("recordAcceptance accumulates across multiple calls") {
            val tracker = AiUsageTracker()
            val docId = UUID.randomUUID()

            tracker.recordSuggestions(docId, 10, "claude", "claude-haiku-4-5-20251001")
            tracker.recordAcceptance(docId, 2)
            tracker.recordAcceptance(docId, 3)

            val data = tracker.getAiUsageData(docId)
            data.suggestionsAccepted shouldBe 5
            data.suggestionsRejected shouldBe 5
        }

        test("different documents have independent tracking") {
            val tracker = AiUsageTracker()
            val doc1 = UUID.randomUUID()
            val doc2 = UUID.randomUUID()

            tracker.recordSuggestions(doc1, 5, "claude", "claude-haiku-4-5-20251001")
            tracker.recordSuggestions(doc2, 3, "openai", "gpt-4o-mini")
            tracker.recordAcceptance(doc1, 2)

            val data1 = tracker.getAiUsageData(doc1)
            val data2 = tracker.getAiUsageData(doc2)

            data1.totalSuggestions shouldBe 5
            data1.suggestionsAccepted shouldBe 2

            data2.totalSuggestions shouldBe 3
            data2.suggestionsAccepted shouldBe 0
        }

        test("features_used does not duplicate spelling entry") {
            val tracker = AiUsageTracker()
            val docId = UUID.randomUUID()

            tracker.recordSuggestions(docId, 3, "claude", "claude-haiku-4-5-20251001")
            tracker.recordSuggestions(docId, 2, "claude", "claude-haiku-4-5-20251001")

            val data = tracker.getAiUsageData(docId)
            data.featuresUsed shouldBe listOf("spelling")
        }
    })
