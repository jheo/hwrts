package com.humanwrites.domain.ai

import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger

@Service
class AiUsageTracker {
    private val usageMap = ConcurrentHashMap<UUID, MutableUsageData>()

    fun recordSuggestions(
        documentId: UUID,
        count: Int,
        provider: String,
        model: String,
    ) {
        val data = usageMap.getOrPut(documentId) { MutableUsageData() }
        data.totalSuggestions.addAndGet(count)
        data.featuresUsed.addIfAbsent("spelling")
    }

    fun recordAcceptance(
        documentId: UUID,
        count: Int,
    ) {
        val data = usageMap.getOrPut(documentId) { MutableUsageData() }
        data.suggestionsAccepted.addAndGet(count)
    }

    fun getAiUsageData(documentId: UUID): AiUsageData {
        val data = usageMap[documentId]
        return if (data != null) {
            val total = data.totalSuggestions.get()
            val accepted = data.suggestionsAccepted.get()
            AiUsageData(
                enabled = total > 0,
                featuresUsed = data.featuresUsed.toList(),
                suggestionsAccepted = accepted,
                suggestionsRejected = total - accepted,
                totalSuggestions = total,
            )
        } else {
            AiUsageData()
        }
    }

    private class MutableUsageData(
        val featuresUsed: CopyOnWriteArrayList<String> = CopyOnWriteArrayList(),
        val suggestionsAccepted: AtomicInteger = AtomicInteger(0),
        val totalSuggestions: AtomicInteger = AtomicInteger(0),
    )
}

data class AiUsageData(
    val enabled: Boolean = false,
    val featuresUsed: List<String> = emptyList(),
    val suggestionsAccepted: Int = 0,
    val suggestionsRejected: Int = 0,
    val totalSuggestions: Int = 0,
)
