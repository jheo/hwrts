package com.humanwrites.domain.ai

import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

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
        data.totalSuggestions += count
        if (!data.featuresUsed.contains("spelling")) {
            data.featuresUsed.add("spelling")
        }
    }

    fun recordAcceptance(
        documentId: UUID,
        count: Int,
    ) {
        val data = usageMap.getOrPut(documentId) { MutableUsageData() }
        data.suggestionsAccepted += count
    }

    fun getAiUsageData(documentId: UUID): AiUsageData {
        val data = usageMap[documentId]
        return if (data != null) {
            AiUsageData(
                enabled = data.totalSuggestions > 0,
                featuresUsed = data.featuresUsed.toList(),
                suggestionsAccepted = data.suggestionsAccepted,
                suggestionsRejected = data.totalSuggestions - data.suggestionsAccepted,
                totalSuggestions = data.totalSuggestions,
            )
        } else {
            AiUsageData()
        }
    }

    private class MutableUsageData(
        val featuresUsed: MutableList<String> = mutableListOf(),
        var suggestionsAccepted: Int = 0,
        var totalSuggestions: Int = 0,
    )
}

data class AiUsageData(
    val enabled: Boolean = false,
    val featuresUsed: List<String> = emptyList(),
    val suggestionsAccepted: Int = 0,
    val suggestionsRejected: Int = 0,
    val totalSuggestions: Int = 0,
)
